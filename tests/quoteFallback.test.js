import test from 'node:test'
import assert from 'node:assert/strict'
import {
  FALLBACK_SYMBOLS,
  clearFallbackCache,
  normalizeQuote,
  readFallbackQuotes,
  toQuotePayload,
} from '../api/lib/quoteFallback.js'
import { fetchQuote, toCandles } from '../src/lib/marketData/chartFeed.js'

const row = (overrides = {}) => ({
  symbol: 'XAU=',
  last: '4,629.80',
  previous_day_closing: '4,592.032',
  high: '4,642.08',
  low: '4,605.19',
  last_time: '2026-08-26T16:39:00.000-0400',
  ...overrides,
})

test('grouped prices parse, and the venue is named', () => {
  const quote = normalizeQuote(row())
  assert.equal(quote.price, 4629.8)
  assert.equal(quote.previousClose, 4592.032)
  assert.equal(quote.high, 4642.08)
  assert.equal(quote.low, 4605.19)
  assert.equal(quote.venue, 'Gold Spot')
  assert.equal(typeof quote.at, 'number')
})

test('a row with no price is no quote', () => {
  assert.equal(normalizeQuote(row({ last: undefined })), null)
  assert.equal(normalizeQuote(row({ last: 'UNCH' })), null)
  assert.equal(normalizeQuote(null), null)
})

test('a missing extreme stays absent rather than becoming a number', () => {
  const quote = normalizeQuote(row({ high: undefined, previous_day_closing: 'n/a' }))
  assert.equal(quote.high, null)
  assert.equal(quote.previousClose, null)
  assert.equal(quote.price, 4629.8)
})

test('a zero extreme is a missing extreme rather than a price of zero', () => {
  // Silver answers its session extremes as 0.00 for hours at a stretch, and a
  // zero that reads as a number is a hole nothing downstream reaches past.
  const quote = normalizeQuote(row({ symbol: 'XAG=', last: '64.0481', high: '0.00', low: '0.00' }))
  assert.equal(quote.high, null)
  assert.equal(quote.low, null)
  assert.equal(quote.price, 64.0481)
})

test('a zero price is no quote at all', () => {
  assert.equal(normalizeQuote(row({ last: '0.00' })), null)
  assert.equal(normalizeQuote(row({ last: 0 })), null)
})

test('a payload with no extremes says so rather than saying zero', async () => {
  const payload = toQuotePayload(normalizeQuote(row({ high: '0.00', low: '0.00' })), 'XAG=')
  assert.equal(payload.chart.result[0].meta.regularMarketDayHigh, null)
  const original = globalThis.fetch
  globalThis.fetch = async () => ({ ok: true, json: async () => payload })
  try {
    const quote = await fetchQuote('SI=F')
    assert.equal(quote.high, null)
    assert.equal(quote.low, null)
  } finally {
    globalThis.fetch = original
  }
})

test('every registry ticker the desk reads has a venue name', () => {
  for (const ticker of ['GC=F', '^GSPC', '^NDX', '^DJI', 'JPY=X', 'NZDUSD=X', 'NZDJPY=X']) {
    assert.ok(FALLBACK_SYMBOLS[ticker], `${ticker} is unmapped`)
  }
})

test('one request answers the whole desk', async () => {
  clearFallbackCache()
  let calls = 0
  const quotes = await readFallbackQuotes(async () => {
    calls += 1
    return {
      ok: true,
      json: async () => ({
        FormattedQuoteResult: {
          FormattedQuote: [row(), row({ symbol: '.SPX', last: '7,675.70' })],
        },
      }),
    }
  })
  assert.equal(calls, 1)
  assert.equal(quotes['GC=F'].price, 4629.8)
  assert.equal(quotes['^GSPC'].price, 7675.7)
})

test('an unreachable venue yields nothing rather than a guess', async () => {
  clearFallbackCache()
  assert.deepEqual(await readFallbackQuotes(async () => ({ ok: false })), {})
  clearFallbackCache()
  assert.deepEqual(
    await readFallbackQuotes(async () => {
      throw new Error('offline')
    }),
    {}
  )
})

test('the payload prices a quote and refuses to pass as a series', () => {
  const payload = toQuotePayload(normalizeQuote(row()), 'XAU=')
  const result = payload.chart.result[0]
  assert.equal(result.meta.regularMarketPrice, 4629.8)
  assert.equal(result.meta.fullExchangeName, 'Gold Spot')
  assert.deepEqual(toCandles(result), [], 'no bar is invented from a single price')
})

test('the client reads a fallback payload as a real quote', async () => {
  const payload = toQuotePayload(normalizeQuote(row()), 'XAU=')
  const original = globalThis.fetch
  globalThis.fetch = async () => ({ ok: true, json: async () => payload })
  try {
    const quote = await fetchQuote('GC=F')
    assert.equal(quote.price, 4629.8)
    assert.equal(quote.exchange, 'Gold Spot')
    assert.ok(quote.change > 0)
    assert.deepEqual(quote.intraday, [])
  } finally {
    globalThis.fetch = original
  }
})
