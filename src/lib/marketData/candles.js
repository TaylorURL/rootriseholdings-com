import { fetchSeries } from './chartFeed.js'

/**
 * Candle history for the structure engine.
 *
 * Series are cached per instrument and timeframe for as long as a bar of that
 * timeframe takes to close, because a second read inside one bar returns the
 * same data: a 15-minute series is worth re-fetching every few minutes, a daily
 * series once an hour.
 */

/** How long a cached series stays current, by timeframe. */
const CACHE_TTL = {
  '15m': 3 * 60 * 1000,
  '1H': 10 * 60 * 1000,
  '4H': 30 * 60 * 1000,
  Daily: 60 * 60 * 1000,
}

const cache = new Map()

function cacheKey(providerSymbol, timeframe) {
  return `${providerSymbol}|${timeframe}`
}

/**
 * @param {object} args
 * @param {string} args.providerSymbol - the feed's ticker for this instrument
 * @param {'15m'|'1H'|'4H'|'Daily'} args.timeframe
 * @param {AbortSignal} [args.signal]
 * @returns {Promise<{candles:object[], providerSymbol:string, exchange:string|null}|null>}
 *   null when the feed does not serve this symbol at this timeframe
 */
export async function fetchCandles({ providerSymbol, timeframe, signal }) {
  const key = cacheKey(providerSymbol, timeframe)
  const hit = cache.get(key)
  const ttl = CACHE_TTL[timeframe] ?? CACHE_TTL['1H']
  if (hit && Date.now() - hit.at < ttl) return hit.value

  const series = await fetchSeries(providerSymbol, timeframe, signal)
  if (!series) return null
  cache.set(key, { at: Date.now(), value: series })
  return series
}
