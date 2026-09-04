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
 *
 * A read that does not produce a series says why. It used to return null for
 * every kind of failure at once - a refused request, an unparseable body, a
 * ticker the site does not carry, a market with nothing to report - and
 * everything above it then had one fact to work from: no bars. That is the
 * difference between a desk that looked at the market and found nothing and a
 * desk that never reached the market at all, and collapsing the two is what let
 * a feed the sweep could not reach read, on every surface and in every log, as
 * a quiet morning. So a failure comes back as a reason, and the callers that
 * only want a price still get to ignore it.
 */

/** Where the browser reaches the proxied chart endpoint. */
export const MARKET_PATH = '/data/market'

/**
 * What the feed path is resolved against.
 *
 * A browser resolves `/data/market` against the page it is on and needs
 * nothing here. The sweep runs on the host, where there is no page to resolve
 * against, so it names the origin once at startup and every read underneath it
 * - the same engine, the same registry, the same code - reaches the same
 * function the browser would have.
 */
let feedOrigin = ''

/** @param {string} origin - an absolute origin, or '' to resolve relatively */
export function setFeedOrigin(origin) {
  feedOrigin = origin ? origin.replace(/\/$/, '') : ''
}

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
 * Why a read produced no series.
 *
 * The set is small on purpose: what a caller does about a failure depends on
 * which side of the wire it happened on, and nothing finer than that. Anything
 * needing more detail reads `detail`, which carries the upstream's own words.
 */
export const FEED_REASONS = {
  /** The request did not come back at all - no network, or the host refused it. */
  unreachable: 'unreachable',
  /** The feed answered with a status that is not a success. */
  refused: 'refused',
  /** The feed answered, and said it could not price this instrument. */
  unpriced: 'unpriced',
  /** The body was not the chart shape, so there is nothing to read out of it. */
  unreadable: 'unreadable',
  /** Bars came back, but too few of them to read structure off. */
  short: 'short',
  /** The desk asks for a timeframe the feed has no query for. */
  untimed: 'untimed',
}

/** What each reason says on a surface, in the desk's own words. */
const FEED_SENTENCES = {
  unreachable: 'The market feed could not be reached.',
  refused: 'The market feed refused the request.',
  unpriced: 'The market feed has no price for this instrument right now.',
  unreadable: 'The market feed answered with something that is not a chart.',
  short: 'The market feed returned too little history to read structure from.',
  untimed: 'This timeframe is not one the feed is asked for.',
}

/**
 * One sentence a reader can act on, for a failed read.
 *
 * @param {{reason?:string, detail?:string}} [failure] - from a feed read
 * @returns {string}
 */
export function describeFeedFailure(failure) {
  return FEED_SENTENCES[failure?.reason] ?? 'The market feed did not answer.'
}

const failed = (reason, detail = null) => ({ ok: false, reason, detail })

/**
 * One chart request, returning the meta block and the parsed series.
 *
 * @param {string} providerSymbol - registry ticker, e.g. GC=F or ^NDX
 * @param {object} query
 * @param {string} query.interval
 * @param {string} query.range
 * @param {AbortSignal} [signal]
 * @returns {Promise<{ok:true, meta:object, candles:object[]}|{ok:false, reason:string, detail:string|null}>}
 */
export async function fetchChart(providerSymbol, { interval, range }, signal) {
  const url = `${feedOrigin}${MARKET_PATH}/${encodeURIComponent(providerSymbol)}?interval=${interval}&range=${range}`
  let response
  try {
    response = await fetch(url, { signal })
  } catch (error) {
    return failed(FEED_REASONS.unreachable, String(error?.message ?? error))
  }
  if (!response.ok) return failed(FEED_REASONS.refused, `the feed answered ${response.status}`)

  let payload
  try {
    payload = await response.json()
  } catch (error) {
    return failed(FEED_REASONS.unreadable, String(error?.message ?? error))
  }

  // The feed fills this field when it has been asked for something it carries
  // and could not price it. An answer that carries neither a result nor a
  // stated reason is one the desk cannot read, which is its own fault rather
  // than the market's.
  const stated = payload?.chart?.error
  const result = payload?.chart?.result?.[0]
  if (!result?.meta) {
    if (stated) {
      return failed(FEED_REASONS.unpriced, stated.description ?? stated.code ?? null)
    }
    return failed(FEED_REASONS.unreadable, 'the answer carried no chart')
  }
  // How far behind the tape this answer is, where the feed served it out of its
  // own memory rather than from an upstream. A caller that only asks whether
  // the read succeeded gets the same shape it always did; one that mints a
  // price from the last close has to know, because a two hundred carrying a
  // full series is exactly what a memory looks like on the wire.
  const stale = Number.isFinite(result.meta.staleSeconds)
    ? result.meta.staleSeconds
    : result.meta.stale
      ? Infinity
      : null
  return { ok: true, meta: result.meta, candles: toCandles(result), stale }
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
  if (!chart.ok) return null
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
 * @returns {Promise<{ok:true, candles:object[], providerSymbol:string, exchange:string|null,
 *   stale:number|null} |{ok:false, reason:string, detail:string|null}>} `stale` is how many
 *   seconds behind the tape the series is where the feed answered from memory, and null where
 *   it answered from an upstream
 */
export async function fetchSeries(providerSymbol, timeframe, signal) {
  const query = TIMEFRAME_QUERY[timeframe]
  if (!query) return failed(FEED_REASONS.untimed, timeframe)
  const chart = await fetchChart(providerSymbol, query, signal)
  if (!chart.ok) return chart
  // One bar is a price, not a series, and everything above this reads it as
  // structure. A series that short is reported as short rather than as absent,
  // because the two are answered differently: one waits for the market, the
  // other waits for the feed.
  if (chart.candles.length < 2) return failed(FEED_REASONS.short, `${chart.candles.length} bars`)
  const candles = timeframe === '4H' ? foldCandles(chart.candles, FOLD_TO_4H) : chart.candles
  return {
    ok: true,
    candles,
    providerSymbol: chart.meta.symbol ?? providerSymbol,
    exchange: chart.meta.fullExchangeName ?? chart.meta.exchangeName ?? null,
    stale: chart.stale,
  }
}
