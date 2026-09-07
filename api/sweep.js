/**
 * The sweep, run on the host.
 *
 * It used to run in the browser, on a timer inside the tab, writing what it
 * found to that browser's local storage. That made the record a property of
 * whoever happened to be looking: two devices signed into the same account
 * disagreed about how many calls had been published and what they had done, and
 * a setup that fired while every tab was closed was simply never found. A
 * record nobody can reproduce is not evidence, and an alert that requires the
 * reader to already be watching is not an alert.
 *
 * So the same engine runs here instead, on the host's clock, against the same
 * feed function the browser reads, and writes to one table everybody reads
 * back. The browser now renders the record rather than producing it.
 *
 * The endpoint is idempotent by construction. Publishing is gated on the
 * fingerprints already standing and scoring only ever moves a call forward, so
 * running it twice in the same minute costs a second feed read and changes
 * nothing else.
 *
 * What it is not allowed to be is quiet. A pass that read every instrument and
 * judged none of them worth a call, and a pass whose every feed read failed,
 * both leave the record untouched - and for three days this endpoint answered
 * two hundred and `ok: true` to a scheduler while reaching nothing at all,
 * because the origin it was pointing its own feed reads at was one the
 * deployment could not reach. Nothing on the site could have said so: the sweep
 * logged nothing, wrote nothing on a no-op pass, and reported a read of zero in
 * a field with no consequence attached to it. A read of zero is now a refusal
 * with a status on it, every pass writes a heartbeat whether or not it found
 * anything, and every instrument that did not answer is named with the reason
 * it gave.
 */

import { sweep } from '../src/lib/signals/engine.js'
import { setFeedOrigin } from '../src/lib/marketData/chartFeed.js'
import { clearCandleCache } from '../src/lib/marketData/candles.js'
import { ORIGIN } from '../src/lib/routing/routeMeta.data.js'
import {
  markAnnounced,
  persistSweep,
  readStanding,
  readUnannounced,
  signalClient,
} from './lib/signalStore.js'
import { recordSweepRun } from './lib/sweepRuns.js'
import { announce, verifyNotifyCredential } from './lib/announce.js'

/**
 * How long the platform lets one pass run.
 *
 * The pass got materially longer than the default budget it used to fit in:
 * nine instruments at three timeframes each, then the record read and written,
 * then the heartbeat, and now up to four notifications with a retry apiece. The
 * announcement leg alone can legitimately spend seventeen seconds against a
 * slow endpoint. A pass killed part-way is the worst shape available - the
 * record has already moved, the calls it wrote are unstamped, and neither the
 * response nor the log is written, so nothing anywhere records that it happened
 * - and buying it a minute costs nothing on a pass that finishes in two seconds.
 */
export const config = { maxDuration: 60 }

/**
 * How long the feed reads get of that.
 *
 * The budget belongs on the work rather than on the platform's axe. An upstream
 * that accepts a connection and then says nothing has no timeout of its own
 * anywhere in this path, so without one here a single stalled socket takes the
 * whole pass down with it and takes the announcement, the heartbeat and the log
 * line with it. Half the budget leaves the other half for the record and the
 * announcements, which are the parts that must not be cut off part-way.
 */
const FEED_BUDGET_MS = 30_000

/**
 * Where the engine's feed reads are pointed.
 *
 * The market function lives on this same deployment, so the sweep calls it the
 * way anything else on the internet would rather than reaching into it - which
 * keeps one path, one cache and one set of upstream credentials, instead of a
 * second copy of the feed logic that drifts from the one the charts use.
 *
 * It is the site's own address rather than the one the request arrived on. A
 * deployment answers on several hostnames and they are not equivalent: the
 * generated ones sit behind the platform's access protection and redirect a
 * server-to-server call to a sign-in page, which comes back as a two hundred
 * carrying HTML. Every feed read then fails to parse, every failure is caught,
 * and the pass reports that it read nothing - so the one hostname the scheduler
 * happens to invoke decided whether the desk worked, and the wrong one failed
 * silently. Naming the origin removes the question. `SWEEP_ORIGIN` is for
 * driving a pass against somewhere else on purpose.
 */
function originFor() {
  const explicit = process.env.SWEEP_ORIGIN
  return (explicit || ORIGIN).replace(/\/$/, '')
}

/**
 * Whether this request is the scheduler's.
 *
 * Vercel sends the secret as a bearer token on its own cron invocations. The
 * endpoint costs a full feed read of every swept instrument, so leaving it open
 * would hand anyone a way to spend the upstream's rate limit on the desk's
 * behalf.
 */
function authorized(request) {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const header = request.headers.authorization ?? ''
  return header === `Bearer ${secret}`
}

export default async function handler(request, response) {
  if (!authorized(request)) {
    response.status(401).json({ error: 'unauthorized' })
    return
  }

  const client = signalClient()
  if (!client) {
    response.status(503).json({
      error: 'the record is not configured',
      detail: 'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set on the host.',
    })
    return
  }

  const origin = originFor()
  setFeedOrigin(origin)
  // The engine's candle cache is keyed for a long-lived browser tab. A warm
  // function instance would otherwise serve a sweep the bars the previous one
  // read, which is exactly the staleness the sweep exists to avoid.
  clearCandleCache()

  const startedAt = Date.now()
  try {
    const before = await readStanding(client)
    const outcome = await sweep({
      signals: before,
      abort: AbortSignal.timeout(FEED_BUDGET_MS),
      now: startedAt,
    })
    const read = Object.keys(outcome.reads).length

    // The write runs on every pass. A partial one still ages the calls whose
    // own instrument answered - a deadline is a function of the clock rather
    // than of the tape, which is what stops a call freezing when its venue goes
    // quiet - and on a pass that reached nothing at all the engine holds every
    // call where it is, so this writes nothing rather than nothing wrong.
    const { stored, ...written } = await persistSweep(client, {
      published: outcome.published,
      scored: outcome.signals,
      before,
    })

    // Announcing comes after the write, not before it. A call that reached a
    // phone but not the record is the one shape of failure that cannot be
    // recovered from - the reader acts on something nothing can be checked
    // against - and its own failure is reported rather than raised, because a
    // pass that found a call and stored it has done its job.
    //
    // What is announced is what the record says has not been announced, rather
    // than what this pass happened to mint. The two are the same on a healthy
    // morning; they differ on the one that matters, where the last pass found
    // a call and could not deliver it. A host whose record cannot answer that
    // question yet announces what it just wrote, which is what it did before
    // the queue existed.
    const outbox = await readUnannounced(client)
    // The queue is the email path's to retry and the webhook's to stay out of,
    // so what this pass itself found is handed over separately from what it is
    // still owed. Without that split a call email cannot deliver is posted to
    // the webhook again on every pass until it expires, which at the coarsest
    // timeframe the desk publishes is five days of the same message.
    const delivery = await announce(outbox.calls ?? stored, { fresh: stored })
    const announced = {
      ...delivery,
      outbox: outbox.state,
      stamped: await markAnnounced(client, delivery.delivered),
    }

    // A pass that delivered has just proved the credential the only way that
    // counts, so it is not asked again. Every other pass asks, because on a
    // quiet desk that is every pass there is - and a credential that only gets
    // exercised when a call arrives is one that is first found broken by the
    // call it loses. The check mails nobody.
    announced.credential =
      delivery.email.sent > 0
        ? { state: 'ok', status: 200, recipients: null, error: null, proven: 'by delivery' }
        : await verifyNotifyCredential()

    const ms = Date.now() - startedAt
    const blind = read === 0 && outcome.attempted > 0
    // The endpoint knows this deployment's credential is wrong and nothing else
    // does. Read the whole book, store every call, and the desk is still deaf.
    const deaf = announced.credential.state === 'refused'
    const heartbeat = await recordSweepRun(client, {
      origin,
      instruments: outcome.attempted,
      read,
      published: outcome.published.length,
      inserted: written.inserted,
      updated: written.updated,
      unread: outcome.unread,
      withheld: outcome.withheld,
      ok: !blind && !deaf,
      ms,
    })

    const body = {
      ok: !blind && !deaf,
      origin,
      standing: before.length,
      instruments: outcome.attempted,
      read,
      unread: outcome.unread,
      // Instruments that answered and were still not fit to publish from. They
      // count toward `read` because they were read and are scored against, so
      // this is the only place a pass says that two of the nine it swept were
      // memories rather than the market.
      withheld: outcome.withheld,
      published: outcome.published.length,
      ...written,
      announced,
      heartbeat,
      ms,
    }

    // A pass that set out to read a book and read none of it has not found a
    // quiet market; it has failed, and the only reader is a scheduler, which
    // can only be told by the status. A partial read is a real pass and says
    // which instruments it lost in the body and in the log.
    if (blind) {
      body.error = `no instrument answered from ${origin}`
      console.error(`sweep ${JSON.stringify(body)}`)
      response.setHeader('Cache-Control', 'no-store')
      response.status(503).json(body)
      return
    }

    // A deaf pass read the market perfectly and can tell nobody what it found,
    // which is a failure with no other way of being noticed - the record fills,
    // the site changes nothing, and the alert that does not arrive is the only
    // evidence. It is reported the same way a blind pass is, and for the same
    // reason: the only reader here is a scheduler, and a scheduler can only be
    // told by the status.
    if (deaf) {
      body.error = announced.credential.error
      console.error(`sweep ${JSON.stringify(body)}`)
      response.setHeader('Cache-Control', 'no-store')
      response.status(503).json(body)
      return
    }

    const line = `sweep ${JSON.stringify(body)}`
    // An announcement that failed is worth a warning even on a pass that read
    // the whole book, because it is the half of the desk with no surface of
    // its own: nothing on the site changes when an alert does not arrive.
    if (
      outcome.unread.length > 0 ||
      outcome.withheld.length > 0 ||
      announced.error ||
      announced.credential.state === 'unreachable' ||
      announced.credential.recipients === 0
    )
      console.warn(line)
    else console.log(line)

    response.setHeader('Cache-Control', 'no-store')
    response.status(200).json(body)
  } catch (error) {
    const failure = {
      ok: false,
      origin,
      error: String(error?.message ?? error),
      ms: Date.now() - startedAt,
    }
    // A pass that threw is the one a reader most needs a row for, and it was
    // the one that wrote none. The heartbeat existed to make the difference
    // between a quiet market and a dead sweep legible, and a failure that
    // leaves the last good row standing as the most recent thing that happened
    // puts the sweep back exactly where it started: looking alive by not
    // writing. This never throws, so nothing here can turn a failed pass into a
    // pass with no answer at all.
    failure.heartbeat = await recordSweepRun(client, {
      origin,
      instruments: 0,
      read: 0,
      published: 0,
      inserted: 0,
      updated: 0,
      unread: [],
      withheld: [],
      ok: false,
      ms: failure.ms,
    })
    console.error(`sweep ${JSON.stringify(failure)}`)
    response.setHeader('Cache-Control', 'no-store')
    response.status(500).json(failure)
  }
}
