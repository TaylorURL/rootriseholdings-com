import test, { beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { clearSpotCache, rebaseToSpot } from '../api/lib/spotMetal.js'
import { analyzeStructure } from '../src/lib/smc/structure.js'
import { toCandles } from '../src/lib/marketData/chartFeed.js'

/** A futures payload whose last close sits 65 above the spot print. */
function payload() {
  return {
    chart: {
      result: [
        {
          meta: {
            symbol: 'GC=F',
            currency: 'USD',
            exchangeName: 'COMEX',
            fullExchangeName: 'COMEX',
            regularMarketPrice: 4712.7,
            chartPreviousClose: 4700.2,
            regularMarketDayHigh: 4720.0,
            regularMarketDayLow: 4690.0,
            regularMarketTime: 1_700_000_400,
          },
          timestamp: [1_700_000_000, 1_700_000_200, 1_700_000_400],
          indicators: {
            quote: [
              {
                open: [4700, 4705, 4710],
                high: [4706, 4712, 4718],
                low: [4698, 4702, 4708],
                close: [4705, 4710, 4712.7],
                volume: [10, 12, 8],
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
 * A series at whatever levels and stamps a test needs. The four sides carry the
 * same numbers because what these tests read is the shift, which lands on all
 * of them alike.
 */
function seriesOf(closes, timestamps) {
  return {
    chart: {
      result: [
        {
          meta: {
            symbol: 'GC=F',
            currency: 'USD',
            regularMarketPrice: closes[closes.length - 1],
          },
          timestamp: timestamps,
          indicators: {
            quote: [
              {
                open: [...closes],
                high: [...closes],
                low: [...closes],
                close: [...closes],
                volume: closes.map(() => 1),
              },
            ],
          },
        },
      ],
      error: null,
    },
  }
}

/** Five-minute and hourly stamps from a session long since closed. */
const CLOSED_5M = [1_700_000_000, 1_700_000_300, 1_700_000_600]
const CLOSED_1H = [1_699_996_800, 1_700_000_400, 1_700_004_000]

/** Stamps ending in a bar that opened a minute ago and is still taking ticks. */
function formingStamps() {
  const now = Math.floor(Date.now() / 1000)
  return [now - 660, now - 360, now - 60]
}

/** A basis held from an earlier request is what these tests are about. */
beforeEach(clearSpotCache)

test('rebasing anchors the last closed bar to the spot print', () => {
  const result = rebaseToSpot(payload(), 4647.7, {
    metal: 'XAU',
    symbol: 'XAU/USD',
    exchangeName: 'Spot (COMEX basis)',
  }).chart.result[0]
  const closes = result.indicators.quote[0].close
  assert.equal(closes[closes.length - 1], 4647.7)
  assert.equal(result.meta.spotBasis, 65)
  assert.equal(result.meta.spotAnchor, 4647.7)
  assert.equal(result.meta.symbol, 'XAU/USD')
  assert.equal(result.meta.fullExchangeName, 'Spot (COMEX basis)')
})

test('every price shifts by the same basis, so the session change is unchanged', () => {
  const before = payload().chart.result[0].meta
  const after = rebaseToSpot(payload(), 4647.7, {}).chart.result[0].meta
  assert.equal(after.regularMarketPrice, before.regularMarketPrice - 65)
  assert.equal(after.chartPreviousClose, before.chartPreviousClose - 65)
  assert.equal(after.regularMarketDayHigh, before.regularMarketDayHigh - 65)
  assert.equal(after.regularMarketDayLow, before.regularMarketDayLow - 65)
  assert.equal(
    after.regularMarketPrice - after.chartPreviousClose,
    before.regularMarketPrice - before.chartPreviousClose
  )
})

test('timestamps and volume ride through untouched', () => {
  const before = payload().chart.result[0]
  const after = rebaseToSpot(payload(), 4647.7, {}).chart.result[0]
  assert.deepEqual(after.timestamp, before.timestamp)
  assert.deepEqual(after.indicators.quote[0].volume, before.indicators.quote[0].volume)
  assert.equal(after.meta.regularMarketTime, before.meta.regularMarketTime)
})

test('a constant shift leaves the structure read identical', () => {
  const raw = toCandles(payload().chart.result[0])
  const shifted = toCandles(rebaseToSpot(payload(), 4647.7, {}).chart.result[0])
  const before = analyzeStructure(raw)
  const after = analyzeStructure(shifted)
  assert.equal(after.trend, before.trend)
  assert.equal(after.bias, before.bias)
  assert.equal(after.retracementPct, before.retracementPct)
  assert.equal(after.premiumDiscount, before.premiumDiscount)
})

test('the basis comes off the last closed bar, not the one still printing', () => {
  const forming = rebaseToSpot(seriesOf([4680, 4700, 4720], formingStamps()), 4635, {
    metal: 'XAU',
  })
  assert.equal(forming.chart.result[0].meta.spotBasis, 65)

  // The same three closes, stamped in a session that has ended, anchor on the
  // last of them instead - so what moved the anchor was the bar being open.
  clearSpotCache()
  const settled = rebaseToSpot(seriesOf([4680, 4700, 4720], CLOSED_5M), 4655, { metal: 'XAU' })
  assert.equal(settled.chart.result[0].meta.spotBasis, 65)
})

test('one basis serves every interval of a metal inside the refresh window', () => {
  const quote = rebaseToSpot(seriesOf([4700, 4710, 4715], CLOSED_5M), 4650, { metal: 'XAU' })
  const series = rebaseToSpot(seriesOf([4720, 4725, 4730], CLOSED_1H), 4640, { metal: 'XAU' })
  const hourly = series.chart.result[0]
  assert.equal(quote.chart.result[0].meta.spotBasis, 65)
  assert.equal(hourly.meta.spotBasis, 65)
  assert.equal(hourly.meta.spotAnchor, 4650)
  const closes = hourly.indicators.quote[0].close
  assert.equal(closes[closes.length - 1], 4665)
})

test('a metal with no spot print is refused rather than served as futures', () => {
  assert.equal(rebaseToSpot(payload(), null, { metal: 'XAU' }), null)
  assert.equal(rebaseToSpot(payload(), 0, { metal: 'XAU' }), null)
  assert.equal(rebaseToSpot(payload(), Number.NaN, { metal: 'XAU' }), null)
  assert.equal(rebaseToSpot({ chart: { result: [] } }, 4647.7, { metal: 'XAU' }), null)
})

test('a series with no closed bar in it is refused too', () => {
  const now = Math.floor(Date.now() / 1000)
  assert.equal(rebaseToSpot(seriesOf([4700], [now]), 4635, { metal: 'XAU' }), null)
  assert.equal(rebaseToSpot(seriesOf([4700, 4720], []), 4635, { metal: 'XAU' }), null)
})

test('a bar that never printed stays absent rather than becoming a price', () => {
  const gapped = payload()
  gapped.chart.result[0].indicators.quote[0].close[1] = null
  const after = rebaseToSpot(gapped, 4647.7, {}).chart.result[0]
  assert.equal(after.indicators.quote[0].close[1], null)
})
