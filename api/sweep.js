/**
 * The sweep, run on the host.
 *
 * It used to run in the browser, on a timer inside the tab, writing what it
 * found to that browser's local storage. That made the record a property of
 * whoever happened to be looking: two devices signed into the same account
 * disagreed about how many calls had been published and what they had done,
 * and a setup that fired while every tab was closed was simply never found. A
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
 */

import { sweep } from '../src/lib/signals/engine.js'
import { setFeedOrigin } from '../src/lib/marketData/chartFeed.js'
import { clearCandleCache } from '../src/lib/marketData/candles.js'
import { persistSweep, readStanding, signalClient } from './lib/signalStore.js'
import { announce } from './lib/announce.js'

/**
 * Where the engine's feed reads are pointed.
 *
 * The market function lives on this same deployment, so the sweep calls it the
 * way anything else on the internet would rather than reaching into it - which
 * keeps one path, one cache and one set of upstream credentials, instead of a
 * second copy of the feed logic that drifts from the one the charts use.
 */
function originFor(request) {
  const explicit = process.env.SWEEP_ORIGIN
  if (explicit) return explicit
  const host = request.headers['x-forwarded-host'] ?? request.headers.host
  const proto = request.headers['x-forwarded-proto'] ?? 'https'
  return host ? `${proto}://${host}` : ''
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

  setFeedOrigin(originFor(request))
  // The engine's candle cache is keyed for a long-lived browser tab. A warm
  // function instance would otherwise serve a sweep the bars the previous one
  // read, which is exactly the staleness the sweep exists to avoid.
  clearCandleCache()

  const startedAt = Date.now()
  try {
    const before = await readStanding(client)
    const outcome = await sweep({ signals: before, now: startedAt })
    const written = await persistSweep(client, {
      published: outcome.published,
      scored: outcome.signals,
      before,
    })

    // Announcing comes after the write, not before it. A call that reached a
    // phone but not the record is the one shape of failure that cannot be
    // recovered from - the reader acts on something nothing can be checked
    // against - and its own failure is reported rather than raised, because a
    // pass that found a call and stored it has done its job.
    const announced = await announce(outcome.published)

    response.setHeader('Cache-Control', 'no-store')
    response.status(200).json({
      ok: true,
      standing: before.length,
      read: Object.keys(outcome.reads).length,
      published: outcome.published.length,
      ...written,
      announced,
      ms: Date.now() - startedAt,
    })
  } catch (error) {
    response.setHeader('Cache-Control', 'no-store')
    response.status(500).json({ ok: false, error: String(error?.message ?? error) })
  }
}
