import { fetchQuote, fetchSeries } from './chartFeed.js'

/**
 * The US Dollar Index as ICE publishes it, read straight off the feed rather
 * than reconstructed from its six FX legs. The published index is the number
 * the desk's charts and every other desk quote, so it is the one to read.
 */

/** ICE's own ticker for the index. */
export const DXY_SYMBOL = 'DX-Y.NYB'

/**
 * The current index level.
 *
 * @param {AbortSignal} [signal]
 * @returns {Promise<{value:number, changePct:number|null, previousClose:number|null,
 *   exchange:string|null, at:number|null}|null>} null when the feed is unreachable
 */
export async function fetchDxy(signal) {
  const quote = await fetchQuote(DXY_SYMBOL, signal)
  if (!quote) return null
  return {
    value: quote.price,
    changePct: quote.changePct,
    previousClose: quote.previousClose,
    exchange: quote.exchange,
    at: quote.marketTime,
  }
}

/**
 * Index candles, for a structure read on the dollar itself.
 *
 * @param {'15m'|'1H'|'4H'|'Daily'} timeframe
 * @param {AbortSignal} [signal]
 */
export function fetchDxySeries(timeframe, signal) {
  return fetchSeries(DXY_SYMBOL, timeframe, signal)
}
