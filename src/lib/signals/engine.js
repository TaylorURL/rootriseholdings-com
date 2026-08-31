import { PRIMARY_INSTRUMENTS, INSTRUMENT_META } from '../../data/instruments.js'
import { fetchCandles } from '../marketData/candles.js'
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
 * The sweep covers the playbook's own instruments rather than the whole book.
 * The rest of the registry is priced and charted, and a call on it would be a
 * call the playbook has no rule for - and would cost the feed a read per
 * instrument per timeframe on every pass to produce it.
 *
 * A call is published once. Structure holds the same leg across many bars, so
 * the engine would otherwise republish the same four numbers on every pass;
 * the fingerprint is what stops that, and it is compared against calls still
 * standing rather than against the whole history, so a setup that genuinely
 * re-forms after settling can be called again.
 */

/** Instruments a call is never published for, whatever structure says. */
const isPublishable = (meta) => meta.tradeable && !meta.isWatchOnly

/**
 * Reads one instrument and returns its structure, its call, and the candles
 * the call would be scored against.
 *
 * @param {object} meta - an instrument registry entry
 * @param {AbortSignal} [signal]
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
  if (!execution) return null

  const executionRead = analyzeStructure(execution.candles, { preset })
  const htfReads = biasReads.map((read) =>
    read ? analyzeStructure(read.candles, { preset }) : null
  )
  const alignment = alignmentOf([executionRead.bias, ...htfReads.map((read) => read?.bias ?? null)])
  const price = execution.candles[execution.candles.length - 1]?.close ?? null

  return {
    symbol: meta.symbol,
    timeframe: meta.primaryTimeframe,
    biasTimeframe: biasTimeframes[0] ?? null,
    biasTimeframes,
    execution: executionRead,
    htf: htfReads[0] ?? null,
    htfReads,
    alignment,
    candles: execution.candles,
    exchange: execution.exchange,
    providerSymbol: execution.providerSymbol,
    price,
    ...deriveTradeCall({
      execution: executionRead,
      alignment,
      sideConstraint: meta.sideConstraint,
      price,
    }),
  }
}

/**
 * One full sweep.
 *
 * @param {object} args
 * @param {object[]} args.signals - the record as it stands
 * @param {AbortSignal} [args.abort]
 * @param {number} [args.now] - epoch ms
 * @returns {Promise<{signals:object[], published:object[], reads:Record<string,object>}>}
 */
export async function sweep({ signals, abort, now = Date.now() }) {
  const instruments = PRIMARY_INSTRUMENTS.filter(isPublishable)
  const results = await Promise.all(
    instruments.map((meta) => readInstrument(meta, abort).catch(() => null))
  )

  const reads = {}
  const candlesBySymbol = {}
  for (const result of results) {
    if (!result) continue
    reads[result.symbol] = result
    candlesBySymbol[result.symbol] = result.candles
  }

  const standing = new Set(
    signals.filter((entry) => !SETTLED.has(entry.status)).map((entry) => entry.fingerprint)
  )

  const published = []
  for (const result of results) {
    if (!result?.call) continue
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
        now,
      })
    )
  }

  const scored = [...signals, ...published].map((entry) => {
    const candles = candlesBySymbol[entry.symbol]
    if (!candles) return entry
    return resolveSignal(entry, candles, now)
  })

  return { signals: scored, published, reads }
}

/** The instruments a sweep covers, for a surface that lists them. */
export const PUBLISHED_INSTRUMENTS = PRIMARY_INSTRUMENTS.filter(isPublishable)

/** @param {string} symbol @returns {object|undefined} */
export function instrumentFor(symbol) {
  return INSTRUMENT_META[symbol]
}
