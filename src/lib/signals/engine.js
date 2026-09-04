import { SWEPT_INSTRUMENTS } from '../../data/instruments.js'
import { fetchCandles } from '../marketData/candles.js'
import { FEED_REASONS } from '../marketData/chartFeed.js'
import { analyzeStructure } from '../smc/structure.js'
import { presetFor } from '../smc/presets.js'
import { alignmentOf } from '../smc/score.js'
import { deriveTradeCall } from '../smc/signal.js'
import { createSignal, resolveSignal, SETTLED, signalFingerprint } from './model.js'

/**
 * The pass that turns structure into a published record.
 *
 * One sweep does three things in order: read every primary instrument's
 * execution and bias timeframes, publish a call the record does not already
 * hold, and score the calls already standing against the bars that have
 * printed since. Scoring reuses the same candle read as the publishing, so a
 * sweep costs one request per instrument per timeframe and no more.
 *
 * The sweep covers the instruments the registry marks swept rather than the
 * whole book. The rest is priced and charted, and reading it would cost the
 * feed three more requests per instrument on every pass. Which instruments
 * those are is the registry's decision and is argued there, alongside what
 * each one costs.
 *
 * A call is published once. Structure holds the same leg across many bars, so
 * the engine would otherwise republish the same four numbers on every pass;
 * the fingerprint is what stops that, and it is compared against calls still
 * standing rather than against the whole history, so a setup that genuinely
 * re-forms after settling can be called again.
 *
 * An instrument the pass could not read is reported rather than dropped. The
 * two outcomes a sweep can have - it read the market and found nothing worth
 * calling, or it never reached the market - produce the same empty record and
 * are told apart by nothing else, so the pass carries the reason for every
 * instrument it failed to read and the caller decides what that is worth.
 *
 * There is a third outcome between those, and it is the dangerous one, because
 * it does not produce an empty record at all. A read can answer and still be
 * too thin to mint from: a series the feed served out of its own memory prices
 * an entry at a close that has already been traded through, and a read whose
 * higher timeframes both failed puts a one-way vote in front of a gate written
 * for a three-way one. Both look identical to a healthy read from the outside -
 * bars came back, structure parsed, a call fell out - and a call minted from
 * either is published, scored and emailed as though the desk had seen what it
 * had not. So a read like that is named, it is scored against, and it is not
 * allowed to publish.
 */

/** Instruments a call is never published for, whatever structure says. */
const isPublishable = (meta) => meta.tradeable && !meta.isWatchOnly

/**
 * Why a read that answered is still not one a call may be minted from.
 *
 * Kept apart from `FEED_REASONS` because they are answers to different
 * questions: those say why there is nothing to look at, and these say why what
 * came back cannot carry a publication. A standing call is still scored against
 * a read carrying either.
 */
export const WITHHELD_REASONS = {
  /** The feed answered this timeframe from its own memory, not from an upstream. */
  remembered: 'remembered',
  /** Neither higher timeframe answered, so alignment is the execution read alone. */
  unaligned: 'unaligned',
  /** The bars came back with no venue named, so no later read can be matched to them. */
  unvenued: 'unvenued',
}

/**
 * Reads one instrument and returns its structure, its call, and the candles
 * the call would be scored against.
 *
 * The execution timeframe is the read: without it there is no structure and no
 * levels, so a failure there ends the read and says why. A bias timeframe that
 * does not answer is a thinner read rather than no read - `alignmentOf` counts
 * the timeframes it was given - but it is named on the result, because a call
 * published on a two-way vote cleared a gate written for a three-way one.
 *
 * @param {object} meta - an instrument registry entry
 * @param {AbortSignal} [signal]
 * @returns {Promise<object>} a read, or `{ok:false, symbol, reason, detail}`
 */
export async function readInstrument(meta, signal) {
  const preset = presetFor(meta.symbol)
  const biasTimeframes = (meta.biasTimeframes ?? []).slice(0, 2)

  // Both higher timeframes are read, not one. Alignment is a three-way vote and
  // a two-way one cannot produce the readings the gate is written against.
  const [execution, ...biasReads] = await Promise.all([
    fetchCandles({
      providerSymbol: meta.providerSymbol,
      timeframe: meta.primaryTimeframe,
      signal,
    }),
    ...biasTimeframes.map((timeframe) =>
      fetchCandles({ providerSymbol: meta.providerSymbol, timeframe, signal })
    ),
  ])
  if (!execution.ok) {
    return {
      ok: false,
      symbol: meta.symbol,
      timeframe: meta.primaryTimeframe,
      reason: execution.reason,
      detail: execution.detail,
    }
  }

  const executionRead = analyzeStructure(execution.candles, { preset })
  const htfReads = biasReads.map((read) =>
    read.ok ? analyzeStructure(read.candles, { preset }) : null
  )
  const biasMissing = biasTimeframes.filter((_timeframe, index) => !biasReads[index].ok)
  const alignment = alignmentOf([executionRead.bias, ...htfReads.map((read) => read?.bias ?? null)])
  const price = execution.candles[execution.candles.length - 1]?.close ?? null

  const withheld = []
  if (execution.stale != null) {
    const age = Number.isFinite(execution.stale) ? `, ${execution.stale}s behind` : ''
    withheld.push({
      reason: WITHHELD_REASONS.remembered,
      detail: `${meta.primaryTimeframe} answered from memory${age}`,
    })
  }
  if (biasTimeframes.length > 0 && biasMissing.length === biasTimeframes.length) {
    withheld.push({
      reason: WITHHELD_REASONS.unaligned,
      detail: `neither ${biasTimeframes.join(' nor ')} answered`,
    })
  }
  // A level with no venue attached is a level nothing can be scored against
  // later. The guard below matches a call's venue to the read's, and it can
  // only do that if both sides have one; a call minted off a payload that named
  // no exchange would be scoreable against any scale for the rest of its life,
  // which on the metals is a sixty-five dollar error in the direction that
  // manufactures wins.
  if (!execution.exchange) {
    withheld.push({ reason: WITHHELD_REASONS.unvenued, detail: 'the feed named no venue' })
  }

  // The structure is still read and still scored - it is what a reader of the
  // markets screen came for, and it is the honest reading of the bars that did
  // come back. What a thin read does not get to produce is a call: every reader
  // of this result treats one as the desk's judgement on the instrument, and a
  // judgement minted off a memory or off a one-way vote is one the desk did not
  // make. So the reading stands and the call is withdrawn, with the reason in
  // the same field a refused setup states its reason in.
  const judged = deriveTradeCall({
    execution: executionRead,
    alignment,
    sideConstraint: meta.sideConstraint,
    price,
  })
  const judgement = withheld.length
    ? {
        ...judged,
        call: null,
        standDown: `The desk did not see enough to call this: ${withheld
          .map((held) => held.detail)
          .join(', ')}.`,
      }
    : judged

  return {
    ok: true,
    symbol: meta.symbol,
    timeframe: meta.primaryTimeframe,
    biasTimeframe: biasTimeframes[0] ?? null,
    biasTimeframes,
    biasMissing,
    withheld,
    stale: execution.stale ?? null,
    execution: executionRead,
    htf: htfReads[0] ?? null,
    htfReads,
    alignment,
    candles: execution.candles,
    exchange: execution.exchange,
    providerSymbol: execution.providerSymbol,
    price,
    ...judgement,
  }
}

/**
 * Scores one call against this pass's read of its instrument, or declines to.
 *
 * A call is only scored against the feed it was read off. The desk prices gold
 * three ways - a broker's spot CFD, a COMEX future shifted onto spot, and a
 * second venue's native spot print - and they do not agree to the dollar, or
 * in the futures case to sixty-five of them. When the venue changes underneath
 * a standing call, because a token expired or an upstream started throttling,
 * the bars are the same market on a different scale. Comparing frozen levels
 * against them books outcomes that never happened, and not evenly: a call's
 * target is the leg's extreme, a level price is already hovering at, while its
 * stop sits an ATR buffer beyond a swing that price has not traded through. A
 * scale error of a few cents reaches the target and not the stop, so the error
 * manufactures wins. The call waits instead.
 *
 * It waits with a clock running. Refusing the bars is not the same as refusing
 * to age: a call's deadline is a function of when it was published and what
 * time it is, and neither of those needs a candle. Returning the call untouched
 * when there is nothing to score it against left it standing forever - the feed
 * that stopped answering was also the thing that would have expired it - so it
 * stayed on the published record as live, was re-read on every pass, and
 * counted itself into the standing figure a reader is shown. Scoring waits for
 * the right bars; expiry does not wait for anything.
 *
 * A venue missing from either side is read as a match rather than as a
 * mismatch, and that is deliberate on the scoring side: a call with no venue on
 * it would otherwise never be scored at all, only aged, and a record that can
 * only ever expire a call is worse than one that scores it against the single
 * feed that answered. What makes that safe is that it is now unreachable from
 * above - a read that named no exchange is withheld from publishing, so nothing
 * this desk mints carries a null venue for the guard to fall open on.
 *
 * @param {object} signal
 * @param {object} [read] - this pass's read of the signal's instrument
 * @param {number} now - epoch ms
 * @returns {object} the signal, advanced or untouched
 */
export function scoreAgainstRead(signal, read, now) {
  const scoreable =
    read?.ok !== false &&
    Array.isArray(read?.candles) &&
    (!signal.venue || !read.exchange || signal.venue === read.exchange)
  // An empty window scores nothing and still applies the deadline, which is the
  // whole of what an unscoreable call is owed.
  return resolveSignal(signal, scoreable ? read.candles : [], now)
}

/**
 * One full sweep.
 *
 * @param {object} args
 * @param {object[]} args.signals - the record as it stands
 * @param {AbortSignal} [args.abort]
 * @param {number} [args.now] - epoch ms
 * @returns {Promise<{signals:object[], published:object[], reads:Record<string,object>,
 *   unread:{symbol:string, reason:string, detail:string|null}[],
 *   withheld:{symbol:string, reason:string, detail:string|null}[], attempted:number}>}
 *   `withheld` is the instruments that answered but could not carry a call
 */
export async function sweep({ signals, abort, now = Date.now() }) {
  const instruments = SWEPT_INSTRUMENTS.filter(isPublishable)
  const results = await Promise.all(
    instruments.map((meta) =>
      // A throw is a failure like any other and is filed as one. Turning it into
      // an absent instrument is how a whole book of exceptions used to arrive
      // looking like a book with nothing on it.
      readInstrument(meta, abort).catch((error) => ({
        ok: false,
        symbol: meta.symbol,
        timeframe: meta.primaryTimeframe,
        reason: FEED_REASONS.unreachable,
        detail: String(error?.message ?? error),
      }))
    )
  )

  const reads = {}
  const unread = []
  // An instrument that answered too thinly to publish from is neither read nor
  // unread as far as a reader is concerned, and reporting it as read is how a
  // pass comes to say it swept nine instruments while two of them were memories.
  // It is scored against, so it belongs in `reads`; it is named here as well.
  const withheld = []
  for (const result of results) {
    if (result?.ok) {
      reads[result.symbol] = result
      for (const held of result.withheld ?? []) {
        withheld.push({ symbol: result.symbol, reason: held.reason, detail: held.detail ?? null })
      }
      continue
    }
    unread.push({
      symbol: result.symbol,
      reason: result.reason ?? FEED_REASONS.unreachable,
      detail: result.detail ?? null,
    })
  }

  const standing = new Set(
    signals.filter((entry) => !SETTLED.has(entry.status)).map((entry) => entry.fingerprint)
  )

  const published = []
  for (const result of results) {
    if (!result?.ok || !result.call) continue
    const fingerprint = signalFingerprint({
      symbol: result.symbol,
      timeframe: result.timeframe,
      ...result.call,
    })
    if (standing.has(fingerprint)) continue
    standing.add(fingerprint)
    published.push(
      createSignal({
        symbol: result.symbol,
        timeframe: result.timeframe,
        call: result.call,
        price: result.price,
        venue: result.exchange ?? null,
        now,
      })
    )
  }

  // A pass that reached nothing changes nothing. Expiry is a clock fact and
  // does not need bars, which is what stops a call freezing when its venue goes
  // quiet - but a pass that could not see the market at all has no standing to
  // say a call's window closed unanswered, because the answer may well have
  // printed inside the blackout. So the clock runs on a pass that is reading
  // the market and stops on one that is not, and the record waits rather than
  // booking an expiry nothing observed.
  const blind = Object.keys(reads).length === 0 && instruments.length > 0
  const scored = blind
    ? [...signals, ...published]
    : [...signals, ...published].map((entry) => scoreAgainstRead(entry, reads[entry.symbol], now))

  return { signals: scored, published, reads, unread, withheld, attempted: instruments.length }
}

/** The instruments a sweep covers, for a surface that lists them. */
export const PUBLISHED_INSTRUMENTS = SWEPT_INSTRUMENTS.filter(isPublishable)
