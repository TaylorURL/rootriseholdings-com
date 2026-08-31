import test from 'node:test'
import assert from 'node:assert/strict'
import { rebaseToSpot } from '../api/lib/spotMetal.js'
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

test('rebasing anchors the last close to the spot print', () => {
  const result = rebaseToSpot(payload(), 4647.7, {
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

test('a payload with no honest anchor is returned as it arrived', () => {
  const original = payload()
  assert.deepEqual(rebaseToSpot(original, null, {}), original)
  assert.deepEqual(rebaseToSpot(original, 0, {}), original)
  assert.deepEqual(rebaseToSpot(original, Number.NaN, {}), original)
  assert.deepEqual(rebaseToSpot({ chart: { result: [] } }, 4647.7, {}), { chart: { result: [] } })
})

test('a bar that never printed stays absent rather than becoming a price', () => {
  const gapped = payload()
  gapped.chart.result[0].indicators.quote[0].close[1] = null
  const after = rebaseToSpot(gapped, 4647.7, {}).chart.result[0]
  assert.equal(after.indicators.quote[0].close[1], null)
})
