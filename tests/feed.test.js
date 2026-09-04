import test from 'node:test'
import assert from 'node:assert/strict'
import marketHandler from '../api/market.js'
import {
  FEED_REASONS,
  describeFeedFailure,
  fetchChart,
  setFeedOrigin,
} from '../src/lib/marketData/chartFeed.js'

/**
 * The feed's two answers, and the reader that has to tell them apart.
 *
 * One production morning the whole desk read as unpriced, and what had actually
 * happened was a request for `XAUUSD` - the registry's own name for gold, which
 * no upstream behind this path has ever carried, every caller correctly asking
 * for `GC=F` instead. The answer to it was a two hundred with an empty result
 * and a day-long stale window, which is byte for byte the answer a total outage
 * gives. These tests exist so those two can never be the same response again.
 */

/** A response object that records what the handler said rather than sending it. */
function recorder() {
  return {
    statusCode: null,
    body: null,
    headers: {},
    status(code) {
      this.statusCode = code
      return this
    },
    setHeader(key, value) {
      this.headers[key] = value
    },
    send(text) {
      this.body = text
    },
    json(payload) {
      this.body = JSON.stringify(payload)
      return this
    },
    parsed() {
      return JSON.parse(this.body)
    },
  }
}

const request = (symbol, query = 'interval=1h&range=1mo') => ({
  url: `/api/market?symbol=${encodeURIComponent(symbol)}&${query}`,
  headers: { host: 'www.rootriseholdings.com' },
})

/** Swaps the platform fetch for the duration of one test. */
function stubFetch(t, responder) {
  const original = globalThis.fetch
  globalThis.fetch = responder
  t.after(() => {
    globalThis.fetch = original
  })
}

const refusing = (count) => async () => {
  count.calls += 1
  return { ok: false, status: 500, text: async () => '', json: async () => ({}) }
}

const CHART = {
  chart: {
    result: [
      {
        meta: { symbol: '^GSPC', exchangeName: 'SNP', regularMarketPrice: 5000 },
        timestamp: [1_700_000_000, 1_700_003_600],
        indicators: {
          quote: [{ open: [1, 2], high: [3, 4], low: [0, 1], close: [2, 3], volume: [1, 1] }],
        },
      },
    ],
    error: null,
  },
}

test('a ticker no upstream carries is refused rather than answered empty', async (t) => {
  const count = { calls: 0 }
  stubFetch(t, refusing(count))

  const response = recorder()
  await marketHandler(request('XAUUSD'), response)

  assert.equal(response.statusCode, 404)
  const payload = response.parsed()
  assert.deepEqual(payload.chart.result, [])
  assert.equal(payload.chart.error.code, 'Not Found')
  assert.match(payload.chart.error.description, /XAUUSD/)
  // Nothing left the function. A ticker the site does not carry must not spend
  // an upstream attempt, because a throttle earned on one closes the tier for
  // every instrument that does.
  assert.equal(count.calls, 0)
})

test('an instrument the site carries and cannot price says so on the payload', async (t) => {
  const count = { calls: 0 }
  stubFetch(t, refusing(count))

  const response = recorder()
  await marketHandler(request('^GSPC'), response)

  const payload = response.parsed()
  assert.deepEqual(payload.chart.result, [])
  assert.equal(payload.chart.error.code, 'Unavailable')
  assert.notEqual(payload.chart.error, null)
  // A failure must not outlive the condition that produced it.
  assert.equal(response.headers['Cache-Control'].includes('stale-while-revalidate'), false)
  assert.ok(count.calls > 0, 'the upstreams were actually tried')
})

test('the two refusals are told apart by their answers, not only by their status', async (t) => {
  stubFetch(t, refusing({ calls: 0 }))

  const unknown = recorder()
  await marketHandler(request('XAUUSD'), unknown)
  const carried = recorder()
  await marketHandler(request('^GSPC'), carried)

  assert.notEqual(unknown.statusCode, carried.statusCode)
  assert.notEqual(unknown.parsed().chart.error.code, carried.parsed().chart.error.code)
})

test('a served chart names the tier that answered it', async (t) => {
  stubFetch(t, async () => ({
    ok: true,
    status: 200,
    text: async () => JSON.stringify(CHART),
    json: async () => CHART,
  }))

  const response = recorder()
  await marketHandler(request('^GSPC'), response)

  const meta = response.parsed().chart.result[0].meta
  assert.equal(response.statusCode, 200)
  assert.equal(meta.feedTier, 'public')
  // Anything but the keyed feed is a different scale under a standing call, so
  // the payload carries the fact rather than leaving it to be inferred.
  assert.equal(meta.degraded, true)
})

test('a feed read reports why it produced no series', async (t) => {
  setFeedOrigin('')
  t.after(() => setFeedOrigin(''))

  stubFetch(t, async () => {
    throw new Error('getaddrinfo ENOTFOUND')
  })
  const unreachable = await fetchChart('^GSPC', { interval: '1h', range: '1mo' })
  assert.equal(unreachable.ok, false)
  assert.equal(unreachable.reason, FEED_REASONS.unreachable)

  globalThis.fetch = async () => ({ ok: false, status: 404, json: async () => ({}) })
  const refused = await fetchChart('^GSPC', { interval: '1h', range: '1mo' })
  assert.equal(refused.reason, FEED_REASONS.refused)

  globalThis.fetch = async () => ({
    ok: true,
    status: 200,
    json: async () => ({
      chart: { result: [], error: { code: 'Unavailable', description: 'no' } },
    }),
  })
  const unpriced = await fetchChart('^GSPC', { interval: '1h', range: '1mo' })
  assert.equal(unpriced.reason, FEED_REASONS.unpriced)

  globalThis.fetch = async () => ({ ok: true, status: 200, json: async () => CHART })
  const served = await fetchChart('^GSPC', { interval: '1h', range: '1mo' })
  assert.equal(served.ok, true)
  assert.equal(served.candles.length, 2)
})

test('every reason a read can fail for has something a reader can be told', () => {
  for (const reason of Object.values(FEED_REASONS)) {
    const sentence = describeFeedFailure({ reason })
    assert.match(sentence, /[a-z]/)
    assert.notEqual(sentence, describeFeedFailure({ reason: 'nothing-like-this' }))
  }
})

/**
 * A memory served as though it were the tape.
 *
 * The feed holds the last payload each query answered with, so a warm instance
 * can still draw a chart while an upstream is refusing it. What that copy never
 * carried was an age, and a two hundred with a full series on it is exactly what
 * a live read looks like on the wire - so the desk mints an entry from the last
 * close of a series that stopped hours ago and publishes, and emails, a price
 * that has already been traded through. The copy now says how far behind it is,
 * and past a few of its own bars it is not served at all.
 */
test('a stored copy says how far behind the tape it is', async (t) => {
  let live = true
  stubFetch(t, async () => {
    if (live) {
      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify(CHART),
        json: async () => CHART,
      }
    }
    return { ok: false, status: 429, text: async () => '', json: async () => ({}) }
  })

  const warm = recorder()
  await marketHandler(request('^GSPC', 'interval=15m&range=5d'), warm)
  assert.equal(warm.parsed().chart.result[0].meta.stale, undefined, 'a live read is not stale')

  live = false
  const remembered = recorder()
  await marketHandler(request('^GSPC', 'interval=15m&range=5d'), remembered)

  const meta = remembered.parsed().chart.result[0].meta
  assert.equal(meta.stale, true)
  assert.equal(typeof meta.staleSeconds, 'number', 'the age is on the payload, not implied by it')
  // A memory is a degraded answer whatever tier originally filled it, and the
  // one reader that has to know is the one deciding whether to mint a price.
  assert.equal(meta.degraded, true)
})

test('a stored copy too far behind the tape is not served at all', async (t) => {
  let live = true
  stubFetch(t, async () => {
    if (live) {
      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify(CHART),
        json: async () => CHART,
      }
    }
    return { ok: false, status: 429, text: async () => '', json: async () => ({}) }
  })

  const warm = recorder()
  await marketHandler(request('^DJI', 'interval=15m&range=5d'), warm)
  assert.equal(warm.statusCode, 200)

  // Three fifteen-minute bars on. A series that stopped that long ago is a
  // memory rather than a reading of anything, and an empty answer from a live
  // venue is worth more than a full one nobody can date.
  const clock = Date.now
  Date.now = () => clock() + 46 * 60 * 1000
  t.after(() => {
    Date.now = clock
  })

  live = false
  const expired = recorder()
  await marketHandler(request('^DJI', 'interval=15m&range=5d'), expired)
  assert.deepEqual(expired.parsed().chart.result, [], 'the memory was dropped rather than served')
  assert.equal(expired.parsed().chart.error.code, 'Unavailable')
})
