import test from 'node:test'
import assert from 'node:assert/strict'
import { announce, describeForPush } from '../api/lib/announce.js'

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
    ...overrides,
  }
}

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

test('nothing is posted when no webhook is configured', async () => {
  let called = false
  const result = await announce([signal()], {
    url: undefined,
    fetcher: () => {
      called = true
    },
  })
  assert.equal(called, false)
  assert.deepEqual(result, { sent: 0, held: 0, error: null })
})

test('nothing is posted when the sweep found nothing', async () => {
  let called = false
  const result = await announce([], {
    url: 'https://example.invalid/hook',
    fetcher: () => {
      called = true
    },
  })
  assert.equal(called, false)
  assert.equal(result.sent, 0)
})

test('a call is posted in a shape either kind of receiver reads', async () => {
  let body = null
  const result = await announce([signal()], {
    url: 'https://example.invalid/hook',
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
 * A phone that buzzes twelve times is worse than one that buzzes four and says
 * so, and a sweep publishing a dozen at once is more likely a fault than a
 * morning.
 */
test('a flood is capped and the remainder is counted', async () => {
  let body = null
  const many = Array.from({ length: 7 }, (_, index) => signal({ id: `S${index}` }))
  const result = await announce(many, {
    url: 'https://example.invalid/hook',
    fetcher: async (_url, init) => {
      body = JSON.parse(init.body)
      return { ok: true, status: 204 }
    },
  })
  assert.equal(result.sent, 4)
  assert.equal(result.held, 3)
  assert.match(body.content, /3 more not shown/)
})

test('a refused webhook is reported and never thrown', async () => {
  const result = await announce([signal()], {
    url: 'https://example.invalid/hook',
    fetcher: async () => ({ ok: false, status: 500 }),
  })
  assert.equal(result.sent, 0)
  assert.equal(result.error, 'webhook answered 500')
})

test('an unreachable webhook is reported and never thrown', async () => {
  const result = await announce([signal()], {
    url: 'https://example.invalid/hook',
    fetcher: async () => {
      throw new Error('getaddrinfo ENOTFOUND')
    },
  })
  assert.equal(result.sent, 0)
  assert.match(result.error, /ENOTFOUND/)
})
