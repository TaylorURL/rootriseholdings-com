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
 * Only a series is held. A failure is handed back as it came and never stored,
 * so a feed that refuses one read is asked again on the next one rather than
 * being remembered as empty for the rest of the bar.
 *
 * @param {object} args
 * @param {string} args.providerSymbol - the feed's ticker for this instrument
 * @param {'15m'|'1H'|'4H'|'Daily'} args.timeframe
 * @param {AbortSignal} [args.signal]
 * @returns {Promise<{ok:true, candles:object[], providerSymbol:string, exchange:string|null}
 *   |{ok:false, reason:string, detail:string|null}>}
 */
export async function fetchCandles({ providerSymbol, timeframe, signal }) {
  const key = cacheKey(providerSymbol, timeframe)
  const hit = cache.get(key)
  const ttl = CACHE_TTL[timeframe] ?? CACHE_TTL['1H']
  if (hit && Date.now() - hit.at < ttl) return hit.value

  const series = await fetchSeries(providerSymbol, timeframe, signal)
  if (!series.ok) return series
  cache.set(key, { at: Date.now(), value: series })
  return series
}

/**
 * Drops the cache so the next read goes to the feed.
 *
 * The cache is sized for a long-lived tab, where a series read minutes ago is
 * still the series. A sweep on the host is the opposite case: the function
 * instance it runs in may be warm from a pass two minutes ago, and serving
 * that pass's bars would hand the engine exactly the staleness the sweep
 * exists to avoid.
 */
export function clearCandleCache() {
  cache.clear()
}
