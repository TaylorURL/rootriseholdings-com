/**
 * The desk's market data client.
 *
 * Everything reads through the site's own `/data/market` path, which answers in
 * one chart shape whichever upstream filled it: in production api/market serves
 * OANDA's real-time CFD pricing where the site holds a data key and the public
 * chart feed otherwise, and the Vite dev server proxies the public feed
 * directly. One response answers both questions a surface asks, because a quote
 * is the last bar of a series: asking for today at a fine interval returns the
 * current price and the session's shape together.
 */

/** Where the browser reaches the proxied chart endpoint. */
export const MARKET_PATH = '/data/market'

/** Desk timeframe to the interval and lookback that fills a readable series. */
const TIMEFRAME_QUERY = {
  '15m': { interval: '15m', range: '5d' },
  '1H': { interval: '1h', range: '1mo' },
  '4H': { interval: '1h', range: '3mo' },
  Daily: { interval: '1d', range: '1y' },
}

/**
 * Four one-hour bars make a four-hour bar. The chart shape carries no 4H
 * interval, so the series is folded down from hourly: open of the first, close
 * of the last, extremes across the group, volume summed.
 */
export const FOLD_TO_4H = 4

function toNumber(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

/**
 * The chart shape aligns its OHLCV arrays to the timestamp array and leaves
 * nulls where a bar did not print. A candle is only usable when all four prices
 * are present, so partial bars are dropped rather than patched.
 */
export function toCandles(result) {
  const stamps = result?.timestamp ?? []
  const quote = result?.indicators?.quote?.[0] ?? {}
  const candles = []
  for (let index = 0; index < stamps.length; index += 1) {
    const open = toNumber(quote.open?.[index])
    const high = toNumber(quote.high?.[index])
    const low = toNumber(quote.low?.[index])
    const close = toNumber(quote.close?.[index])
    if (open == null || high == null || low == null || close == null) continue
    candles.push({
      time: stamps[index] * 1000,
      open,
      high,
      low,
      close,
      volume: toNumber(quote.volume?.[index]) ?? 0,
    })
  }
  return candles
}

/** Folds a series into groups of `size` bars, oldest first. */
export function foldCandles(candles, size) {
  const folded = []
  for (let index = 0; index < candles.length; index += size) {
    const group = candles.slice(index, index + size)
    if (!group.length) continue
    folded.push({
      time: group[0].time,
      open: group[0].open,
      close: group[group.length - 1].close,
      high: Math.max(...group.map((candle) => candle.high)),
      low: Math.min(...group.map((candle) => candle.low)),
      volume: group.reduce((sum, candle) => sum + candle.volume, 0),
    })
  }
  return folded
}

/**
 * One chart request, returning the meta block and the parsed series.
 *
 * @param {string} providerSymbol - registry ticker, e.g. GC=F or ^NDX
 * @param {object} query
 * @param {string} query.interval
 * @param {string} query.range
 * @param {AbortSignal} [signal]
 * @returns {Promise<{meta:object, candles:object[]}|null>} null when the symbol
 *   is not served or the request fails
 */
export async function fetchChart(providerSymbol, { interval, range }, signal) {
  const url = `${MARKET_PATH}/${encodeURIComponent(providerSymbol)}?interval=${interval}&range=${range}`
  try {
    const response = await fetch(url, { signal })
    if (!response.ok) return null
    const payload = await response.json()
    const result = payload?.chart?.result?.[0]
    if (!result?.meta) return null
    return { meta: result.meta, candles: toCandles(result) }
  } catch {
    return null
  }
}

function highestOf(candles, key) {
  if (!candles.length) return null
  return candles.reduce(
    (best, candle) => (candle[key] > best ? candle[key] : best),
    candles[0][key]
  )
}

function lowestOf(candles, key) {
  if (!candles.length) return null
  return candles.reduce(
    (best, candle) => (candle[key] < best ? candle[key] : best),
    candles[0][key]
  )
}

/**
 * The current price for one instrument, with the venue the feed served it from.
 *
 * The intraday series comes back alongside it because the same response carries
 * both, which is what lets a sparkline draw real intraday shape rather than a
 * generated one.
 *
 * The session's high and low are taken from the feed's own figures where it
 * sends them, and measured off the intraday bars where it does not, so an
 * instrument whose venue reports no daily range still shows the range that
 * printed.
 *
 * @returns {Promise<{price:number, previousClose:number|null, change:number|null,
 *   changePct:number|null, high:number|null, low:number|null, currency:string|null,
 *   exchange:string|null, marketTime:number|null, providerSymbol:string,
 *   intraday:object[]}|null>}
 */
export async function fetchQuote(providerSymbol, signal) {
  const chart = await fetchChart(providerSymbol, { interval: '5m', range: '1d' }, signal)
  if (!chart) return null
  const { meta, candles } = chart
  const price = toNumber(meta.regularMarketPrice) ?? candles[candles.length - 1]?.close
  if (price == null) return null
  const previousClose = toNumber(meta.chartPreviousClose) ?? toNumber(meta.previousClose)
  const high = toNumber(meta.regularMarketDayHigh) ?? highestOf(candles, 'high')
  const low = toNumber(meta.regularMarketDayLow) ?? lowestOf(candles, 'low')
  return {
    price,
    previousClose,
    change: previousClose == null ? null : price - previousClose,
    changePct: previousClose ? ((price - previousClose) / previousClose) * 100 : null,
    high,
    low,
    currency: meta.currency ?? null,
    exchange: meta.fullExchangeName ?? meta.exchangeName ?? null,
    marketTime: meta.regularMarketTime ? meta.regularMarketTime * 1000 : null,
    // The serving feed may price the request under its own name - spot XAU_USD
    // answering for the GC=F request - and the name it answers with is the one
    // worth showing.
    providerSymbol: meta.symbol ?? providerSymbol,
    intraday: candles,
  }
}

/**
 * A candle series at one of the desk's timeframes.
 *
 * @param {string} providerSymbol
 * @param {'15m'|'1H'|'4H'|'Daily'} timeframe
 * @param {AbortSignal} [signal]
 * @returns {Promise<{candles:object[], providerSymbol:string, exchange:string|null}|null>}
 */
export async function fetchSeries(providerSymbol, timeframe, signal) {
  const query = TIMEFRAME_QUERY[timeframe]
  if (!query) return null
  const chart = await fetchChart(providerSymbol, query, signal)
  if (!chart || chart.candles.length < 2) return null
  const candles = timeframe === '4H' ? foldCandles(chart.candles, FOLD_TO_4H) : chart.candles
  return {
    candles,
    providerSymbol: chart.meta.symbol ?? providerSymbol,
    exchange: chart.meta.fullExchangeName ?? chart.meta.exchangeName ?? null,
  }
}
