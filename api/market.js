/**
 * Serves the market feed from this site's own origin.
 *
 * Upstreams stand behind the one path, tried in order until one answers. When
 * the site holds an OANDA token the answer is OANDA's real-time CFD pricing,
 * folded into the chart shape - one token, held server-side, serves every
 * reader. Otherwise the public chart feed answers, and the metals are rebased
 * onto keyless spot prints so their levels are the ones a spot platform quotes.
 * When that feed is refusing, a second keyless venue answers in its place,
 * serving candle history where it has bars at the interval asked for and the
 * price alone where it does not.
 *
 * A rewrite cannot do the public feed's job. That upstream refuses a request
 * that arrives with no browser user-agent, and a rewrite has no way to add
 * one, so it earns a 429 and the whole desk reads as unpriced. A function can
 * set the header, hold a session, and cache what comes back.
 *
 * The rewrite hands the ticker over as `symbol` and passes the rest of the
 * query through, so callers keep using /data/market exactly as the public
 * upstream documents its own endpoint.
 */

import { oandaInstrumentFor, oandaQuery, toChartPayload } from '../src/lib/marketData/oanda.js'
import { readSpotMetal, rebaseToSpot } from './lib/spotMetal.js'
import { readFallbackQuotes, toQuotePayload } from './lib/quoteFallback.js'
import { readFallbackSeries, toSeriesPayload } from './lib/seriesFallback.js'

/**
 * The public upstream answers on two hosts. They meter separately, so a
 * refusal from one is worth retrying against the other before the instrument
 * is called unpriced - which matters from a datacentre address, where the
 * refusal is about where the request came from rather than how many were sent.
 */
const CHART_HOSTS = [
  'https://query1.finance.yahoo.com/v8/finance/chart',
  'https://query2.finance.yahoo.com/v8/finance/chart',
]
const SEED = 'https://fc.yahoo.com/'
const CRUMB = 'https://query2.finance.yahoo.com/v1/test/getcrumb'

/** Sent so the upstream serves the request rather than throttling it. */
const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36'

/**
 * How long the edge may serve a stored response, by the interval it covers.
 *
 * The upstream counts requests per address rather than per reader, so one
 * function serving a room full of desks looks to it like one very busy client
 * - and it answers that with a refusal. The desk reads a book of dozens of
 * instruments at four timeframes, so what decides whether it stays under the
 * limit is how often each of those keys goes back upstream, and a bar that has
 * not closed yet has nothing new to say. A fifteen-minute series re-read every
 * minute is fourteen refusals bought for nothing, so each interval is re-read
 * on roughly the clock it prints on.
 */
const EDGE_SECONDS = { '5m': 60, '15m': 300, '1h': 900, '1d': 3600 }

/**
 * How long a stored copy may still answer while a new one is fetched. It runs
 * a day past the fresh window because the upstream refuses a datacentre
 * address for stretches at a time: once one read lands, the edge keeps
 * answering from it and re-tries underneath, so a refusal costs the desk a
 * stale chart rather than an empty one.
 */
const STALE_SECONDS = 86_400

function cacheControlFor(params) {
  const fresh = EDGE_SECONDS[params?.get('interval')] ?? 60
  return `public, s-maxage=${fresh}, stale-while-revalidate=${STALE_SECONDS}`
}

/**
 * The last payload each query answered with, held so a warm instance can serve
 * a chart the upstream has started refusing. It backs the edge's stale window
 * rather than replacing it - the edge holds the copy that survives a cold
 * start, this holds the one that survives a cache miss.
 */
const lastGood = new Map()

/**
 * Enough for every instrument in the registry at every timeframe the desk
 * reads, with room for the book to grow before the oldest key is dropped. A
 * limit below that evicts the entry a refusal is about to need.
 */
const LAST_GOOD_LIMIT = 192

function rememberPayload(key, payload) {
  if (lastGood.size >= LAST_GOOD_LIMIT && !lastGood.has(key)) {
    lastGood.delete(lastGood.keys().next().value)
  }
  lastGood.set(key, payload)
}

/**
 * The stored copy, marked as one. Surfaces read `meta.stale` to say when a
 * price was last real rather than presenting it as current.
 */
function stalePayload(key) {
  const payload = lastGood.get(key)
  const result = payload?.chart?.result?.[0]
  if (!result) return null
  return {
    ...payload,
    chart: {
      ...payload.chart,
      result: [{ ...result, meta: { ...result.meta, stale: true } }],
    },
  }
}

/**
 * The tickers whose public-feed series is a future standing in for spot, the
 * metal each is rebased against, and what the rebased series calls itself.
 */
const SPOT_REBASED = {
  'GC=F': { metal: 'XAU', symbol: 'XAU/USD', exchangeName: 'Spot (COMEX basis)' },
  'SI=F': { metal: 'XAG', symbol: 'XAG/USD', exchangeName: 'Spot (COMEX basis)' },
}

/**
 * The upstream's own anti-bot gate: a request carrying no session is refused
 * from some addresses whatever its user-agent says. A session is one cookie
 * and the crumb minted against it, and it outlives a single request, so it is
 * held here and re-taken only when the upstream stops accepting it.
 */
let session = null

async function openSession() {
  const seed = await fetch(SEED, { headers: { 'User-Agent': USER_AGENT } })
  const cookie = (seed.headers.getSetCookie?.() ?? [])
    .map((entry) => entry.split(';')[0])
    .join('; ')
  if (!cookie) return null
  const minted = await fetch(CRUMB, { headers: { 'User-Agent': USER_AGENT, Cookie: cookie } })
  const crumb = minted.ok ? (await minted.text()).trim() : ''
  return { cookie, crumb }
}

function chartUrl(host, symbol, params, crumb) {
  const query = new URLSearchParams(params)
  if (crumb) query.set('crumb', crumb)
  return `${host}/${encodeURIComponent(symbol)}?${query}`
}

/**
 * OANDA's API hosts, one per account kind. A practice-account token is free
 * and reads the same prices; OANDA_ENV=live selects the other host for a
 * token minted on a funded account.
 */
const OANDA_HOSTS = {
  practice: 'https://api-fxpractice.oanda.com',
  live: 'https://api-fxtrade.oanda.com',
}

/**
 * The keyed feed's answer, or null when this request is not its to serve -
 * no token, an instrument it does not carry, a query it cannot translate, or
 * an upstream failure, all of which fall through to the public feed.
 */
async function readOanda(symbol, params) {
  const token = process.env.OANDA_API_TOKEN
  if (!token) return null
  const instrument = oandaInstrumentFor(symbol)
  const query = oandaQuery({ interval: params.get('interval'), range: params.get('range') })
  if (!instrument || !query) return null

  const host = OANDA_HOSTS[process.env.OANDA_ENV] ?? OANDA_HOSTS.practice
  const headers = { Authorization: `Bearer ${token}`, 'Accept-Datetime-Format': 'UNIX' }
  const candlesUrl = (granularity, count) =>
    `${host}/v3/instruments/${instrument}/candles?granularity=${granularity}&count=${count}&price=M`

  try {
    // The daily pair rides alongside every read because it is what fills the
    // quote's meta: the prior close the session's change is measured against
    // and the day's range. A daily series already carries its own.
    const wantsDaily = query.granularity !== 'D' || query.count < 2
    const [series, daily] = await Promise.all([
      fetch(candlesUrl(query.granularity, query.count), { headers }),
      wantsDaily ? fetch(candlesUrl('D', 2), { headers }) : null,
    ])
    if (!series.ok) return null
    const seriesBody = await series.json()
    const dailyBody = daily?.ok ? await daily.json() : null
    const candles = seriesBody?.candles ?? []
    // An answer with no bars in it is no answer; the public feed may still
    // have one, and an empty chart must not be the copy the edge caches.
    if (candles.length === 0) return null
    return toChartPayload({
      instrument,
      candles,
      dailyCandles: dailyBody?.candles ?? (wantsDaily ? [] : candles),
    })
  } catch {
    return null
  }
}

/** The statuses that mean the request was turned away rather than answered. */
const REFUSED = new Set([401, 403, 429])

/**
 * The status that means too many requests rather than the wrong credentials.
 * A session fixes the second and makes the first worse.
 */
const THROTTLED = 429

/**
 * How long the upstream is left alone after it says the requests are coming
 * too fast. Retrying through a throttle is what earns the next one, and every
 * attempt spent during it is an attempt the desk's next real read cannot make.
 */
const COOLDOWN_MS = 60_000

let coolingUntil = 0

/**
 * One read of the public feed.
 *
 * The bare request goes first because the session is what the upstream refuses
 * most readily: a crumb minted against one address and replayed from another
 * is turned away where the same request carrying none is served. A session is
 * only worth taking when the refusal was about credentials, so a throttle ends
 * the read rather than starting a second round of it - a refused chart costs
 * one request, not six, and the difference is whether the next instrument gets
 * an answer at all.
 */
async function readChart(symbol, params) {
  if (Date.now() < coolingUntil) return null

  let refusal = null
  for (const host of CHART_HOSTS) {
    const bare = await fetch(chartUrl(host, symbol, params, null), {
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
    })
    if (!REFUSED.has(bare.status)) return bare
    refusal = bare
    if (bare.status === THROTTLED) {
      coolingUntil = Date.now() + COOLDOWN_MS
      return refusal
    }

    if (!session) session = await openSession()
    if (!session?.cookie) continue
    const withSession = await fetch(chartUrl(host, symbol, params, session.crumb), {
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json', Cookie: session.cookie },
    })
    if (!REFUSED.has(withSession.status)) return withSession
    // A refusal is also what a stale session looks like, so it is dropped
    // rather than carried into the next host.
    session = null
    refusal = withSession
    if (withSession.status === THROTTLED) {
      coolingUntil = Date.now() + COOLDOWN_MS
      return refusal
    }
  }
  return refusal
}

/**
 * The interval a quote is asked for. The desk's timeframes start at fifteen
 * minutes, so a five-minute request is a price rather than a series.
 */
const QUOTE_INTERVAL = '5m'

/** Everything the edge and the stored copy are keyed on. */
function queryKey(symbol, params) {
  return `${symbol}|${params.get('interval') ?? ''}|${params.get('range') ?? ''}`
}

/**
 * Returned when every upstream and every fallback has been tried and none
 * answered. The shape is a valid chart response with no results, so the
 * client parses it, finds nothing, and renders the instrument as unavailable
 * rather than the browser logging an HTTP error for a 5xx status.
 */
const EMPTY_CHART = { chart: { result: [], error: null } }

function sendPayload(response, payload, { status = 200, cache = null } = {}) {
  response.status(status)
  response.setHeader('Content-Type', 'application/json; charset=utf-8')
  response.setHeader('Cache-Control', cache ?? 'no-store')
  response.send(JSON.stringify(payload))
}

export default async function handler(request, response) {
  const url = new URL(request.url, `https://${request.headers.host}`)
  const symbol = url.searchParams.get('symbol')
  if (!symbol) {
    response.status(400).json({ error: 'No symbol given.' })
    return
  }
  url.searchParams.delete('symbol')
  const key = queryKey(symbol, url.searchParams)

  try {
    const keyed = await readOanda(symbol, url.searchParams)
    if (keyed) {
      rememberPayload(key, keyed)
      sendPayload(response, keyed, { cache: cacheControlFor(url.searchParams) })
      return
    }

    const upstream = await readChart(symbol, url.searchParams)
    const body = upstream ? await upstream.text() : ''
    let payload = null
    if (upstream?.ok) {
      try {
        payload = JSON.parse(body)
      } catch {
        payload = null
      }
    }

    if (payload?.chart?.result?.[0]) {
      const naming = SPOT_REBASED[symbol]
      if (naming) payload = rebaseToSpot(payload, await readSpotMetal(naming.metal), naming)
      rememberPayload(key, payload)
      sendPayload(response, payload, { cache: cacheControlFor(url.searchParams) })
      return
    }

    // The upstream refuses a datacentre address in stretches. A chart the desk
    // read a minute ago is worth more than an empty one, so long as it says so.
    const stale = stalePayload(key)
    if (stale) {
      sendPayload(response, stale)
      return
    }

    // The second venue's candle history, folded to the interval asked for. It
    // spans less than the primary feed does at the coarser timeframes, which is
    // the difference between a short chart and no chart.
    const interval = url.searchParams.get('interval')
    const bars = await readFallbackSeries(symbol, interval)
    if (bars) {
      sendPayload(response, toSeriesPayload(bars, symbol), {
        cache: cacheControlFor(url.searchParams),
      })
      return
    }

    // The quote query can still be answered from the venue's price service when
    // its chart service has no bars to give.
    if (interval === QUOTE_INTERVAL) {
      const quotes = await readFallbackQuotes()
      if (quotes[symbol]) {
        sendPayload(response, toQuotePayload(quotes[symbol], symbol), {
          cache: cacheControlFor(url.searchParams),
        })
        return
      }
    }

    // Every fallback exhausted. An empty chart payload tells the client the
    // instrument has no data right now without returning a 5xx that fires the
    // browser's error reporter on every page load. The edge caches it for two
    // minutes so repeated reads during a refusal stretch cost one upstream
    // attempt rather than one per visitor.
    sendPayload(response, EMPTY_CHART, {
      cache: `public, s-maxage=120, stale-while-revalidate=${STALE_SECONDS}`,
    })
  } catch {
    const stale = stalePayload(key)
    if (stale) {
      sendPayload(response, stale)
      return
    }
    sendPayload(response, EMPTY_CHART, {
      cache: `public, s-maxage=120, stale-while-revalidate=${STALE_SECONDS}`,
    })
  }
}
