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
 * The venue's ranges to read for each interval the desk asks for, and the
 * bucket its bars are folded into.
 *
 * The venue's intraday ranges print bars fine enough to divide every intraday
 * interval the desk uses - five-minute over five sessions, one-minute over one
 * - and its longer ranges all print daily bars whatever they are named. A null
 * bucket is a series already at the requested interval.
 *
 * Each interval names two ranges rather than one, because this venue's holes
 * are per instrument and per range and they move. The Nasdaq has answered five
 * sessions with nothing while answering one session with a thousand bars, and
 * XRP has done the same thing the other way up, full at five days and empty at
 * a year. Both are instruments the desk reads, and on the timeframe each is
 * traded on, so a single range meant the chart was empty exactly where the
 * instrument needed it. The second range is asked for only when the first
 * comes back with nothing, so a healthy read still costs one request.
 */
const SERIES_PLAN = {
  '5m': { ranges: ['5D', '1D'], bucketMs: 5 * MINUTE_MS },
  '15m': { ranges: ['5D', '1D'], bucketMs: 15 * MINUTE_MS },
  '1h': { ranges: ['5D', '1D'], bucketMs: 60 * MINUTE_MS },
  '1d': { ranges: ['1Y', '5Y'], bucketMs: null },
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
 * A figure the venue meant as a price, or null where it had none to send.
 *
 * Zero prices nothing the registry carries, and the venue prints it where a
 * figure is missing rather than leaving the field out - silver's session
 * extremes come back as 0.00 for hours at a stretch. Read as a number it is a
 * hole that travels: the payload's day range becomes zero to zero, and every
 * reader downstream that would have measured the range off the bars instead
 * finds a finite figure already there and stands down. Volume is parsed the
 * other way round, because a bar that traded nothing really did trade nothing.
 */
function toPrice(text) {
  const value = toNumber(text)
  return value === 0 ? null : value
}

/** How many decimal places the venue printed a figure to. */
function decimalsOf(text) {
  const printed = String(text)
  const point = printed.indexOf('.')
  return point === -1 ? 0 : printed.length - point - 1
}

/**
 * Whether the series ends with the venue's quote row rather than with a bar.
 *
 * Every response splices one on. It is the row the venue's own quote service
 * answers with - the session's open, its extremes so far, the last price - and
 * it arrives carrying the timestamp of the moment it was read rather than of
 * any bar, at whatever interval was asked for. Nothing in the response marks
 * it, and there is no field to ask for that would: the schema behind this query
 * carries the bars and nothing else. So it reads as the newest candle and gets
 * measured as one, and a candle holding a whole session's range touches nearly
 * any level a published signal named - which is how a run of trades comes to be
 * scored against a bar that never printed.
 *
 * Two things it cannot disguise give it away, and either one settles it. On the
 * daily range it repeats the timestamp of the bar before it, because the day it
 * summarises is the day that bar already covers, and no series holds two newest
 * days. On every range it is printed the way a quote is rather than the way a
 * bar is: the venue pads each bar it sends to one decimal width, held across
 * the whole response, and passes the quote row through at whatever precision it
 * happened to be carried at. A final bar that moves the clock forward and is
 * printed like the bars around it is a real bar, and stays.
 */
function endsWithQuoteRow(entries) {
  if (entries.length < 2) return false
  const last = entries[entries.length - 1]
  if (last.bar.time <= entries[entries.length - 2].bar.time) return true
  const printed = new Set()
  for (let index = 0; index < entries.length - 1; index += 1) {
    for (const width of entries[index].decimals) printed.add(width)
  }
  return printed.size === 1 && last.decimals.some((width) => !printed.has(width))
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
  const entries = []
  for (const row of rows ?? []) {
    const time = tradeTimeToEpoch(row?.tradeTime)
    const open = toPrice(row?.open)
    const high = toPrice(row?.high)
    const low = toPrice(row?.low)
    const close = toPrice(row?.close)
    if (time == null || open == null || high == null || low == null || close == null) continue
    entries.push({
      bar: { time, open, high, low, close, volume: toNumber(row?.volume) ?? 0 },
      decimals: [row.open, row.high, row.low, row.close].map(decimalsOf),
    })
  }
  // Sorting is stable, so a quote row that ties with the bar it restates keeps
  // the position the venue sent it in, which is last.
  entries.sort((one, other) => one.bar.time - other.bar.time)
  if (endsWithQuoteRow(entries)) entries.pop()
  return entries.map((entry) => entry.bar)
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

  for (const timeRange of plan.ranges) {
    const key = `${venueSymbol}|${timeRange}`
    const held = cache.get(key)
    const bars =
      held && Date.now() - held.at < TTL_MS
        ? held.bars
        : await fetchBars(venueSymbol, timeRange, key, fetcher)
    if (!bars?.length) continue
    const folded = foldBars(bars, plan.bucketMs)
    // One bar is a price, not a series, and the surfaces read it as structure.
    if (folded.length >= 2) return folded
  }
  return null
}

async function fetchBars(venueSymbol, timeRange, key, fetcher) {
  const query = new URLSearchParams({
    operationName: 'getQuoteChartData',
    variables: JSON.stringify({ symbol: venueSymbol, timeRange }),
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

const DAY_MS = 24 * 60 * MINUTE_MS

/** Which New York day an instant falls on, counted from the epoch. */
function newYorkDay(utcMs) {
  return Math.floor((utcMs + offsetAt(utcMs)) / DAY_MS)
}

/**
 * The session's extremes, measured across the bars sharing the last bar's day.
 *
 * The venue's own figure for this rides on the quote row, which is not a bar
 * and is no longer in the series, so the range has to be measured rather than
 * read. Leaving the field off instead would hand the job to the client, which
 * measures across every bar the payload carries - and an intraday request
 * carries the venue's whole multi-session window, so what the desk would read
 * as today's range is the week's, several times wider than the session that
 * actually printed. A range that wide is the same lie as a range eleven pips
 * narrow, told in the other direction.
 *
 * The day is New York's, because that is the clock the venue stamps its bars
 * in. A series that names no zone offers no other boundary to cut on.
 */
function sessionRange(bars) {
  const last = bars[bars.length - 1]
  const day = newYorkDay(last.time)
  let high = last.high
  let low = last.low
  for (let index = bars.length - 2; index >= 0; index -= 1) {
    if (newYorkDay(bars[index].time) !== day) break
    high = Math.max(high, bars[index].high)
    low = Math.min(low, bars[index].low)
  }
  return { high, low }
}

/**
 * The close the session is measured against.
 *
 * Taken from the last bar of the previous New York day rather than the bar
 * before the last one, which on an intraday series is five minutes ago. The
 * desk reads this as the day's change - the figure a trader checks against
 * their platform first - and five minutes of it is not the day's change by any
 * reading. A daily series lands on the same answer either way, because there
 * the bar before the last one is the previous day.
 *
 * When the payload holds only one day there is no previous close in it, and
 * the field is left off rather than filled from the oldest bar to hand. The
 * surfaces render an absent change as unavailable, which is true; a change
 * measured against an arbitrary bar is not.
 *
 * @param {object[]} bars - oldest first
 * @returns {number|null}
 */
function previousSessionClose(bars) {
  const day = newYorkDay(bars[bars.length - 1].time)
  for (let index = bars.length - 2; index >= 0; index -= 1) {
    if (newYorkDay(bars[index].time) !== day) return bars[index].close
  }
  return null
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
  const previousClose = previousSessionClose(bars)
  const session = sessionRange(bars)
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
            ...(previousClose == null ? {} : { chartPreviousClose: previousClose }),
            regularMarketDayHigh: session.high,
            regularMarketDayLow: session.low,
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
