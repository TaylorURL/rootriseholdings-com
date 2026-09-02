/**
 * Getting a call off the host and onto a phone.
 *
 * The browser's own notification channel only fires while a tab is open, which
 * makes it useless for the case it exists for: a setup that prints while the
 * reader is driving is exactly the one they never see. The sweep runs whether
 * or not anyone is looking, so it is the right place to push from, and a
 * webhook is the cheapest thing that reaches a phone - no mail provider, no
 * push service, no keys to rotate, no account between the desk and its own
 * alerts.
 *
 * It is off unless a URL is set, and a failure to announce never fails a
 * sweep. The record is the product; the announcement is a convenience on top
 * of it, and losing one call's notification is not worth losing the pass that
 * found it.
 */

import { INSTRUMENT_META, decimalsForInstrument } from '../../src/data/instruments.js'

/** How long an announcement may take before the sweep stops waiting on it. */
const TIMEOUT_MS = 4000

/**
 * The most calls one pass will announce.
 *
 * A sweep that finds a dozen at once is either a genuinely rare morning or a
 * fault, and both are better served by a phone that buzzes a few times and
 * says how many were held back than by one that buzzes twelve times.
 */
const MAX_PER_SWEEP = 4

function price(value, symbol) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '-'
  return value.toFixed(decimalsForInstrument(symbol))
}

/**
 * One call as a line someone can act on without opening anything.
 *
 * Everything an order needs is here and in the order a ticket is filled in,
 * because the point is that the reader does not have to go and look.
 *
 * @param {object} signal
 * @returns {string}
 */
export function describeForPush(signal) {
  const meta = INSTRUMENT_META[signal.symbol]
  const name = meta?.displaySymbol ?? signal.symbol
  const rr = Number.isFinite(signal.rewardToRisk) ? `${signal.rewardToRisk.toFixed(2)}:1` : '-'
  return [
    `${signal.side} ${name} · ${signal.grade} ${signal.setup} · ${signal.timeframe}`,
    `Entry ${price(signal.entry, signal.symbol)}`,
    `Stop ${price(signal.stop, signal.symbol)}`,
    `Target ${price(signal.target, signal.symbol)}`,
    `R:R ${rr}`,
  ].join(' | ')
}

/**
 * Announces the calls a sweep published.
 *
 * @param {object[]} published
 * @param {object} [options]
 * @param {string} [options.url] - the webhook to post to
 * @param {typeof fetch} [options.fetcher]
 * @returns {Promise<{sent:number, held:number, error:string|null}>}
 */
export async function announce(
  published,
  { url = process.env.SIGNAL_WEBHOOK_URL, fetcher = fetch } = {}
) {
  if (!url || !published.length) return { sent: 0, held: 0, error: null }

  const going = published.slice(0, MAX_PER_SWEEP)
  const held = published.length - going.length
  const lines = going.map((signal) => describeForPush(signal))
  if (held > 0) lines.push(`(${held} more not shown. The desk has the full record.)`)

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const response = await fetcher(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // `content` is what a Discord webhook reads and is ignored elsewhere;
      // `text` is what most other receivers read. Sending both means the same
      // URL works against either without the host being told which it is.
      body: JSON.stringify({ content: lines.join('\n'), text: lines.join('\n') }),
      signal: controller.signal,
    })
    if (!response.ok) return { sent: 0, held, error: `webhook answered ${response.status}` }
    return { sent: going.length, held, error: null }
  } catch (error) {
    return { sent: 0, held, error: String(error?.message ?? error) }
  } finally {
    clearTimeout(timer)
  }
}
