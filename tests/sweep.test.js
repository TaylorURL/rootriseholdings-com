import test from 'node:test'
import assert from 'node:assert/strict'
import handler from '../api/sweep.js'
import { SWEPT_INSTRUMENTS } from '../src/data/instruments.js'

/** A response object that records what the handler said, rather than sending it. */
function recorder() {
  return {
    statusCode: null,
    body: null,
    headers: {},
    status(code) {
      this.statusCode = code
      return this
    },
    json(payload) {
      this.body = payload
      return this
    },
    setHeader(key, value) {
      this.headers[key] = value
    },
  }
}

const request = (headers = {}) => ({ headers })

/**
 * A sweep costs a feed read of every swept instrument at every timeframe. Left
 * open, the endpoint hands anyone a way to spend the upstreams' rate limit on
 * the desk's behalf and get the whole book read as unpriced - so the closed
 * case is the one worth pinning down.
 */
test('a sweep without the scheduler’s secret is refused', async (t) => {
  const previous = process.env.CRON_SECRET
  process.env.CRON_SECRET = 'shibboleth'
  t.after(() => {
    process.env.CRON_SECRET = previous
  })

  const response = recorder()
  await handler(request(), response)
  assert.equal(response.statusCode, 401)

  const wrong = recorder()
  await handler(request({ authorization: 'Bearer wrong' }), wrong)
  assert.equal(wrong.statusCode, 401)
})

/**
 * A host that has not been given a secret cannot tell the scheduler from
 * anyone else, so it refuses everyone rather than serving everyone.
 */
test('a host with no secret configured refuses rather than opens', async (t) => {
  const previous = process.env.CRON_SECRET
  delete process.env.CRON_SECRET
  t.after(() => {
    if (previous === undefined) delete process.env.CRON_SECRET
    else process.env.CRON_SECRET = previous
  })

  const response = recorder()
  await handler(request({ authorization: 'Bearer anything' }), response)
  assert.equal(response.statusCode, 401)
})

/**
 * A deploy missing its database credentials should read as a deploy missing
 * its credentials, not as a broken sweep.
 */
test('a sweep with no record to write to says so', async (t) => {
  const previousSecret = process.env.CRON_SECRET
  const previousKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  process.env.CRON_SECRET = 'shibboleth'
  delete process.env.SUPABASE_SERVICE_ROLE_KEY
  t.after(() => {
    process.env.CRON_SECRET = previousSecret
    if (previousKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY
    else process.env.SUPABASE_SERVICE_ROLE_KEY = previousKey
  })

  const response = recorder()
  await handler(request({ authorization: 'Bearer shibboleth' }), response)
  assert.equal(response.statusCode, 503)
  assert.match(response.body.detail, /SUPABASE_SERVICE_ROLE_KEY/)
})

/**
 * A pass reads a book of instruments and may publish nothing from it, and that
 * is the desk working. A pass that reaches none of them and reports the same
 * thing is the desk broken, and for three days those were the same answer: two
 * hundred, `ok: true`, a read of zero in a field with no consequence attached
 * to it, and a record that stayed empty while a scheduler was told every two
 * minutes that everything was fine. Everything below this line exists to make
 * that particular silence impossible.
 */

/** A chart response the structure engine can read without finding a setup in it. */
function flatChart(symbol) {
  const timestamp = []
  const price = []
  for (let index = 0; index < 60; index += 1) {
    timestamp.push(1_700_000_000 + index * 3600)
    price.push(100)
  }
  return {
    chart: {
      result: [
        {
          meta: { symbol, exchangeName: 'OANDA', fullExchangeName: 'OANDA' },
          timestamp,
          indicators: {
            quote: [
              {
                open: [...price],
                high: [...price],
                low: [...price],
                close: [...price],
                volume: price.map(() => 0),
              },
            ],
          },
        },
      ],
      error: null,
    },
  }
}

/**
 * Stands the whole host up around one pass: a database that answers an empty
 * record, and a market feed that answers however the test says it does.
 */
function host(t, feed, { queue = [], notify = null, probe = null } = {}) {
  const previous = {
    secret: process.env.CRON_SECRET,
    url: process.env.SUPABASE_URL,
    key: process.env.SUPABASE_SERVICE_ROLE_KEY,
    origin: process.env.SWEEP_ORIGIN,
    hook: process.env.SIGNAL_WEBHOOK_URL,
    notifyUrl: process.env.NOTIFY_URL,
    notifySecret: process.env.NOTIFY_SECRET,
    fetch: globalThis.fetch,
    log: console.log,
    warn: console.warn,
    error: console.error,
  }
  process.env.CRON_SECRET = 'shibboleth'
  process.env.SUPABASE_URL = 'https://records.test'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role'
  process.env.SWEEP_ORIGIN = 'https://feed.test'
  delete process.env.SIGNAL_WEBHOOK_URL
  // A pass must never reach a real inbox from a test run, whatever the machine
  // it runs on happens to have set.
  delete process.env.NOTIFY_SECRET
  if (notify) {
    process.env.NOTIFY_URL = 'https://notify.test/api/notify'
    process.env.NOTIFY_SECRET = 'secret'
  } else {
    delete process.env.NOTIFY_URL
  }

  const lines = []
  console.log = (line) => lines.push(line)
  console.warn = (line) => lines.push(line)
  console.error = (line) => lines.push(line)

  const written = []
  const notified = []
  const probes = []
  globalThis.fetch = async (input, init) => {
    const url = typeof input === 'string' ? input : input.url
    if (url.startsWith('https://notify.test')) {
      // The credential check is a GET carrying nothing. It shares the endpoint
      // with the sends, so the harness has to tell them apart the same way the
      // endpoint does - by the method - or a probe arrives here as a send with
      // no body and takes the pass down on a JSON parse.
      if ((init?.method ?? 'GET') === 'GET') {
        probes.push(url)
        return probe
          ? probe(probes.length)
          : new Response(JSON.stringify({ project: 'root-rise', recipients: 1 }), {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            })
      }
      notified.push(JSON.parse(init.body))
      return notify(notified.length)
    }
    if (url.startsWith('https://records.test')) {
      if ((init?.method ?? 'GET') !== 'GET') written.push(url)
      // The announcement queue is the standing calls nobody has been told
      // about, which is a different question from what is standing.
      const rows = url.includes('notified_at=is.null') ? queue : []
      return new Response(JSON.stringify(rows), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    return feed(url)
  }

  t.after(() => {
    globalThis.fetch = previous.fetch
    console.log = previous.log
    console.warn = previous.warn
    console.error = previous.error
    for (const [name, value] of [
      ['CRON_SECRET', previous.secret],
      ['SUPABASE_URL', previous.url],
      ['SUPABASE_SERVICE_ROLE_KEY', previous.key],
      ['SWEEP_ORIGIN', previous.origin],
      ['SIGNAL_WEBHOOK_URL', previous.hook],
      ['NOTIFY_URL', previous.notifyUrl],
      ['NOTIFY_SECRET', previous.notifySecret],
    ]) {
      if (value === undefined) delete process.env[name]
      else process.env[name] = value
    }
  })

  return { lines, written, notified, probes }
}

test('a sweep that could not reach the feed is a failure, not an empty pass', async (t) => {
  const { lines } = host(t, async () => {
    throw new Error('getaddrinfo ENOTFOUND feed.test')
  })

  const response = recorder()
  await handler(request({ authorization: 'Bearer shibboleth' }), response)

  assert.equal(response.statusCode, 503)
  assert.equal(response.body.ok, false)
  assert.equal(response.body.read, 0)
  assert.equal(response.body.instruments, SWEPT_INSTRUMENTS.length)
  assert.match(response.body.error, /feed\.test/)
  // Every instrument it lost is named with the reason it gave, so the next
  // person does not have to reproduce the pass to find out what happened.
  assert.equal(response.body.unread.length, SWEPT_INSTRUMENTS.length)
  assert.equal(response.body.unread[0].reason, 'unreachable')
  assert.ok(
    lines.some((line) => line.startsWith('sweep ') && line.includes('"ok":false')),
    'the pass wrote down that it failed'
  )
})

test('a sweep that read the market and found nothing is a pass', async (t) => {
  const { lines } = host(t, async (url) => {
    const symbol = decodeURIComponent(url.split('/data/market/')[1].split('?')[0])
    const body = JSON.stringify(flatChart(symbol))
    return new Response(body, { status: 200, headers: { 'Content-Type': 'application/json' } })
  })

  const response = recorder()
  await handler(request({ authorization: 'Bearer shibboleth' }), response)

  assert.equal(response.statusCode, 200)
  assert.equal(response.body.ok, true)
  assert.equal(response.body.read, SWEPT_INSTRUMENTS.length)
  assert.deepEqual(response.body.unread, [])
  assert.deepEqual(response.body.withheld, [])
  assert.equal(response.body.published, 0)
  assert.ok(lines.some((line) => line.startsWith('sweep ') && line.includes('"ok":true')))
})

/**
 * The pass that looks healthiest and is not.
 *
 * A feed serving its own memory answers two hundred with a full series on it,
 * so every instrument is read, `unread` is empty and the body says nine of nine
 * - while the entry the desk would mint is a close that stopped being real
 * hours ago. The read still counts, because standing calls are scored against
 * the bars that did print. What it does not get to do is publish, and what the
 * pass does not get to do is report it as an ordinary clean sweep.
 */
test('a pass reading the feed’s memory reports it rather than publishing from it', async (t) => {
  const { lines } = host(t, async (url) => {
    const symbol = decodeURIComponent(url.split('/data/market/')[1].split('?')[0])
    const payload = flatChart(symbol)
    payload.chart.result[0].meta.stale = true
    payload.chart.result[0].meta.staleSeconds = 1800
    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  })

  const response = recorder()
  await handler(request({ authorization: 'Bearer shibboleth' }), response)

  assert.equal(response.statusCode, 200)
  assert.equal(response.body.read, SWEPT_INSTRUMENTS.length, 'the bars are still read')
  assert.deepEqual(response.body.unread, [], 'and nothing failed, which is the trap')
  assert.equal(response.body.published, 0, 'nothing is minted off a price that is not the tape')
  assert.equal(response.body.withheld.length, SWEPT_INSTRUMENTS.length)
  assert.ok(response.body.withheld.every((held) => held.reason === 'remembered'))
  // A pass carrying a book of memories is not a quiet morning, so it is logged
  // as something worth reading rather than as an ordinary clean sweep.
  assert.ok(lines.some((line) => line.startsWith('sweep ') && line.includes('remembered')))
})

test('a pass writes its heartbeat whether or not it found anything', async (t) => {
  const { written } = host(t, async (url) => {
    const symbol = decodeURIComponent(url.split('/data/market/')[1].split('?')[0])
    return new Response(JSON.stringify(flatChart(symbol)), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  })

  const response = recorder()
  await handler(request({ authorization: 'Bearer shibboleth' }), response)

  assert.equal(response.body.published, 0)
  assert.equal(response.body.heartbeat, 'written')
  assert.ok(
    written.some((url) => url.includes('/sweep_runs')),
    'the pass is recorded even though it published nothing'
  )
})

test('the feed being announced to being switched off is not a successful announcement', async (t) => {
  host(t, async (url) => {
    const symbol = decodeURIComponent(url.split('/data/market/')[1].split('?')[0])
    return new Response(JSON.stringify(flatChart(symbol)), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  })

  const response = recorder()
  await handler(request({ authorization: 'Bearer shibboleth' }), response)
  assert.equal(response.body.announced.configured, false)
})

/** A quiet market the engine can read without finding anything in it. */
const quietFeed = async (url) => {
  const symbol = decodeURIComponent(url.split('/data/market/')[1].split('?')[0])
  return new Response(JSON.stringify(flatChart(symbol)), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

/** A standing call as the table holds it, with nobody yet told about it. */
const unannounced = (overrides = {}) => ({
  id: '9f3c1d20-4a77-4a1e-9a8e-6d2b0c5f1e33',
  fingerprint: 'US30|15m|SELL|BOS|53053.244',
  symbol: 'US30',
  timeframe: '15m',
  side: 'SELL',
  entry: 53414,
  stop: 53561.62,
  target: 53053.244,
  reward_to_risk: 2.44,
  grade: 'B',
  setup: 'BOS',
  reasons: ['Break of structure down on the 1H'],
  emitted_at: new Date().toISOString(),
  venue: 'OANDA',
  status: 'live',
  notified_at: null,
  ...overrides,
})

/**
 * The announcement is no longer tied to the pass that found the call. What a
 * pass sends is what the record says nobody has been told about, so a message
 * lost to one unreachable minute is sent by the pass two minutes later rather
 * than never mentioned again.
 */
test('a standing call nobody has been told about is announced and then marked', async (t) => {
  const { written, notified } = host(t, quietFeed, {
    queue: [unannounced()],
    notify: () =>
      new Response(JSON.stringify({ id: 'N1', delivered: 1, recipients: 1, duplicate: false }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
  })

  const response = recorder()
  await handler(request({ authorization: 'Bearer shibboleth' }), response)

  assert.equal(response.statusCode, 200)
  assert.equal(response.body.published, 0)
  assert.equal(notified.length, 1)
  assert.equal(notified[0].subject, 'B SELL on US30')
  assert.equal(notified[0].idempotency_key, 'signal:9f3c1d20-4a77-4a1e-9a8e-6d2b0c5f1e33')
  assert.equal(response.body.announced.email.sent, 1)
  assert.equal(response.body.announced.stamped, 'written')
  assert.ok(
    written.some((url) => url.includes('/signals') && url.includes('id=in.')),
    'the call is marked as told, so the next pass does not tell it again'
  )
})

/**
 * The record is the product and the message is a convenience on top of it. A
 * pass that found a call, wrote it down and could not get word out has done
 * the part that cannot be recovered from, so it answers as the pass it was and
 * says in its own body and its own log line what did not go out.
 */
test('a notifications endpoint that is down does not fail the sweep', async (t) => {
  const { lines, notified } = host(t, quietFeed, {
    queue: [unannounced()],
    notify: () => new Response('{}', { status: 503 }),
  })

  const response = recorder()
  await handler(request({ authorization: 'Bearer shibboleth' }), response)

  assert.equal(response.statusCode, 200)
  assert.equal(response.body.ok, true)
  assert.equal(response.body.read, SWEPT_INSTRUMENTS.length)
  // Once, and then once more, because an answer that never arrived is not the
  // same as a message that was refused.
  assert.equal(notified.length, 2)
  assert.equal(response.body.announced.email.sent, 0)
  assert.match(response.body.announced.error, /503/)
  // Nothing is marked, so the next pass offers the same call again.
  assert.equal(response.body.announced.stamped, 'skipped')
  assert.ok(
    lines.some((line) => line.startsWith('sweep ') && line.includes('503')),
    'a pass that could not get word out says so in the log'
  )
})

/**
 * The queue is a read of a column that lands with its own migration, so there
 * is a window in which it is not there. A pass in that window announces what
 * it has just written, which is what it did before the queue existed.
 */
test('a record with no queue yet falls back rather than announcing nothing', async (t) => {
  const previous = globalThis.fetch
  const { notified } = host(t, quietFeed, {
    notify: () =>
      new Response(JSON.stringify({ id: 'N1', delivered: 1 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
  })
  const withQueue = globalThis.fetch
  globalThis.fetch = async (input, init) => {
    const url = typeof input === 'string' ? input : input.url
    if (url.includes('notified_at=is.null')) {
      return new Response(
        JSON.stringify({ code: '42703', message: 'column signals.notified_at does not exist' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }
    return withQueue(input, init)
  }
  t.after(() => {
    globalThis.fetch = previous
  })

  const response = recorder()
  await handler(request({ authorization: 'Bearer shibboleth' }), response)

  assert.equal(response.statusCode, 200)
  assert.equal(response.body.announced.outbox, 'unavailable')
  assert.equal(notified.length, 0)
})

/**
 * The failure with no surface of its own.
 *
 * The endpoint holds the digest of a secret and the deployment holds the
 * secret, and they are changed by different hands in different places - a row
 * in a database, and an environment variable Vercel snapshots at deploy time.
 * When they stop agreeing the desk goes on sweeping and the record goes on
 * filling, and the only evidence is an alert that never arrives. So a pass that
 * reads the whole market and cannot be heard is a failed pass, and says so in
 * the one field its only reader can act on.
 */
test('a pass whose credential the endpoint refuses is a failure, not a quiet pass', async (t) => {
  const { lines, probes } = host(
    t,
    async (url) => {
      const symbol = decodeURIComponent(url.split('/data/market/')[1].split('?')[0])
      const body = JSON.stringify(flatChart(symbol))
      return new Response(body, { status: 200, headers: { 'Content-Type': 'application/json' } })
    },
    {
      notify: () => new Response(JSON.stringify({ delivered: 1 }), { status: 200 }),
      probe: () =>
        new Response(JSON.stringify({ error: 'not authorized' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }),
    }
  )

  const response = recorder()
  await handler(request({ authorization: 'Bearer shibboleth' }), response)

  assert.equal(probes.length, 1, 'a quiet pass asks, because a quiet pass is every pass there is')
  assert.equal(response.statusCode, 503)
  assert.equal(response.body.ok, false)
  // The market half was fine, which is exactly why nothing else would have said so.
  assert.equal(response.body.read, SWEPT_INSTRUMENTS.length)
  assert.deepEqual(response.body.unread, [])
  assert.equal(response.body.announced.credential.state, 'refused')
  assert.match(response.body.error, /would not be delivered/)
  assert.ok(
    lines.some((line) => line.startsWith('sweep ') && line.includes('"ok":false')),
    'the heartbeat wrote down that the desk is deaf'
  )
})

test('a healthy credential is checked, reported, and does not fail the pass', async (t) => {
  const { probes } = host(
    t,
    async (url) => {
      const symbol = decodeURIComponent(url.split('/data/market/')[1].split('?')[0])
      const body = JSON.stringify(flatChart(symbol))
      return new Response(body, { status: 200, headers: { 'Content-Type': 'application/json' } })
    },
    { notify: () => new Response(JSON.stringify({ delivered: 1 }), { status: 200 }) }
  )

  const response = recorder()
  await handler(request({ authorization: 'Bearer shibboleth' }), response)

  assert.equal(probes.length, 1)
  assert.equal(response.statusCode, 200)
  assert.equal(response.body.ok, true)
  assert.equal(response.body.announced.credential.state, 'ok')
  assert.equal(response.body.announced.credential.recipients, 1)
})

/**
 * A studio endpoint having a bad minute is not this desk being broken. Turning
 * the pass red for it would teach a reader to ignore the field that matters.
 */
test('an endpoint having a bad minute is reported without failing the pass', async (t) => {
  const { lines } = host(
    t,
    async (url) => {
      const symbol = decodeURIComponent(url.split('/data/market/')[1].split('?')[0])
      const body = JSON.stringify(flatChart(symbol))
      return new Response(body, { status: 200, headers: { 'Content-Type': 'application/json' } })
    },
    {
      notify: () => new Response(JSON.stringify({ delivered: 1 }), { status: 200 }),
      probe: () => new Response(JSON.stringify({ error: 'nope' }), { status: 502 }),
    }
  )

  const response = recorder()
  await handler(request({ authorization: 'Bearer shibboleth' }), response)

  assert.equal(response.statusCode, 200)
  assert.equal(response.body.ok, true)
  assert.equal(response.body.announced.credential.state, 'unreachable')
  assert.ok(
    lines.some((line) => line.startsWith('sweep ') && line.includes('"unreachable"')),
    'it is still written down'
  )
})
