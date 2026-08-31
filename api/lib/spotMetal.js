/**
 * Spot gold and silver, and the rebasing that puts a futures series onto them.
 *
 * The public chart feed carries no spot XAU/USD or XAG/USD series - it prices
 * both metals off their COMEX front months, which trade above spot by the cost
 * of carry. That gap is a real number, tens of dollars wide on gold, and it
 * lands on every level the structure engine reads: an entry taken off a futures
 * chart is that far from the price a spot CFD platform quotes.
 *
 * A keyless spot print closes it. The basis is measured against the series'
 * own last close rather than assumed, and subtracting it shifts every bar by
 * the same amount, so swings, breaks and retracement percentages come out
 * identical while the prices attached to them become the ones a prop platform
 * shows. The payload carries the figure it was shifted by, so a surface can
 * name it rather than presenting the result as a native spot feed.
 */

/** Keyless spot metal prints, no account behind them, one path per metal. */
const SPOT_URL = 'https://api.gold-api.com/price'

/**
 * A spot print is good for a minute. The metal moves inside that; the basis it
 * anchors does not, because the carry re-prices over days.
 */
const SPOT_TTL_MS = 60_000

/** The last print of each metal, held for the window above. */
const cached = new Map()

/**
 * @param {'XAU'|'XAG'} metal
 * @param {typeof fetch} [fetcher]
 * @returns {Promise<number|null>} spot USD per troy ounce, or null when the
 *   print is unreachable or unparseable
 */
export async function readSpotMetal(metal, fetcher = fetch) {
  const held = cached.get(metal)
  if (held && Date.now() - held.at < SPOT_TTL_MS) return held.price
  try {
    const response = await fetcher(`${SPOT_URL}/${metal}`, {
      headers: { Accept: 'application/json' },
    })
    if (!response.ok) return held?.price ?? null
    const body = await response.json()
    const price = Number(body?.price)
    if (!Number.isFinite(price) || price <= 0) return held?.price ?? null
    cached.set(metal, { at: Date.now(), price })
    return price
  } catch {
    return held?.price ?? null
  }
}

/** The prices in a chart payload's meta that name a level rather than a time. */
const META_PRICES = [
  'regularMarketPrice',
  'chartPreviousClose',
  'previousClose',
  'regularMarketDayHigh',
  'regularMarketDayLow',
]

function shift(value, basis) {
  return typeof value === 'number' && Number.isFinite(value) ? value - basis : value
}

/**
 * Rebases a futures chart payload onto spot.
 *
 * @param {object} payload - a chart-shaped response
 * @param {number|null} spot - the spot print the last close anchors to
 * @param {object} [naming] - what the rebased series calls itself
 * @returns {object} the payload, shifted, or the original when no honest
 *   anchor exists
 */
export function rebaseToSpot(payload, spot, { symbol, exchangeName } = {}) {
  const result = payload?.chart?.result?.[0]
  const quote = result?.indicators?.quote?.[0]
  if (!result || !quote || !Number.isFinite(spot) || spot <= 0) return payload

  const closes = quote.close ?? []
  let lastClose = null
  for (let index = closes.length - 1; index >= 0; index -= 1) {
    if (typeof closes[index] === 'number' && Number.isFinite(closes[index])) {
      lastClose = closes[index]
      break
    }
  }
  if (lastClose == null) lastClose = result.meta?.regularMarketPrice
  if (!Number.isFinite(lastClose) || lastClose <= 0) return payload

  const basis = lastClose - spot
  const rebasedQuote = { ...quote }
  for (const side of ['open', 'high', 'low', 'close']) {
    if (Array.isArray(quote[side])) {
      rebasedQuote[side] = quote[side].map((value) => shift(value, basis))
    }
  }

  const meta = { ...result.meta }
  for (const key of META_PRICES) {
    if (key in meta) meta[key] = shift(meta[key], basis)
  }
  if (symbol) meta.symbol = symbol
  if (exchangeName) {
    meta.exchangeName = exchangeName
    meta.fullExchangeName = exchangeName
  }
  meta.spotBasis = basis
  meta.spotAnchor = spot

  return {
    ...payload,
    chart: {
      ...payload.chart,
      result: [{ ...result, meta, indicators: { ...result.indicators, quote: [rebasedQuote] } }],
    },
  }
}

/** Drops the spot cache so the next read goes upstream. */
export function clearSpotCache() {
  cached.clear()
}
