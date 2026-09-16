/**
 * OANDA's v20 candle API as the desk's keyed market feed.
 *
 * The public chart feed is delayed and prices the metals off their COMEX
 * futures, because it carries no spot XAU/USD or XAG/USD series at all. OANDA
 * carries the desk's whole FX book and both metals as the same CFDs a prop
 * platform quotes, in real time, and a practice-account token reads it for
 * free. So api/market serves OANDA whenever the site holds a token and falls
 * back to the public feed when it does not, and every answer arrives in the one
 * chart shape the surfaces already read.
 *
 * This module is the pure half of that: which instruments OANDA carries, how a
 * chart query translates into candle parameters, and how a candle response
 * folds into the chart shape. The function holds the token and does the
 * fetching.
 */

/**
 * OANDA's name for each registry ticker whose own name says nothing about it.
 *
 * The metals and the indices are futures and index tickers on the public feed
 * and spot CFDs here, and dollar-yen carries the public feed's older one-leg
 * name, so each is listed. The dollar index is absent because OANDA lists no
 * instrument for it, and crypto is absent because OANDA carries none, so both
 * stay on the public feed. Every other pair follows the six-letter convention
 * below rather than an entry here.
 */
const OANDA_INSTRUMENTS = {
  'GC=F': 'XAU_USD',
  'SI=F': 'XAG_USD',
  'CL=F': 'WTICO_USD',
  '^NDX': 'NAS100_USD',
  '^DJI': 'US30_USD',
  '^GSPC': 'SPX500_USD',
  'JPY=X': 'USD_JPY',
}

/**
 * The public feed names a spot FX pair by its six letters and a suffix, and
 * OANDA names the same pair by its two legs, so one is read off the other -
 * EURJPY=X is EUR_JPY. Only a ticker of exactly that shape translates, which
 * leaves crypto and index tickers to the map above.
 */
const FX_TICKER = /^([A-Z]{3})([A-Z]{3})=X$/

const GRANULARITY = { '5m': 'M5', '15m': 'M15', '1h': 'H1', '1d': 'D' }
const RANGE_DAYS = { '1d': 1, '5d': 5, '1mo': 31, '3mo': 93, '1y': 366 }
const BARS_PER_DAY = { M5: 288, M15: 96, H1: 24, D: 1 }

/** The most candles OANDA returns in one read. */
const MAX_CANDLE_COUNT = 5000

/** @returns {string|null} OANDA's instrument name, or null where it lists none */
export function oandaInstrumentFor(symbol) {
  if (OANDA_INSTRUMENTS[symbol]) return OANDA_INSTRUMENTS[symbol]
  const pair = FX_TICKER.exec(symbol ?? '')
  return pair ? `${pair[1]}_${pair[2]}` : null
}

/**
 * Translates a chart query into candle parameters.
 *
 * The count is sized from calendar days at the granularity's bar rate, which
 * overshoots the nominal range because CFDs print no weekend bars - the series
 * reaches further back rather than coming up short.
 *
 * @param {object} query
 * @param {string} query.interval - chart interval, e.g. 5m or 1h
 * @param {string} query.range - chart lookback, e.g. 1d or 3mo
 * @returns {{granularity:string, count:number}|null} null when either half has
 *   no OANDA translation
 */
export function oandaQuery({ interval, range }) {
  const granularity = GRANULARITY[interval]
  const days = RANGE_DAYS[range]
  if (!granularity || !days) return null
  return { granularity, count: Math.min(MAX_CANDLE_COUNT, days * BARS_PER_DAY[granularity]) }
}

/** OANDA sends prices as strings; a side that does not parse is no price. */
function toPrice(text) {
  if (text == null) return null
  const value = Number(text)
  return Number.isFinite(value) ? value : null
}

/**
 * Folds a candle response into the chart shape every surface reads.
 *
 * Candles are stamped at their open in unix seconds (the function asks for
 * that format) with mid prices as strings; a candle missing any side is
 * dropped rather than patched, mirroring how the client treats a bar that did
 * not print. The last daily candle is the session so far - its extremes are
 * the day's range - and the close before it is the prior close the session's
 * change is measured against, rolled at OANDA's five-o'clock New York day, the
 * same roll the prop platforms mark.
 *
 * @param {object} args
 * @param {string} args.instrument - OANDA's instrument name, e.g. XAU_USD
 * @param {object[]} [args.candles] - the requested series
 * @param {object[]} [args.dailyCandles] - daily candles, most recent last
 * @returns {object} the chart-shaped payload
 */
export function toChartPayload({ instrument, candles = [], dailyCandles = [] }) {
  const stamps = []
  const open = []
  const high = []
  const low = []
  const close = []
  const volume = []
  for (const candle of candles) {
    const time = Math.floor(Number(candle?.time))
    const o = toPrice(candle?.mid?.o)
    const h = toPrice(candle?.mid?.h)
    const l = toPrice(candle?.mid?.l)
    const c = toPrice(candle?.mid?.c)
    if (!Number.isFinite(time) || o == null || h == null || l == null || c == null) continue
    stamps.push(time)
    open.push(o)
    high.push(h)
    low.push(l)
    close.push(c)
    volume.push(
      typeof candle.volume === 'number' && Number.isFinite(candle.volume) ? candle.volume : 0
    )
  }

  const today = dailyCandles.length > 0 ? dailyCandles[dailyCandles.length - 1] : null
  const prior = dailyCandles.length > 1 ? dailyCandles[dailyCandles.length - 2] : null
  const meta = {
    symbol: instrument,
    currency: 'USD',
    exchangeName: 'OANDA',
    fullExchangeName: 'OANDA',
    regularMarketPrice: close.length > 0 ? close[close.length - 1] : toPrice(today?.mid?.c),
    chartPreviousClose: toPrice(prior?.mid?.c),
    regularMarketDayHigh: toPrice(today?.mid?.h),
    regularMarketDayLow: toPrice(today?.mid?.l),
    regularMarketTime: stamps.length > 0 ? stamps[stamps.length - 1] : null,
  }

  return {
    chart: {
      result: [
        {
          meta,
          timestamp: stamps,
          indicators: { quote: [{ open, high, low, close, volume }] },
        },
      ],
      error: null,
    },
  }
}
