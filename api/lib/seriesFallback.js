/**
 * Candle history from the second venue, when the chart upstream is refusing.
 *
 * The quote fallback keeps the desk priced, and that is all it keeps: every
 * surface that reads structure rather than a number - the pair charts, the
 * timeframe tabs, the levels the signal engine measures off - has nothing to
 * draw from a price alone. The chart upstream turns away a datacentre address,
 * and it turns away the request that would mint a session just as readily, so
 * there is no credential to present and no cooldown to wait out. A second
 * source of bars is the only thing that puts a chart on the page.
 *
 * This venue is the one already trusted for the quote, reached over its chart
 * service rather than its quote service, and it carries every instrument the
 * registry maps. It publishes two granularities - five-minute bars over the
 * last handful of sessions, and daily bars over the last year or two - so a
 * requested interval is served by folding the finer of the two up to it. What
 * the desk gets while the primary feed refuses is a shorter chart, not an empty
 * one: an hourly read spans days rather than a month, and says so by the bars
 * it carries rather than by a message.
 */

import { FALLBACK_SYMBOLS, VENUE_NAMES } from './quoteFallback.js'

const CHART_URL = 'https://webql-redesign.cnbcfm.com/graphql'

const CHART_QUERY =
  'query getQuoteChartData($symbol: String!, $timeRange: String!) ' +
  '{ chartData(symbol: $symbol, timeRange: $timeRange) ' +
  '{ priceBars { tradeTime open high low close volume } } }'

/** Sent because the venue answers an empty body to a request without one. */
const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36'

const MINUTE_MS = 60_000

/**
 * The venue's range to read for each interval the desk asks for, and the bucket
 * its bars are folded into.
 *
 * Only two ranges are worth reading. The venue's intraday range prints
 * five-minute bars, which divides every intraday interval the desk uses, and
 * its longer ranges all print daily bars whatever they are named - so a daily
 * read asks for the longest and takes the bars as they come. A null bucket is
 * a series already at the requested interval.
 */
const SERIES_PLAN = {
  '5m': { timeRange: '5D', bucketMs: 5 * MINUTE_MS },
  '15m': { timeRange: '5D', bucketMs: 15 * MINUTE_MS },
  '1h': { timeRange: '5D', bucketMs: 60 * MINUTE_MS },
  '1d': { timeRange: '1Y', bucketMs: null },
}

/** One read serves this instrument and range for this long. */
const TTL_MS = 60_000

/**
 * Enough for every instrument in the registry at both ranges the plan names,
 * with room for the book to grow. A limit below that drops the series a second
 * reader is about to ask for.
 */
const CACHE_LIMIT = 96

const cache = new Map()

function remember(key, bars) {
  if (cache.size >= CACHE_LIMIT && !cache.has(key)) cache.delete(cache.keys().next().value)
  cache.set(key, { at: Date.now(), bars })
}

/**
 * The venue stamps every bar in New York wall-clock time and names no zone, so
 * the offset has to be read off the calendar rather than assumed - it is four
 * hours for most of the year and five for the rest, and a chart drawn on the
 * wrong one puts every session an hour out.
 */
const NEW_YORK = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/New_York',
  hour12: false,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
})

/** How far New York stood from UTC at a given instant, in milliseconds. */
function offsetAt(utcMs) {
  const parts = NEW_YORK.formatToParts(new Date(utcMs))
  const field = (type) => Number(parts.find((part) => part.type === type)?.value)
  // Midnight formats as hour 24 in some builds, which is the same instant.
  const asUtc = Date.UTC(
    field('year'),
    field('month') - 1,
    field('day'),
    field('hour') % 24,
    field('minute'),
    field('second')
  )
  return asUtc - utcMs
}

/**
 * `YYYYMMDDHHMMSS` in New York to epoch milliseconds.
 *
 * The offset is only knowable from an instant, and the instant is what is being
 * solved for, so the first pass uses the offset in force at the naive reading
 * and the second corrects it. That settles the hour either side of a clock
 * change, where the two passes disagree.
 *
 * @param {string} stamp
 * @returns {number|null} null when the stamp is not the shape the venue sends
 */
export function tradeTimeToEpoch(stamp) {
  if (typeof stamp !== 'string' || !/^\d{14}$/.test(stamp)) return null
  const naive = Date.UTC(
    Number(stamp.slice(0, 4)),
    Number(stamp.slice(4, 6)) - 1,
    Number(stamp.slice(6, 8)),
    Number(stamp.slice(8, 10)),
    Number(stamp.slice(10, 12)),
    Number(stamp.slice(12, 14))
  )
  if (!Number.isFinite(naive)) return null
  const firstPass = naive - offsetAt(naive)
  return naive - offsetAt(firstPass)
}

function toNumber(text) {
  if (typeof text === 'number') return Number.isFinite(text) ? text : null
  if (typeof text !== 'string') return null
  const value = Number(text.replace(/,/g, ''))
  return Number.isFinite(value) ? value : null
}

/**
 * The venue's rows to bars, oldest first.
 *
 * A bar missing any of its four prices is dropped rather than patched: the
 * surfaces measure structure off open and close, and a bar with a hole in it
 * would be measured as though it were whole.
 *
 * @param {object[]} rows
 * @returns {{time:number, open:number, high:number, low:number, close:number, volume:number}[]}
 */
export function normalizeBars(rows) {
  const bars = []
  for (const row of rows ?? []) {
    const time = tradeTimeToEpoch(row?.tradeTime)
    const open = toNumber(row?.open)
    const high = toNumber(row?.high)
    const low = toNumber(row?.low)
    const close = toNumber(row?.close)
    if (time == null || open == null || high == null || low == null || close == null) continue
    bars.push({ time, open, high, low, close, volume: toNumber(row?.volume) ?? 0 })
  }
  bars.sort((one, other) => one.time - other.time)
  return bars
}

/**
 * Folds bars up to a bucket: open of the first, close of the last, extremes
 * across the group, volume summed.
 *
 * Buckets are floored from the epoch rather than from the first bar, so the
 * boundaries are the ones the clock prints and two reads of the same instrument
 * agree on where a bar starts.
 *
 * @param {object[]} bars - from {@link normalizeBars}
 * @param {number|null} bucketMs - null leaves the series as it is
 */
export function foldBars(bars, bucketMs) {
  if (!bucketMs) return bars
  const folded = []
  let current = null
  for (const bar of bars) {
    const start = Math.floor(bar.time / bucketMs) * bucketMs
    if (!current || current.time !== start) {
      current = { ...bar, time: start }
      folded.push(current)
      continue
    }
    current.high = Math.max(current.high, bar.high)
    current.low = Math.min(current.low, bar.low)
    current.close = bar.close
    current.volume += bar.volume
  }
  return folded
}

/**
 * Reads one instrument's bars from the venue.
 *
 * @param {string} symbol - registry ticker, e.g. GC=F or ^NDX
 * @param {string} interval - the desk's requested interval
 * @param {typeof fetch} [fetcher]
 * @returns {Promise<object[]|null>} folded bars, or null when this request is
 *   not the venue's to serve
 */
export async function readFallbackSeries(symbol, interval, fetcher = fetch) {
  const plan = SERIES_PLAN[interval]
  const venueSymbol = FALLBACK_SYMBOLS[symbol]
  if (!plan || !venueSymbol) return null

  const key = `${venueSymbol}|${plan.timeRange}`
  const held = cache.get(key)
  const bars =
    held && Date.now() - held.at < TTL_MS
      ? held.bars
      : await fetchBars(venueSymbol, plan, key, fetcher)
  if (!bars?.length) return null
  const folded = foldBars(bars, plan.bucketMs)
  // One bar is a price, not a series, and the surfaces read it as structure.
  return folded.length >= 2 ? folded : null
}

async function fetchBars(venueSymbol, plan, key, fetcher) {
  const query = new URLSearchParams({
    operationName: 'getQuoteChartData',
    variables: JSON.stringify({ symbol: venueSymbol, timeRange: plan.timeRange }),
    query: CHART_QUERY,
  })
  try {
    const response = await fetcher(`${CHART_URL}?${query}`, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
    })
    if (!response.ok) return null
    const body = await response.json()
    const bars = normalizeBars(body?.data?.chartData?.priceBars)
    if (!bars.length) return null
    remember(key, bars)
    return bars
  } catch {
    return null
  }
}

/**
 * Folds a bar series into the chart shape every surface reads.
 *
 * The meta carries what the surfaces name an instrument by and the last close
 * as its price, so a chart drawn from this venue labels itself the same way one
 * drawn from the primary feed does.
 *
 * @param {object[]} bars - from {@link readFallbackSeries}
 * @param {string} symbol - the registry ticker the request asked for
 * @returns {object} the chart-shaped payload
 */
export function toSeriesPayload(bars, symbol) {
  const venue = VENUE_NAMES[FALLBACK_SYMBOLS[symbol]] ?? null
  const last = bars[bars.length - 1]
  const previous = bars[bars.length - 2]
  return {
    chart: {
      result: [
        {
          meta: {
            symbol,
            currency: 'USD',
            exchangeName: venue,
            fullExchangeName: venue,
            regularMarketPrice: last.close,
            chartPreviousClose: previous.close,
            regularMarketDayHigh: last.high,
            regularMarketDayLow: last.low,
            regularMarketTime: Math.floor(last.time / 1000),
          },
          timestamp: bars.map((bar) => Math.floor(bar.time / 1000)),
          indicators: {
            quote: [
              {
                open: bars.map((bar) => bar.open),
                high: bars.map((bar) => bar.high),
                low: bars.map((bar) => bar.low),
                close: bars.map((bar) => bar.close),
                volume: bars.map((bar) => bar.volume),
              },
            ],
          },
        },
      ],
      error: null,
    },
  }
}

/** Drops the cache so the next read goes upstream. */
export function clearSeriesCache() {
  cache.clear()
}
