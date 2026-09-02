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
import { fetchQuote, toCandles } from '../src/lib/marketData/chartFeed.js'

const bar = (tradeTime, close, overrides = {}) => ({
  tradeTime,
  open: String(close),
  high: String(close + 1),
  low: String(close - 1),
  close: String(close),
  volume: '10',
  ...overrides,
})

/**
 * A row shaped the way the venue sends a bar, padded to a fixed decimal width.
 * The padding is what separates a bar from the quote row spliced after it, so
 * these rows carry it and the quote rows below deliberately do not.
 */
const padded = (tradeTime, open, high, low, close) => ({
  tradeTime,
  open,
  high,
  low,
  close,
  volume: '0',
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

test('the session row the venue splices on is not measured as a candle', () => {
  // Gold's live tail, quote row and all: a whole session's range printed where
  // the next five-minute bar belongs, which is a candle that touches every
  // level a signal named.
  const bars = normalizeBars([
    padded('20260901203000', '4325.3400', '4325.3400', '4320.6200', '4320.6200'),
    padded('20260901203500', '4322.1500', '4328.7603', '4322.1500', '4326.7800'),
    padded('20260901204000', '4452.57', '4452.64', '4319.42', '4329.48'),
  ])
  assert.equal(bars.length, 2)
  assert.equal(bars[bars.length - 1].close, 4326.78)
  assert.ok(
    bars.every((entry) => entry.high - entry.low < 10),
    'a session-wide range survived as a five-minute bar'
  )
})

test('a final bar printed the way the series is stays in it', () => {
  const bars = normalizeBars([
    padded('20260901203000', '4325.3400', '4325.3400', '4320.6200', '4320.6200'),
    padded('20260901203500', '4322.1500', '4328.7603', '4322.1500', '4326.7800'),
    padded('20260901204000', '4326.7800', '4331.0000', '4326.0000', '4330.5000'),
  ])
  assert.equal(bars.length, 3)
  assert.equal(bars[2].close, 4330.5)
})

test('a final bar is kept for how it was printed, not for how far it ranged', () => {
  // The bar that takes a session apart is the one the desk most needs, so the
  // test of a bar is never the size of it.
  const bars = normalizeBars([
    padded('20260901203000', '4325.3400', '4325.3400', '4320.6200', '4320.6200'),
    padded('20260901203500', '4322.1500', '4328.7603', '4322.1500', '4326.7800'),
    padded('20260901204000', '4326.7800', '4402.1900', '4290.4400', '4295.0100'),
  ])
  assert.equal(bars.length, 3)
  assert.equal(bars[2].high, 4402.19)
  assert.equal(bars[2].low, 4290.44)
})

test('a daily session row repeats the day it summarises and is dropped', () => {
  // The venue pads this one like a bar, so nothing but the stamp gives it away.
  const bars = normalizeBars([
    padded('20260831000000', '4452.9585', '4469.7900', '4401.1900', '4448.3477'),
    padded('20260901000000', '4448.5098', '4460.6900', '4322.6900', '4327.4868'),
    padded('20260901000000', '4452.5700', '4452.6400', '4319.4200', '4330.4800'),
  ])
  assert.equal(bars.length, 2)
  assert.equal(bars[1].close, 4327.4868)
})

test('a zero price is a missing price rather than a price of zero', () => {
  // Silver's extremes answer as 0.00 for hours at a stretch.
  const bars = normalizeBars([
    padded('20260901202800', '64.1201', '64.1716', '64.0392', '64.1613'),
    padded('20260901203300', '64.1566', '64.2183', '64.0534', '64.2083'),
    padded('20260901203800', '64.5903', '0.00', '0.00', '64.2318'),
  ])
  assert.equal(bars.length, 2)
  assert.ok(bars.every((entry) => entry.high > 0 && entry.low > 0))
})

test('a bar that traded nothing keeps the zero it traded', () => {
  const [only] = normalizeBars([
    padded('20260901203300', '64.1566', '64.2183', '64.0534', '64.2083'),
  ])
  assert.equal(only.volume, 0)
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

  const candles = toCandles(result)
  assert.equal(candles.length, 2)
  assert.equal(candles[0].close, 4600)
  assert.equal(candles[1].close, 4620)
  assert.equal(candles[0].time, tradeTimeToEpoch('20260825093000'))
})

/** Two New York days of sterling, the older one wider than the newer. */
const twoSessions = [
  padded('20260831180000', '1.3600', '1.3655', '1.3590', '1.3600'),
  padded('20260901100000', '1.3539', '1.3552', '1.3520', '1.3530'),
  padded('20260901180000', '1.3530', '1.3540', '1.3503', '1.3509'),
  padded('20260901203400', '1.3508', '1.3510', '1.3506', '1.3509'),
]

test('the day range is the session, not the last bar and not the whole read', () => {
  const meta = toSeriesPayload(normalizeBars(twoSessions), 'GBPUSD=X').chart.result[0].meta
  assert.equal(meta.regularMarketDayHigh, 1.3552)
  assert.equal(meta.regularMarketDayLow, 1.3503)
  assert.notEqual(meta.regularMarketDayHigh, 1.351, 'the last bar stood in for the session')
  assert.notEqual(meta.regularMarketDayHigh, 1.3655, 'the previous session was counted in')
})

/**
 * The day's change is the figure a trader checks against their platform first,
 * so it is measured against the previous session's close and not against the
 * bar before the last one, which on an intraday series is five minutes ago.
 */
test('the change is measured against the previous session, not the previous bar', () => {
  const meta = toSeriesPayload(normalizeBars(twoSessions), 'GBPUSD=X').chart.result[0].meta
  assert.equal(meta.chartPreviousClose, 1.36)
  assert.notEqual(meta.chartPreviousClose, 1.3509, 'the bar five minutes ago stood in for the day')
})

test('a payload holding one session names no previous close rather than inventing one', () => {
  const oneSession = normalizeBars([
    padded('20260901100000', '1.3539', '1.3552', '1.3520', '1.3530'),
    padded('20260901180000', '1.3530', '1.3540', '1.3503', '1.3509'),
  ])
  const meta = toSeriesPayload(oneSession, 'GBPUSD=X').chart.result[0].meta
  assert.equal('chartPreviousClose' in meta, false)
})

test('an absent previous close reads downstream as no change rather than as zero', async () => {
  const oneSession = normalizeBars([
    padded('20260901100000', '1.3539', '1.3552', '1.3520', '1.3530'),
    padded('20260901180000', '1.3530', '1.3540', '1.3503', '1.3509'),
  ])
  const payload = toSeriesPayload(oneSession, 'GBPUSD=X')
  const original = globalThis.fetch
  globalThis.fetch = async () => ({ ok: true, json: async () => payload })
  try {
    const quote = await fetchQuote('GBPUSD=X')
    assert.equal(quote.previousClose, null)
    assert.equal(quote.change, null)
    assert.equal(quote.changePct, null)
  } finally {
    globalThis.fetch = original
  }
})

test('the client reads the range the payload measured', async () => {
  const payload = toSeriesPayload(normalizeBars(twoSessions), 'GBPUSD=X')
  const original = globalThis.fetch
  globalThis.fetch = async () => ({ ok: true, json: async () => payload })
  try {
    const quote = await fetchQuote('GBPUSD=X')
    assert.equal(quote.high, 1.3552)
    assert.equal(quote.low, 1.3503)
  } finally {
    globalThis.fetch = original
  }
})
