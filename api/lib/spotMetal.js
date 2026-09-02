/**
 * Spot gold and silver, and the rebasing that puts a futures series onto them.
 *
 * The public chart feed carries no spot XAU/USD or XAG/USD series - it prices
 * both metals off their COMEX front months, which trade above spot by the cost
 * of carry. That gap is a real number, tens of dollars wide on gold, and it
 * lands on every level the structure engine reads: an entry taken off a futures
 * chart is that far from the price a spot CFD platform quotes.
 *
 * A keyless spot print closes it. Closing it by the same amount every time
 * matters as much as closing it at all, because the figure is subtracted from
 * the whole series rather than from the last bar: a basis that comes out
 * different on each read re-prices history itself, and a published signal whose
 * entry, stop and target were frozen at mint time is then scored against a
 * chart on a different scale every sweep. A drift of a dollar or two is enough
 * to decide one, and it does not decide fairly - a target sits at the extreme
 * price has just been hovering at, while a stop sits an ATR beyond a swing
 * price has not traded through, so a scale sliding down manufactures target
 * touches long before it manufactures stops.
 *
 * So the basis is measured once per metal rather than once per request, off the
 * last bar that has finished printing rather than the one still taking ticks,
 * and held while every interval the desk reads is served from it. What it
 * measures is the cost of carry, which re-prices over days, so one number held
 * across a refresh window gives up nothing that measuring it per request was
 * buying.
 *
 * Where no spot print answers there is no honest basis, and the front month is
 * not passed off as spot in its place: sixty-five dollars of gold arriving with
 * nothing to mark it is worse than no answer at all, because the caller has a
 * second venue that quotes the metals as spot outright. The rebasing refuses
 * instead. What it does return carries the figure it was shifted by, so a
 * surface can name it rather than presenting the result as a native spot feed.
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

/**
 * How long a measured basis stands before it is taken again.
 *
 * Ten minutes is already far more often than the carry moves, and the reason to
 * re-take it at all is the front month rolling: when the feed switches contract
 * the futures series steps by the calendar spread, and the basis has to step
 * with it or every level is wrong by that much. It is also long enough that a
 * whole desk sweep - every instrument at every timeframe - is served from a
 * single figure, which is what keeps the 5m quote a reader watches and the 1h
 * series a signal is scored against on one scale rather than two.
 */
const BASIS_TTL_MS = 600_000

/**
 * How much of a fresh measurement is taken into the one being held.
 *
 * The two legs are never sampled at the same instant - the futures leg is a bar
 * that closed and the spot leg is a print of up to a minute ago from another
 * venue - so every measurement carries whatever the market did in between on
 * top of the carry it is trying to read. Since the carry itself moves over
 * days, a quarter of each measurement tracks it with room to spare and leaves
 * the applied scale creeping rather than stepping every refresh.
 */
const BASIS_WEIGHT = 0.25

/**
 * How far from the held basis a measurement has to land, as a fraction of spot,
 * before it is read as a new level rather than as that noise. A roll moves the
 * basis by a calendar spread, dollars wide on gold, which is an order beyond
 * anything a few minutes between the two legs can account for - and easing into
 * a step that size would leave the desk on the old contract's scale for an
 * hour, which is the failure this whole file exists to prevent.
 */
const BASIS_JUMP = 0.005

/** The basis in force for each metal, and the print behind it. */
const bases = new Map()

/**
 * The basis to apply, measured again only once the held one has aged out.
 *
 * @param {string} key - the instrument whose carry is being read
 * @param {number} anchorClose - the futures leg, off a bar that has closed
 * @param {number} spot - the spot leg
 * @returns {{basis: number, anchor: number}} the shift and the print it was
 *   measured against
 */
function basisFor(key, anchorClose, spot) {
  const standing = bases.get(key)
  if (standing && Date.now() - standing.at < BASIS_TTL_MS) return standing
  const measured = anchorClose - spot
  const settled =
    standing && Math.abs(measured - standing.basis) < spot * BASIS_JUMP
      ? standing.basis + (measured - standing.basis) * BASIS_WEIGHT
      : measured
  const taken = { at: Date.now(), basis: settled, anchor: spot }
  bases.set(key, taken)
  return taken
}

/**
 * How wide the series' bars are, in seconds.
 *
 * It is read off the stamps rather than off a named interval so the rule holds
 * for any series of this shape, including one folded to an interval no upstream
 * quotes. The gaps carry session breaks and weekends in among the ordinary
 * ones, so the median of the last several stands for the rest.
 */
function barSeconds(timestamps) {
  const gaps = []
  for (let index = Math.max(1, timestamps.length - 8); index < timestamps.length; index += 1) {
    const gap = timestamps[index] - timestamps[index - 1]
    if (Number.isFinite(gap) && gap > 0) gaps.push(gap)
  }
  if (gaps.length === 0) return null
  gaps.sort((one, other) => one - other)
  return gaps[Math.floor(gaps.length / 2)]
}

/**
 * The last bar that has finished printing.
 *
 * A bar is stamped when it opens, so the one a series ends on goes on taking
 * ticks until its own width has elapsed, and its close is the live price -
 * the number that moves between two reads a second apart, and so the one thing
 * the basis must not be measured from. Where the stamps cannot say, because
 * there are too few of them to give a width, nothing here has closed.
 *
 * @param {object} result - a chart result
 * @returns {number} the index, or -1 when the series has no closed bar
 */
function closedThrough(result) {
  const timestamps = Array.isArray(result.timestamp) ? result.timestamp : []
  const width = barSeconds(timestamps)
  if (width == null) return -1
  const last = timestamps.length - 1
  return Date.now() >= (timestamps[last] + width) * 1000 ? last : last - 1
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
 * @param {number|null} spot - the spot print the basis is measured against
 * @param {object} [naming] - the metal whose carry this is, and what the
 *   rebased series calls itself
 * @returns {object|null} the payload, shifted, or null when no honest anchor
 *   exists and the caller has to serve the metal from somewhere else
 */
export function rebaseToSpot(payload, spot, { metal, symbol, exchangeName } = {}) {
  const result = payload?.chart?.result?.[0]
  const quote = result?.indicators?.quote?.[0]
  if (!result || !quote || !Number.isFinite(spot) || spot <= 0) return null

  const closes = quote.close ?? []
  let anchorClose = null
  for (let index = Math.min(closedThrough(result), closes.length - 1); index >= 0; index -= 1) {
    const close = closes[index]
    if (typeof close === 'number' && Number.isFinite(close) && close > 0) {
      anchorClose = close
      break
    }
  }
  if (anchorClose == null) return null

  // The carry belongs to the instrument rather than to the query, so every
  // interval of a metal shares one entry. A caller that does not name the metal
  // still gets that sharing, off the name the series gives itself.
  const { basis, anchor } = basisFor(metal ?? result.meta?.symbol ?? '', anchorClose, spot)

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
  // The figure every price here was actually moved by, and the print it was
  // measured against - the one from the refresh that set it, not whatever the
  // spot venue is quoting this second, which the series was not shifted onto.
  meta.spotBasis = basis
  meta.spotAnchor = anchor

  return {
    ...payload,
    chart: {
      ...payload.chart,
      result: [{ ...result, meta, indicators: { ...result.indicators, quote: [rebasedQuote] } }],
    },
  }
}

/** Drops both caches, so the next read prints and measures again. */
export function clearSpotCache() {
  cached.clear()
  bases.clear()
}
