/**
 * A second venue for the price, when the first one is refusing.
 *
 * The chart upstream turns away a datacentre address for stretches at a time,
 * and while it does the whole desk reads as unpriced - the ticker, the
 * instrument table, the dollar index, the FX watch. None of those need candle
 * history; they need a number and the close it moved against.
 *
 * This venue serves exactly that, keyless, and serves every instrument it
 * carries in one request rather than one per instrument, so a fallback read
 * costs the upstream allowance of a single call however wide the book gets. Its quote service carries no candle
 * series, so a quote answered from here has empty bar arrays rather than the
 * single point it knows about - a surface asking for structure is better told
 * there is none than handed a chart with one bar on it. The venue's candle
 * history lives behind a different service, and `seriesFallback.js` reads it.
 *
 * It also quotes the metals as spot outright, so a fallback answer needs no
 * basis adjustment - the venue names the instrument the desk actually trades.
 */

const QUOTE_URL = 'https://quote.cnbc.com/quote-html-webservice/restQuote/symbolType/symbol'

/** Sent because the venue answers an empty body to a request without one. */
const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36'

/** The FX pairs this venue carries, by the registry's own six-letter name. */
const FX_PAIRS = [
  'EURUSD',
  'GBPUSD',
  'AUDUSD',
  'NZDUSD',
  'USDJPY',
  'USDCAD',
  'USDCHF',
  'AUDCAD',
  'AUDCHF',
  'AUDJPY',
  'AUDNZD',
  'CADCHF',
  'CADJPY',
  'CHFJPY',
  'EURAUD',
  'EURCAD',
  'EURGBP',
  'EURJPY',
  'EURNZD',
  'GBPAUD',
  'GBPCAD',
  'GBPCHF',
  'GBPJPY',
  'GBPNZD',
  'NZDCAD',
  'NZDCHF',
  'NZDJPY',
]

/** The pairs the chart feed asks for under a name other than their six letters. */
const CHART_TICKERS = { USDJPY: 'JPY=X' }

/**
 * This venue names a pair the way the interbank market quotes it: a dollar pair
 * by its other leg alone, so JPY= is USD/JPY and EUR= is EUR/USD, and a cross
 * by both its legs, so EURJPY= is EUR/JPY. Both forms come off the six letters
 * rather than being listed one by one.
 */
function venueSymbolFor(pair) {
  const base = pair.slice(0, 3)
  const quote = pair.slice(3)
  if (base === 'USD') return `${quote}=`
  if (quote === 'USD') return `${base}=`
  return `${pair}=`
}

const FX_ENTRIES = FX_PAIRS.map((pair) => ({
  ticker: CHART_TICKERS[pair] ?? `${pair}=X`,
  venueSymbol: venueSymbolFor(pair),
  label: `${pair.slice(0, 3)}/${pair.slice(3)}`,
}))

/**
 * Registry ticker to this venue's name for the same instrument.
 *
 * The metals answer as spot here where the chart feed carries only their
 * futures, so the ticker on the left is a future and the name on the right is
 * not. Crude is the venue's front-month future prefixed with @, and crypto is
 * a Coin Metrics aggregate suffixed with .CM= rather than the bare leg the FX
 * pairs use.
 */
export const FALLBACK_SYMBOLS = {
  'GC=F': 'XAU=',
  'SI=F': 'XAG=',
  'CL=F': '@CL.1',
  'BTC-USD': 'BTC.CM=',
  'XRP-USD': 'XRP.CM=',
  '^GSPC': '.SPX',
  '^NDX': '.NDX',
  '^DJI': '.DJI',
  'DX-Y.NYB': '.DXY',
  ...Object.fromEntries(FX_ENTRIES.map((entry) => [entry.ticker, entry.venueSymbol])),
}

/** What this venue calls each instrument it answers for. */
export const VENUE_NAMES = {
  'XAU=': 'Gold Spot',
  'XAG=': 'Silver Spot',
  '@CL.1': 'WTI Crude',
  'BTC.CM=': 'Bitcoin',
  'XRP.CM=': 'XRP',
  '.SPX': 'S&P 500',
  '.NDX': 'Nasdaq 100',
  '.DJI': 'Dow Jones',
  '.DXY': 'ICE Dollar Index',
  ...Object.fromEntries(FX_ENTRIES.map((entry) => [entry.venueSymbol, entry.label])),
}

/** One read serves the desk for this long before another is worth making. */
const TTL_MS = 30_000

let cached = null

/** The venue formats prices for reading, with grouping separators in them. */
function toPrice(text) {
  if (typeof text === 'number') return Number.isFinite(text) ? text : null
  if (typeof text !== 'string') return null
  const value = Number(text.replace(/,/g, ''))
  return Number.isFinite(value) ? value : null
}

/** Normalizes one of the venue's rows into the fields a quote needs. */
export function normalizeQuote(row) {
  const price = toPrice(row?.last)
  if (price == null) return null
  const previousClose = toPrice(row?.previous_day_closing)
  const at = row?.last_time ? Date.parse(row.last_time) : Number.NaN
  return {
    price,
    previousClose,
    high: toPrice(row?.high),
    low: toPrice(row?.low),
    at: Number.isFinite(at) ? at : null,
    venue: VENUE_NAMES[row?.symbol] ?? row?.symbol ?? null,
  }
}

/**
 * Reads every instrument this venue carries, in one request.
 *
 * @param {typeof fetch} [fetcher]
 * @returns {Promise<Record<string, object>>} registry ticker to normalized
 *   quote, empty when the venue is unreachable
 */
export async function readFallbackQuotes(fetcher = fetch) {
  if (cached && Date.now() - cached.at < TTL_MS) return cached.quotes
  const symbols = Object.values(FALLBACK_SYMBOLS).join('|')
  const url = `${QUOTE_URL}?symbols=${encodeURIComponent(symbols)}&requestMethod=itv&noform=1&partnerId=2&fund=1&exthrs=1&output=json`
  try {
    const response = await fetcher(url, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
    })
    if (!response.ok) return cached?.quotes ?? {}
    const body = await response.json()
    const rows = [].concat(body?.FormattedQuoteResult?.FormattedQuote ?? [])
    const byVenueSymbol = {}
    for (const row of rows) {
      const quote = normalizeQuote(row)
      if (quote) byVenueSymbol[row.symbol] = quote
    }
    const quotes = {}
    for (const [ticker, venueSymbol] of Object.entries(FALLBACK_SYMBOLS)) {
      if (byVenueSymbol[venueSymbol]) quotes[ticker] = byVenueSymbol[venueSymbol]
    }
    if (Object.keys(quotes).length === 0) return cached?.quotes ?? {}
    cached = { at: Date.now(), quotes }
    return quotes
  } catch {
    return cached?.quotes ?? {}
  }
}

/**
 * Folds a normalized quote into the chart shape every surface reads.
 *
 * The candle arrays come back empty rather than holding the single point this
 * venue knows about, so a structure read finds no series and renders that,
 * instead of analysing one bar as though it were a chart.
 *
 * @param {object} quote - from {@link normalizeQuote}
 * @param {string} symbol - the venue's name for the instrument
 * @returns {object} the chart-shaped payload
 */
export function toQuotePayload(quote, symbol) {
  return {
    chart: {
      result: [
        {
          meta: {
            symbol,
            currency: 'USD',
            exchangeName: quote.venue,
            fullExchangeName: quote.venue,
            regularMarketPrice: quote.price,
            chartPreviousClose: quote.previousClose,
            regularMarketDayHigh: quote.high,
            regularMarketDayLow: quote.low,
            regularMarketTime: quote.at == null ? null : Math.floor(quote.at / 1000),
            quoteOnly: true,
          },
          timestamp: [],
          indicators: { quote: [{ open: [], high: [], low: [], close: [], volume: [] }] },
        },
      ],
      error: null,
    },
  }
}

/** Drops the cache so the next read goes upstream. */
export function clearFallbackCache() {
  cached = null
}
