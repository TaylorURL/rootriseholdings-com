/**
 * Serves the market feed from this site's own origin.
 *
 * Upstreams stand behind the one path, tried in order until one answers. When
 * the site holds an OANDA token the answer is OANDA's real-time CFD pricing,
 * folded into the chart shape - one token, held server-side, serves every
 * reader. Otherwise the public chart feed answers, and the metals are rebased
 * onto keyless spot prints so their levels are the ones a spot platform quotes.
 * When that feed is refusing, or when a metal has no spot print to be put onto,
 * a second keyless venue answers in its place, serving candle history where it
 * has bars at the interval asked for and the price alone where it does not.
 *
 * A rewrite cannot do the public feed's job. That upstream refuses a request
 * that arrives with no browser user-agent, and a rewrite has no way to add
 * one, so it earns a 429 and the whole desk reads as unpriced. A function can
 * set the header, hold a session, and cache what comes back.
 *
 * The rewrite hands the ticker over as `symbol` and passes the rest of the
 * query through, so callers keep using /data/market exactly as the public
 * upstream documents its own endpoint.
 *
 * Three answers used to be one answer. A ticker the site has never carried, a
 * ticker it carries that no upstream could price this minute, and an exception
 * thrown halfway down the chain all left here as the same two hundred with an
 * empty result and a day-long stale window on it, and every reader downstream
 * had the same one fact to work from: no bars. A desk reads that as a quiet
 * market. So the first is now a four-oh-four, the second says so in the
 * response's own error field, and both are said out loud in the log with the
 * tier that failed and why - because a feed that cannot answer and a market
 * with nothing to say must never again be the same sentence.
 */

import { oandaInstrumentFor, oandaQuery, toChartPayload } from '../src/lib/marketData/oanda.js'
import { readSpotMetal, rebaseToSpot } from './lib/spotMetal.js'
import { FALLBACK_SYMBOLS, readFallbackQuotes, toQuotePayload } from './lib/quoteFallback.js'
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

/**
 * How long a browser may answer its own re-read without asking the edge. It is
 * short enough that a chart still refreshes on the desk's own minute-long
 * poll, and long enough that a page opened twice in a row - a reader moving
 * between the terminal's screens, or coming back to the tab - draws from what
 * the tab already holds rather than from the network.
 */
const BROWSER_SECONDS = 30

function cacheControlFor(params) {
  const fresh = EDGE_SECONDS[params?.get('interval')] ?? 60
  return `public, max-age=${BROWSER_SECONDS}, s-maxage=${fresh}, stale-while-revalidate=${STALE_SECONDS}`
}

/**
 * The last payload each query answered with, held so a warm instance can serve
 * a chart the upstream has started refusing. It backs the edge's stale window
 * rather than replacing it - the edge holds the copy that survives a cold
 * start, this holds the one that survives a cache miss.
 *
 * Each entry carries the moment it was read, because a copy with no age on it
 * is indistinguishable from a live one and that is not a difference anything
 * downstream can be asked to guess at. The desk mints an entry price from the
 * last close of whatever this answers with, so a memory served as though it
 * were the tape is a call published, and emailed, at a price that stopped
 * being real hours ago.
 */
const lastGood = new Map()

/**
 * Enough for every instrument in the registry at every timeframe the desk
 * reads, with room for the book to grow before the oldest key is dropped. A
 * limit below that evicts the entry a refusal is about to need.
 */
const LAST_GOOD_LIMIT = 192

/** How long one bar of each interval runs, which is what age is measured in. */
const BAR_SECONDS = { '5m': 300, '15m': 900, '1h': 3600, '1d': 86_400 }

/**
 * How far behind the tape a memory may be and still be a chart.
 *
 * Measured in the interval's own bars rather than in minutes, because what
 * makes a stored series usable is how much of it is missing: three bars behind
 * on a fifteen-minute chart is a structure read that is still recognisably the
 * one on the screen, and thirty bars behind is a different market. An entry
 * from a fifteen-minute series that stopped forty-five minutes ago is a price
 * that has already been traded through.
 */
const STALE_BARS = 3

function barSeconds(params) {
  return BAR_SECONDS[params?.get('interval')] ?? 900
}

function rememberPayload(key, payload) {
  if (lastGood.size >= LAST_GOOD_LIMIT && !lastGood.has(key)) {
    lastGood.delete(lastGood.keys().next().value)
  }
  lastGood.set(key, { payload, at: Date.now() })
}

/**
 * The stored copy, marked as one and with its age on it, or nothing at all
 * where it has run too far behind the tape to be a reading of it.
 *
 * `meta.stale` says a price was last real rather than current, and
 * `meta.staleSeconds` says how long ago - which is what lets a reader of this
 * feed decide for itself. The desk refuses to mint a call from a stale read
 * and still scores its standing ones against it, and it can only draw that
 * line because the answer says which it is.
 *
 * A copy past the horizon is dropped rather than served, so the request falls
 * through to the venues below it. An empty chart from a live venue is worth
 * more than a full one from memory: the first is visibly nothing, and the
 * second is a price.
 */
function stalePayload(key, params) {
  const held = lastGood.get(key)
  const result = held?.payload?.chart?.result?.[0]
  if (!result) return null

  const age = Math.round((Date.now() - held.at) / 1000)
  if (age > barSeconds(params) * STALE_BARS) {
    lastGood.delete(key)
    return null
  }

  return {
    ...held.payload,
    chart: {
      ...held.payload.chart,
      result: [
        {
          ...result,
          meta: { ...result.meta, stale: true, staleSeconds: age, degraded: true },
        },
      ],
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
 * and reads the same prices; a token minted on a funded account authenticates
 * against the other host and only against that one.
 */
const OANDA_HOSTS = {
  practice: 'https://api-fxpractice.oanda.com',
  live: 'https://api-fxtrade.oanda.com',
}

/**
 * Which host the token in hand belongs to.
 *
 * A token is good against exactly one of these and is refused by the other, so
 * naming the host in a second variable is naming the same fact twice and
 * inviting the two to disagree. When they disagreed the desk did not stop: it
 * quietly moved onto a keyless venue, and because a venue change also stops
 * `scoreAgainstRead` advancing a standing call, the published record stopped
 * moving without a word. So the host follows the token instead. The named
 * environment is tried first because it is usually right and costs nothing to
 * believe; a refusal on credentials is the one answer that means the other host
 * is the right one, and whichever answers is held for the life of the instance.
 */
let oandaHost = null

function namedOandaHost() {
  return OANDA_HOSTS[process.env.OANDA_ENV] ?? OANDA_HOSTS.live
}

/** The statuses that mean the credential was refused rather than the request. */
const UNAUTHORIZED = new Set([401, 403])

/**
 * The keyed feed's answer, or the reason this request is not its to serve.
 *
 * @returns {Promise<{ok:true, payload:object, host:string}|{ok:false, reason:string}>}
 */
async function readOanda(symbol, params) {
  const token = process.env.OANDA_API_TOKEN
  if (!token) return { ok: false, reason: 'no token on the host' }
  const instrument = oandaInstrumentFor(symbol)
  if (!instrument) return { ok: false, reason: 'OANDA lists no instrument for this ticker' }
  const query = oandaQuery({ interval: params.get('interval'), range: params.get('range') })
  if (!query) return { ok: false, reason: 'no OANDA translation for this interval and range' }

  const headers = { Authorization: `Bearer ${token}`, 'Accept-Datetime-Format': 'UNIX' }
  const candlesUrl = (host, granularity, count) =>
    `${host}/v3/instruments/${instrument}/candles?granularity=${granularity}&count=${count}&price=M`

  // The daily pair rides alongside every read because it is what fills the
  // quote's meta: the prior close the session's change is measured against
  // and the day's range. A daily series already carries its own.
  const wantsDaily = query.granularity !== 'D' || query.count < 2

  const attempt = async (host) => {
    const [series, daily] = await Promise.all([
      fetch(candlesUrl(host, query.granularity, query.count), { headers }),
      wantsDaily ? fetch(candlesUrl(host, 'D', 2), { headers }) : null,
    ])
    if (!series.ok) return { status: series.status }
    const seriesBody = await series.json()
    const dailyBody = daily?.ok ? await daily.json() : null
    const candles = seriesBody?.candles ?? []
    // An answer with no bars in it is no answer; the venues below may still
    // have one, and an empty chart must not be the copy the edge caches.
    if (candles.length === 0) return { status: 200, empty: true }
    return {
      status: 200,
      payload: toChartPayload({
        instrument,
        candles,
        dailyCandles: dailyBody?.candles ?? (wantsDaily ? [] : candles),
      }),
    }
  }

  try {
    const first = oandaHost ?? namedOandaHost()
    let answer = await attempt(first)
    if (answer.payload) {
      oandaHost = first
      return { ok: true, payload: answer.payload, host: first }
    }

    // The other host is worth exactly one try, and only when the refusal was
    // about the credential. Anything else is the same upstream saying the same
    // thing twice.
    const other = first === OANDA_HOSTS.live ? OANDA_HOSTS.practice : OANDA_HOSTS.live
    if (oandaHost == null && UNAUTHORIZED.has(answer.status)) {
      answer = await attempt(other)
      if (answer.payload) {
        oandaHost = other
        return { ok: true, payload: answer.payload, host: other }
      }
    }
    if (answer.empty) return { ok: false, reason: 'OANDA answered with no bars' }
    return { ok: false, reason: `OANDA answered ${answer.status}` }
  } catch (error) {
    return { ok: false, reason: String(error?.message ?? error) }
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
 * Whether any upstream behind this path has ever been able to price a ticker.
 *
 * The keyed feed carries its own book and the second venue carries its own, and
 * between them they are the whole of what the site can serve. A ticker in
 * neither is not an outage: it is a request for something that does not exist
 * here, and it produced the most convincing false alarm this feed has had -
 * `/data/market/XAUUSD` answering an empty chart with a two hundred on it,
 * byte-identical to every instrument going dark at once, because XAUUSD is the
 * registry's own name for the instrument and every caller correctly asks for
 * GC=F. Naming the two apart is what stops that from ever reading as an outage
 * again.
 */
function isServedSymbol(symbol) {
  return Boolean(oandaInstrumentFor(symbol)) || Boolean(FALLBACK_SYMBOLS[symbol])
}

/**
 * A chart response carrying no series and a stated reason.
 *
 * The shape stays a valid chart response so a client parses it rather than
 * handling a transport error, and the error field - null on every answer that
 * carries bars - is what a reader tests to tell an unpriced instrument from a
 * priced one. A 5xx would say the same thing and cost more than it is worth:
 * the browser's own reporter treats any five hundred as a defect worth filing,
 * so an instrument the market has nothing to say about would file one on every
 * page load.
 */
function chartError(code, description) {
  return { chart: { result: [], error: { code, description } } }
}

/**
 * How long a stated failure may be held.
 *
 * Long enough that a refusal stretch costs the upstream one attempt rather than
 * one per visitor, and short enough that the instrument is priced again within
 * a bar of the upstream recovering. The long stale window earns its keep on a
 * real chart, where a price from a minute ago beats no price at all; an empty
 * answer is the one thing that must never outlive the condition that produced
 * it.
 */
const FAILURE_CACHE = 'public, max-age=0, s-maxage=30'

function sendPayload(response, payload, { status = 200, cache = null } = {}) {
  response.status(status)
  response.setHeader('Content-Type', 'application/json; charset=utf-8')
  response.setHeader('Cache-Control', cache ?? 'no-store')
  response.send(JSON.stringify(payload))
}

/**
 * What happened on this request, written where the host keeps its logs.
 *
 * Only a request the keyed feed did not answer is written down. A healthy pass
 * is the overwhelming majority of them and says nothing worth a line, whereas
 * every one of the six ways this path can quietly stop serving real prices -
 * a refused token, a throttled venue, a metal with no spot print to rebase
 * against, a venue with no bars at that range, an unparseable body, a ticker
 * nothing carries - used to leave no trace anywhere at all. That is why gold
 * being served off the wrong scale, or the whole desk falling to a backup
 * venue, could run for days without anyone knowing.
 */
function note(symbol, params, tier, tried) {
  if (tier === 'oanda') return
  console.warn(
    `market ${JSON.stringify({
      symbol,
      interval: params.get('interval') ?? null,
      range: params.get('range') ?? null,
      tier,
      tried,
    })}`
  )
}

/** Marks the served payload with which tier answered it. */
function tagPayload(payload, tier) {
  const result = payload?.chart?.result?.[0]
  if (!result) return payload
  return {
    ...payload,
    chart: {
      ...payload.chart,
      result: [{ ...result, meta: { ...result.meta, feedTier: tier, degraded: tier !== 'oanda' } }],
    },
  }
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

  // Resolved before a single request leaves, which also keeps a ticker nothing
  // carries from spending an attempt on the public feed and arming its cooldown
  // for every instrument that does.
  if (!isServedSymbol(symbol)) {
    note(symbol, url.searchParams, 'none', [{ tier: 'registry', reason: 'no upstream carries it' }])
    sendPayload(
      response,
      chartError('Not Found', `No upstream behind this feed carries ${symbol}.`),
      { status: 404 }
    )
    return
  }

  const tried = []
  try {
    const keyed = await readOanda(symbol, url.searchParams)
    if (keyed.ok) {
      const served = tagPayload(keyed.payload, 'oanda')
      rememberPayload(key, served)
      sendPayload(response, served, { cache: cacheControlFor(url.searchParams) })
      return
    }
    tried.push({ tier: 'oanda', reason: keyed.reason })

    const upstream = await readChart(symbol, url.searchParams)
    const body = upstream ? await upstream.text() : ''
    let payload = null
    if (upstream?.ok) {
      try {
        payload = JSON.parse(body)
      } catch (error) {
        tried.push({ tier: 'public', reason: `unparseable body: ${error?.message ?? error}` })
      }
    } else {
      tried.push({
        tier: 'public',
        reason: upstream ? `answered ${upstream.status}` : 'cooling down or unreachable',
      })
    }

    if (payload?.chart?.result?.[0]) {
      // A metal leaves here on the spot scale or it does not leave here at all.
      // With no spot print to anchor a basis, the rebasing refuses rather than
      // handing the front month over as though it were spot - tens of dollars
      // of gold, with nothing on the payload marking the jump - and the request
      // carries on to the venues below, which quote the metals as spot outright
      // and so need no shift at all.
      const naming = SPOT_REBASED[symbol]
      const served = naming
        ? rebaseToSpot(payload, await readSpotMetal(naming.metal), naming)
        : payload
      if (served) {
        const tagged = tagPayload(served, 'public')
        rememberPayload(key, tagged)
        note(symbol, url.searchParams, 'public', tried)
        sendPayload(response, tagged, { cache: cacheControlFor(url.searchParams) })
        return
      }
      tried.push({ tier: 'public', reason: 'no spot print to rebase the metal against' })
    } else if (payload) {
      tried.push({ tier: 'public', reason: 'answered with no chart' })
    }

    // The upstream refuses a datacentre address in stretches. A chart the desk
    // read a minute ago is worth more than an empty one, so long as it says so.
    const stale = stalePayload(key, url.searchParams)
    if (stale) {
      note(symbol, url.searchParams, 'stale', tried)
      sendPayload(response, stale)
      return
    }
    tried.push({ tier: 'stale', reason: 'nothing held for this query' })

    // The second venue's candle history, folded to the interval asked for. It
    // spans less than the primary feed does at the coarser timeframes, which is
    // the difference between a short chart and no chart.
    const interval = url.searchParams.get('interval')
    const bars = await readFallbackSeries(symbol, interval)
    if (bars) {
      note(symbol, url.searchParams, 'venue-series', tried)
      sendPayload(response, tagPayload(toSeriesPayload(bars, symbol), 'venue-series'), {
        cache: cacheControlFor(url.searchParams),
      })
      return
    }
    tried.push({ tier: 'venue-series', reason: 'no bars at either range' })

    // The quote query can still be answered from the venue's price service when
    // its chart service has no bars to give.
    if (interval === QUOTE_INTERVAL) {
      const quotes = await readFallbackQuotes()
      if (quotes[symbol]) {
        note(symbol, url.searchParams, 'venue-quote', tried)
        sendPayload(response, tagPayload(toQuotePayload(quotes[symbol], symbol), 'venue-quote'), {
          cache: cacheControlFor(url.searchParams),
        })
        return
      }
      tried.push({ tier: 'venue-quote', reason: 'the venue quoted nothing for this ticker' })
    }

    // Every upstream tried and none answered. The instrument is one the site
    // carries, so this is a real refusal rather than a bad ticker, and it says
    // so in the one field on the payload that is null on every good answer.
    note(symbol, url.searchParams, 'none', tried)
    sendPayload(
      response,
      chartError('Unavailable', `No upstream could price ${symbol} right now.`),
      { cache: FAILURE_CACHE }
    )
  } catch (error) {
    const stale = stalePayload(key, url.searchParams)
    if (stale) {
      note(symbol, url.searchParams, 'stale', [
        ...tried,
        { tier: 'handler', reason: String(error?.message ?? error) },
      ])
      sendPayload(response, stale)
      return
    }
    note(symbol, url.searchParams, 'none', [
      ...tried,
      { tier: 'handler', reason: String(error?.message ?? error) },
    ])
    sendPayload(response, chartError('Unavailable', `The feed failed while reading ${symbol}.`), {
      cache: FAILURE_CACHE,
    })
  }
}
