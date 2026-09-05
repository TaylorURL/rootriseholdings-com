import test from 'node:test'
import assert from 'node:assert/strict'
import {
  announce,
  describeForPush,
  notificationFor,
  verifyNotifyCredential,
} from '../api/lib/announce.js'

function signal(overrides = {}) {
  return {
    id: 'S1',
    symbol: 'XAUUSD',
    timeframe: '1H',
    side: 'BUY',
    entry: 4650.123,
    stop: 4640.4,
    target: 4680.9,
    rewardToRisk: 3.1,
    grade: 'A+',
    setup: 'BOS',
    reasons: ['Break of structure up on the 4H', 'Retest held'],
    ...overrides,
  }
}

/** The endpoint's answer to a message it accepted and delivered. */
const accepted = (delivered = 1) => ({
  ok: true,
  status: 200,
  json: async () => ({ id: 'N1', delivered, recipients: delivered, duplicate: false }),
})

/** A notifications endpoint that records what it was asked to send. */
function endpoint(answer = () => accepted()) {
  const posts = []
  return {
    posts,
    fetcher: async (url, init) => {
      posts.push({ url, init, body: JSON.parse(init.body) })
      return answer(posts.length)
    },
  }
}

const mail = (extra = {}) => ({
  url: undefined,
  notifyUrl: 'https://notify.test/api/notify',
  notifySecret: 'secret',
  notifyProject: 'root-rise',
  wait: async () => {},
  ...extra,
})

test('a call reads as an order ticket', () => {
  const line = describeForPush(signal())
  assert.equal(
    line,
    'BUY XAU/USD · A+ BOS · 1H | Entry 4650.12 | Stop 4640.40 | Target 4680.90 | R:R 3.10:1'
  )
})

test('prices print at the instrument’s own precision', () => {
  const line = describeForPush(
    signal({ symbol: 'GBPUSD', entry: 1.35091, stop: 1.34812, target: 1.35887 })
  )
  assert.match(line, /Entry 1\.35091/)
  assert.match(line, /Stop 1\.34812/)
  assert.equal(line.startsWith('BUY GBP/USD'), true)
})

/**
 * The message is read on a lock screen by somebody deciding whether to place
 * an order, so everything the order needs is in it and nothing has to be
 * opened. The two channels render the same call differently and are fed from
 * the same numbers, which is what this pins.
 */
test('the notification carries the whole ticket at the instrument’s precision', () => {
  const notification = notificationFor(
    signal({
      symbol: 'GBPUSD',
      side: 'SELL',
      grade: 'A',
      entry: 1.35091,
      stop: 1.35412,
      target: 1.34295,
    }),
    { link: 'https://desk.test/app/signals' }
  )
  assert.equal(notification.subject, 'A SELL on GBP/USD')
  assert.deepEqual(notification.lines, [
    ['Instrument', 'GBP/USD'],
    ['Side', 'SELL'],
    ['Grade', 'A'],
    ['Setup', 'BOS'],
    ['Timeframe', '1H'],
    ['Entry', '1.35091'],
    ['Stop', '1.35412'],
    ['Target', '1.34295'],
    ['R:R', '3.10:1'],
  ])
  assert.equal(notification.body, 'Break of structure up on the 4H\nRetest held')
  assert.deepEqual(notification.link, { url: 'https://desk.test/app/signals' })
  assert.equal(notification.idempotency_key, 'signal:S1')
})

/**
 * The grade decides whether the message carries the headers a phone treats as
 * urgent, and an A+ is the one the desk exists to catch. Nothing published is
 * `info`: that is where the daily briefing sits.
 */
test('an A+ asks to break through and the rest do not', () => {
  assert.equal(notificationFor(signal({ grade: 'A+' })).severity, 'urgent')
  assert.equal(notificationFor(signal({ grade: 'A' })).severity, 'warning')
  assert.equal(notificationFor(signal({ grade: 'B' })).severity, 'warning')
})

/**
 * The record's own id is what makes a retry a retry. An id carrying anything
 * the endpoint's key format refuses would be rejected as a malformed request,
 * which is a 4xx and therefore never retried - so the alert would be lost by
 * the very mechanism meant to save it.
 */
test('the idempotency key is the record’s id in the shape the endpoint takes', () => {
  const key = notificationFor(
    signal({ id: '9f3c1d20-4a77-4a1e-9a8e-6d2b0c5f1e33' })
  ).idempotency_key
  assert.equal(key, 'signal:9f3c1d20-4a77-4a1e-9a8e-6d2b0c5f1e33')
  const messy = notificationFor(signal({ id: 'XAUUSD|1H|BUY' })).idempotency_key
  assert.match(messy, /^signal:[A-Za-z0-9:_.-]{1,200}$/)
})

/**
 * Both of these send nothing and both are fine, and only one of them means the
 * desk cannot reach anybody. Reporting them identically is how a delivery path
 * stays switched off while every pass reports success, so the difference is
 * pinned here.
 */
test('a host with nowhere to announce to says so rather than reporting a quiet pass', async () => {
  let called = false
  const result = await announce([signal()], {
    url: undefined,
    notifySecret: undefined,
    fetcher: () => {
      called = true
    },
  })
  assert.equal(called, false)
  assert.equal(result.configured, false)
  assert.equal(result.sent, 0)
  assert.equal(result.email.configured, false)
  assert.equal(result.webhook.configured, false)
})

test('nothing is posted when the sweep found nothing', async () => {
  let called = false
  const result = await announce([], {
    url: 'https://example.invalid/hook',
    notifySecret: undefined,
    fetcher: () => {
      called = true
    },
  })
  assert.equal(called, false)
  assert.equal(result.sent, 0)
  assert.equal(result.configured, true)
})

test('a call is posted in a shape either kind of receiver reads', async () => {
  let body = null
  const result = await announce([signal()], {
    url: 'https://example.invalid/hook',
    notifySecret: undefined,
    fetcher: async (_url, init) => {
      body = JSON.parse(init.body)
      return { ok: true, status: 204 }
    },
  })
  assert.equal(result.sent, 1)
  assert.equal(body.content, body.text)
  assert.match(body.content, /BUY XAU\/USD/)
})

/**
 * The request this repository sends is the contract the endpoint was built
 * against, and neither side can see the other's code. Everything the far end
 * reads to decide who is reached, what it is drawn as and whether it has seen
 * this message before is asserted here.
 */
test('the endpoint is called exactly as it was specified', async () => {
  const { posts, fetcher } = endpoint()
  const result = await announce([signal({ id: 'row-1' })], mail({ fetcher }))

  assert.equal(posts.length, 1)
  const [post] = posts
  assert.equal(post.url, 'https://notify.test/api/notify')
  assert.equal(post.init.method, 'POST')
  assert.equal(post.init.headers['Content-Type'], 'application/json')
  assert.equal(post.init.headers.Authorization, 'Bearer secret')
  assert.equal(post.init.headers['X-Notify-Project'], 'root-rise')
  assert.equal(post.body.subject, 'A+ BUY on XAU/USD')
  assert.equal(post.body.severity, 'urgent')
  assert.equal(post.body.idempotency_key, 'signal:row-1')
  assert.equal(post.body.link.url, 'https://www.rootriseholdings.com/app/signals')
  assert.equal(post.body.lines.length, 9)

  assert.equal(result.email.sent, 1)
  assert.deepEqual(result.delivered, ['row-1'])
})

/** One message per call, so a half-delivered digest cannot exist. */
test('each call is its own message under its own key', async () => {
  const { posts, fetcher } = endpoint()
  const result = await announce([signal({ id: 'a' }), signal({ id: 'b' })], mail({ fetcher }))
  assert.equal(posts.length, 2)
  assert.deepEqual(
    posts.map((post) => post.body.idempotency_key),
    ['signal:a', 'signal:b']
  )
  assert.deepEqual(result.delivered, ['a', 'b'])
})

/**
 * A phone that buzzes twelve times is worse than one that buzzes four and says
 * so, and a sweep publishing a dozen at once is more likely a fault than a
 * morning. What is held back is not lost: it is still unannounced on the
 * record, so the next pass carries it.
 */
test('a flood is capped and the remainder is counted', async () => {
  let body = null
  const many = Array.from({ length: 7 }, (_, index) => signal({ id: `S${index}` }))
  const result = await announce(many, {
    url: 'https://example.invalid/hook',
    notifySecret: undefined,
    fetcher: async (_url, init) => {
      body = JSON.parse(init.body)
      return { ok: true, status: 204 }
    },
  })
  assert.equal(result.sent, 4)
  assert.equal(result.held, 3)
  assert.match(body.content, /3 more not shown/)
})

test('the cap holds on the mail channel too', async () => {
  const { posts, fetcher } = endpoint()
  const many = Array.from({ length: 7 }, (_, index) => signal({ id: `S${index}` }))
  const result = await announce(many, mail({ fetcher }))
  assert.equal(posts.length, 4)
  assert.equal(result.held, 3)
  assert.equal(result.delivered.length, 4)
})

test('a refused webhook is reported and never thrown', async () => {
  const result = await announce([signal()], {
    url: 'https://example.invalid/hook',
    notifySecret: undefined,
    fetcher: async () => ({ ok: false, status: 500 }),
  })
  assert.equal(result.sent, 0)
  assert.equal(result.error, 'webhook answered 500')
})

test('an unreachable webhook is reported and never thrown', async () => {
  const result = await announce([signal()], {
    url: 'https://example.invalid/hook',
    notifySecret: undefined,
    fetcher: async () => {
      throw new Error('getaddrinfo ENOTFOUND')
    },
  })
  assert.equal(result.sent, 0)
  assert.match(result.error, /ENOTFOUND/)
})

/**
 * The whole point of the module: the message is a convenience on top of the
 * record, and the record is the product. Nothing the far end does may reach
 * the pass that found the call.
 */
test('a notifications endpoint that is down does not fail the announcement', async () => {
  const refused = await announce(
    [signal()],
    mail({ fetcher: async () => ({ ok: false, status: 502 }) })
  )
  assert.equal(refused.sent, 0)
  assert.equal(refused.email.failed, 1)
  assert.match(refused.error, /502/)
  assert.deepEqual(refused.delivered, [])

  const unreachable = await announce(
    [signal()],
    mail({
      fetcher: async () => {
        throw new Error('getaddrinfo ENOTFOUND notify.test')
      },
    })
  )
  assert.equal(unreachable.sent, 0)
  assert.match(unreachable.error, /ENOTFOUND/)
  assert.deepEqual(unreachable.delivered, [])

  const malformed = await announce(
    [signal()],
    mail({
      fetcher: async () => ({
        ok: true,
        status: 200,
        json: async () => {
          throw new Error('not json')
        },
      }),
    })
  )
  assert.equal(malformed.sent, 0)
  assert.match(malformed.error, /reached nobody/)
})

/**
 * A call that reached nobody must stay unstamped, or the outbox marks it as
 * told and the alert is lost for good - which is the failure the outbox was
 * added to end.
 */
test('a call nothing carried is not marked as announced, and is named', async () => {
  const result = await announce(
    [signal({ id: 'row-1' })],
    mail({ fetcher: async () => ({ ok: false, status: 400 }) })
  )
  assert.deepEqual(result.delivered, [])
  // Somebody asking later why a call on the record never reached them is the
  // only reader of this, and a count would not answer them.
  assert.deepEqual(result.email.unsent, [
    {
      key: 'signal:row-1',
      subject: 'A+ BUY on XAU/USD',
      error: 'the notifications endpoint answered 400',
    },
  ])
})

/** Five hundreds are the far end having a moment; four hundreds are this side being wrong. */
test('the far end failing is retried once, and being refused is not', async () => {
  let attempts = 0
  const flaky = await announce(
    [signal({ id: 'row-1' })],
    mail({
      fetcher: async (url, init) => {
        attempts += 1
        if (attempts === 1) return { ok: false, status: 503 }
        return {
          ok: true,
          status: 200,
          json: async () => ({ id: JSON.parse(init.body).idempotency_key, delivered: 1 }),
        }
      },
    })
  )
  assert.equal(attempts, 2)
  assert.deepEqual(flaky.delivered, ['row-1'])

  let refusals = 0
  const refused = await announce(
    [signal()],
    mail({
      fetcher: async () => {
        refusals += 1
        return { ok: false, status: 401 }
      },
    })
  )
  assert.equal(refusals, 1)
  assert.match(refused.error, /401/)
})

/**
 * A retry that lands twice would buzz a phone twice, so the second attempt
 * carries the same key and the endpoint refuses it. A refusal on that ground
 * is a success: the message went.
 */
test('a retry carries the same key and a duplicate counts as delivered', async () => {
  const keys = []
  const result = await announce(
    [signal({ id: 'row-1' })],
    mail({
      fetcher: async (_url, init) => {
        keys.push(JSON.parse(init.body).idempotency_key)
        if (keys.length === 1) throw new Error('socket hang up')
        return {
          ok: true,
          status: 200,
          json: async () => ({ id: 'N1', duplicate: true, delivered: 0 }),
        }
      },
    })
  )
  assert.deepEqual(keys, ['signal:row-1', 'signal:row-1'])
  assert.deepEqual(result.delivered, ['row-1'])
  assert.equal(result.email.sent, 1)
})

/**
 * A two hundred that reached nobody is the exact shape of the complaint this
 * path exists to answer, so it is a failure here whatever the status says.
 */
test('an accepted message that reached nobody is not a delivery', async () => {
  const result = await announce(
    [signal({ id: 'row-1' })],
    mail({
      fetcher: async () => ({
        ok: true,
        status: 200,
        json: async () => ({
          id: 'N1',
          recipients: 0,
          delivered: 0,
          duplicate: false,
          reason: 'no recipient takes a notification at this level',
        }),
      }),
    })
  )
  assert.equal(result.sent, 0)
  assert.deepEqual(result.delivered, [])
  assert.match(result.error, /no recipient takes a notification at this level/)
})

/**
 * Two receivers of one announcement. The webhook is not removed to make room
 * for mail, and the stamp follows mail, because mail is the channel that
 * reaches somebody with every tab closed.
 */
test('both channels carry the call and the stamp follows the mail', async () => {
  const posts = []
  const result = await announce([signal({ id: 'row-1' })], {
    url: 'https://example.invalid/hook',
    notifyUrl: 'https://notify.test/api/notify',
    notifySecret: 'secret',
    wait: async () => {},
    fetcher: async (url) => {
      posts.push(url)
      if (url.startsWith('https://notify.test')) return { ok: false, status: 500 }
      return { ok: true, status: 204, json: async () => ({}) }
    },
  })
  assert.equal(posts.filter((url) => url.startsWith('https://notify.test')).length, 2)
  assert.equal(posts.filter((url) => url === 'https://example.invalid/hook').length, 1)
  assert.equal(result.webhook.sent, 1)
  assert.equal(result.email.sent, 0)
  // It reached a receiver, and it did not reach the reader, and both are true.
  assert.equal(result.sent, 1)
  assert.deepEqual(result.delivered, [])
})

/** A host with only a webhook is not held back by a mail channel it does not have. */
test('a host with no mail secret stamps on what the webhook carried', async () => {
  const result = await announce([signal({ id: 'row-1' })], {
    url: 'https://example.invalid/hook',
    notifySecret: undefined,
    fetcher: async () => ({ ok: true, status: 204 }),
  })
  assert.deepEqual(result.delivered, ['row-1'])
})

/**
 * The queue is the mail channel's to retry, and the webhook has to stay out of
 * it.
 *
 * Before the outbox, a webhook saw each call exactly once - the pass that
 * minted it. It now sees whatever the record has not stamped, and the record
 * cannot stamp a call the mail channel is failing on, so a persistently refused
 * endpoint turned one setup into a message every two minutes until the call
 * expired. At the coarsest timeframe the desk publishes that is five days of
 * the same alarm, and the receiver stops being read long before then.
 */
test('the webhook carries what the pass found and not what the queue is retrying', async () => {
  const posts = []
  const queued = signal({ id: 'OLD' })
  const minted = signal({ id: 'NEW' })

  const outcome = await announce([queued, minted], {
    ...mail(),
    url: 'https://hooks.test/desk',
    fresh: [minted],
    fetcher: async (url, init) => {
      posts.push({ url, body: JSON.parse(init.body) })
      if (url === 'https://hooks.test/desk') return { ok: true, status: 200 }
      return { ok: false, status: 401, json: async () => ({}) }
    },
  })

  const hook = posts.filter((post) => post.url === 'https://hooks.test/desk')
  assert.equal(hook.length, 1, 'the webhook is posted once')
  assert.ok(hook[0].body.content.includes('4650.12'), 'the call it carries is the new one')
  assert.equal(outcome.webhook.sent, 1, 'only the fresh call is counted as carried')

  // Both are still offered to the mail channel, which is the half that can
  // safely be handed the same key twice.
  assert.equal(posts.filter((post) => post.url !== 'https://hooks.test/desk').length, 2)
  assert.deepEqual(outcome.delivered, [], 'a mail failure still stamps nothing')
})

/**
 * A pass whose whole outbox is already in flight elsewhere has nothing new for
 * the webhook, and posting an empty digest to it would be a message saying
 * nothing.
 */
test('a pass with nothing newly minted posts no webhook at all', async () => {
  const posts = []
  const outcome = await announce([signal({ id: 'OLD' })], {
    ...mail(),
    url: 'https://hooks.test/desk',
    fresh: [],
    fetcher: async (url) => {
      posts.push(url)
      if (url === 'https://hooks.test/desk') return { ok: true, status: 200 }
      return { ok: false, status: 401, json: async () => ({}) }
    },
  })
  assert.equal(posts.filter((url) => url === 'https://hooks.test/desk').length, 0)
  assert.equal(outcome.webhook.sent, 0)
})

/**
 * Where there is no mail channel the webhook is the channel of record, so the
 * queue is exactly its to drain and the record's own stamp is what retires a
 * call. Splitting it off there would leave a call unstamped forever.
 */
test('a webhook-only host still drains the queue and stamps what it carried', async () => {
  const posts = []
  const outcome = await announce([signal({ id: 'OLD' }), signal({ id: 'NEW' })], {
    url: 'https://hooks.test/desk',
    notifySecret: undefined,
    notifyUrl: undefined,
    fresh: [signal({ id: 'NEW' })],
    wait: async () => {},
    fetcher: async (url, init) => {
      posts.push(JSON.parse(init.body))
      return { ok: true, status: 200 }
    },
  })
  assert.equal(posts.length, 1)
  assert.deepEqual(
    outcome.delivered,
    ['OLD', 'NEW'],
    'both are stamped by the only channel there is'
  )
})

/**
 * The credential check is the guard against the one failure that leaves every
 * other surface reading healthy: the endpoint holding one secret and the
 * deployment holding another. It has to mail nobody to run, and it has to tell
 * a refusal apart from a bad minute, because only the first is this desk's
 * fault and only the first should turn a pass red.
 */
test('a credential the endpoint accepts reads ok and carries the recipient count', async () => {
  const asked = []
  const outcome = await verifyNotifyCredential({
    url: 'https://studio.test/api/notify',
    project: 'root-rise',
    secret: 'live-secret',
    fetcher: async (url, init) => {
      asked.push({ url, init })
      return { ok: true, status: 200, json: async () => ({ project: 'root-rise', recipients: 2 }) }
    },
  })
  assert.equal(asked.length, 1)
  assert.equal(asked[0].init.method, 'GET', 'a check that posts is a check that could send')
  assert.equal(asked[0].init.headers.Authorization, 'Bearer live-secret')
  assert.equal(asked[0].init.headers['X-Notify-Project'], 'root-rise')
  assert.equal(outcome.state, 'ok')
  assert.equal(outcome.recipients, 2)
  assert.equal(outcome.error, null)
})

test('a stale secret reads refused and says an alert would not arrive', async () => {
  const outcome = await verifyNotifyCredential({
    url: 'https://studio.test/api/notify',
    project: 'root-rise',
    secret: 'the-old-one',
    fetcher: async () => ({
      ok: false,
      status: 401,
      json: async () => ({ error: 'not authorized' }),
    }),
  })
  assert.equal(outcome.state, 'refused')
  assert.equal(outcome.status, 401)
  assert.match(outcome.error, /would not be delivered/)
})

/**
 * A studio endpoint having a bad minute is not this desk being broken, and a
 * guard that cannot tell the two apart is one that cries wolf until it is
 * ignored.
 */
test('an endpoint that is merely unwell reads unreachable rather than refused', async () => {
  const answered = await verifyNotifyCredential({
    url: 'https://studio.test/api/notify',
    secret: 'live-secret',
    fetcher: async () => ({ ok: false, status: 502, json: async () => ({}) }),
  })
  assert.equal(answered.state, 'unreachable')

  const threw = await verifyNotifyCredential({
    url: 'https://studio.test/api/notify',
    secret: 'live-secret',
    fetcher: async () => {
      throw new Error('socket hang up')
    },
  })
  assert.equal(threw.state, 'unreachable')
  assert.match(threw.error, /socket hang up/)
})

test('a host holding no secret reads unconfigured and asks nothing', async () => {
  let asked = 0
  const outcome = await verifyNotifyCredential({
    url: 'https://studio.test/api/notify',
    secret: undefined,
    fetcher: async () => {
      asked += 1
      return { ok: true, status: 200, json: async () => ({}) }
    },
  })
  assert.equal(asked, 0)
  assert.equal(outcome.state, 'unconfigured')
})
