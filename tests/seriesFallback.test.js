import test from 'node:test'
import assert from 'node:assert/strict'
import {
  clearSeriesCache,
  foldBars,
  normalizeBars,
  readFallbackSeries,
  toSeriesPayload,
  tradeTimeToEpoch,
} from '../api/lib/seriesFallback.js'
import { FALLBACK_SYMBOLS } from '../api/lib/quoteFallback.js'
import { toCandles } from '../src/lib/marketData/chartFeed.js'

const bar = (tradeTime, close, overrides = {}) => ({
  tradeTime,
  open: String(close),
  high: String(close + 1),
  low: String(close - 1),
  close: String(close),
  volume: '10',
  ...overrides,
})

const respondWith = (rows) => async () => ({
  ok: true,
  json: async () => ({ data: { chartData: { priceBars: rows } } }),
})

test('a summer stamp reads as New York daylight time', () => {
  // 2026-08-25 09:30 in New York is 13:30 UTC, four hours on.
  assert.equal(tradeTimeToEpoch('20260825093000'), Date.UTC(2026, 7, 25, 13, 30))
})

test('a winter stamp reads as New York standard time', () => {
  // The same wall clock in January is five hours on rather than four.
  assert.equal(tradeTimeToEpoch('20260112093000'), Date.UTC(2026, 0, 12, 14, 30))
})

test('a stamp that is not the venue shape is no time', () => {
  assert.equal(tradeTimeToEpoch('2026-08-25'), null)
  assert.equal(tradeTimeToEpoch(20260825093000), null)
  assert.equal(tradeTimeToEpoch(undefined), null)
})

test('bars come back oldest first, and a holed bar is dropped', () => {
  const bars = normalizeBars([
    bar('20260825093500', 7683),
    bar('20260825093000', 7676),
    bar('20260825094000', 7690, { close: undefined }),
    bar('20260825094500', 7695, { low: 'n/a' }),
  ])
  assert.equal(bars.length, 2)
  assert.deepEqual(
    bars.map((entry) => entry.close),
    [7676, 7683]
  )
})

test('grouped prices parse the way the venue formats them', () => {
  const [only] = normalizeBars([bar('20260825093000', 0, { open: '7,676.66', close: '7,682.09' })])
  assert.equal(only.open, 7676.66)
  assert.equal(only.close, 7682.09)
})

test('folding takes the opening, closing and extreme prices of a group', () => {
  const bars = normalizeBars([
    bar('20260825093000', 100),
    bar('20260825093500', 120),
    bar('20260825094000', 110),
    bar('20260825094500', 130),
  ])
  const folded = foldBars(bars, 15 * 60_000)
  assert.equal(folded.length, 2)
  assert.equal(folded[0].open, 100)
  assert.equal(folded[0].close, 110)
  assert.equal(folded[0].high, 121)
  assert.equal(folded[0].low, 99)
  assert.equal(folded[0].volume, 30)
  assert.equal(folded[1].close, 130)
})

test('folding to a null bucket leaves the series alone', () => {
  const bars = normalizeBars([bar('20260825000000', 100), bar('20260826000000', 110)])
  assert.deepEqual(foldBars(bars, null), bars)
})

test('bucket boundaries come off the clock, not off the first bar', () => {
  const bars = normalizeBars([bar('20260825093500', 100), bar('20260825094500', 120)])
  const folded = foldBars(bars, 15 * 60_000)
  for (const entry of folded) assert.equal(entry.time % (15 * 60_000), 0)
})

test('every instrument the desk reads is mapped for the series venue', async () => {
  for (const ticker of Object.keys(FALLBACK_SYMBOLS)) {
    clearSeriesCache()
    const bars = await readFallbackSeries(
      ticker,
      '15m',
      respondWith([bar('20260825093000', 100), bar('20260825094500', 110)])
    )
    assert.ok(bars, `${ticker} is unserved`)
  }
})

test('an interval the venue cannot fold to is not its request to serve', async () => {
  clearSeriesCache()
  assert.equal(await readFallbackSeries('^GSPC', '1wk', respondWith([])), null)
  assert.equal(await readFallbackSeries('BTC=X', '15m', respondWith([])), null)
})

test('one bar is a price rather than a series', async () => {
  clearSeriesCache()
  const bars = await readFallbackSeries('^GSPC', '15m', respondWith([bar('20260825093000', 100)]))
  assert.equal(bars, null)
})

test('a refusing venue is no series', async () => {
  clearSeriesCache()
  const refused = async () => ({ ok: false, json: async () => ({}) })
  assert.equal(await readFallbackSeries('^GSPC', '15m', refused), null)
  const threw = async () => {
    throw new Error('unreachable')
  }
  assert.equal(await readFallbackSeries('^GSPC', '15m', threw), null)
})

test('a read inside the window does not go back upstream', async () => {
  clearSeriesCache()
  let calls = 0
  const counted = async (...args) => {
    calls += 1
    return respondWith([bar('20260825093000', 100), bar('20260825094500', 110)])(...args)
  }
  await readFallbackSeries('^GSPC', '15m', counted)
  await readFallbackSeries('^GSPC', '15m', counted)
  assert.equal(calls, 1)
})

test('the payload is the chart shape the surfaces already read', async () => {
  clearSeriesCache()
  const bars = await readFallbackSeries(
    'GC=F',
    '15m',
    respondWith([bar('20260825093000', 4600), bar('20260825094500', 4620)])
  )
  const payload = toSeriesPayload(bars, 'GC=F')
  const result = payload.chart.result[0]
  assert.equal(result.meta.symbol, 'GC=F')
  assert.equal(result.meta.exchangeName, 'Gold Spot')
  assert.equal(result.meta.regularMarketPrice, 4620)
  assert.equal(result.meta.chartPreviousClose, 4600)

  const candles = toCandles(result)
  assert.equal(candles.length, 2)
  assert.equal(candles[0].close, 4600)
  assert.equal(candles[1].close, 4620)
  assert.equal(candles[0].time, tradeTimeToEpoch('20260825093000'))
})
