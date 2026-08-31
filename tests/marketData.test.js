import test from 'node:test'
import assert from 'node:assert/strict'
import { FOLD_TO_4H, foldCandles, toCandles } from '../src/lib/marketData/chartFeed.js'
import { oandaInstrumentFor, oandaQuery, toChartPayload } from '../src/lib/marketData/oanda.js'
import { normalizeCalendar } from '../src/lib/marketData/calendar.js'
import { ctDateKey, ctMinutesOfDay, sessionForMoment } from '../src/lib/time.js'
import { sessionForCtMinutes } from '../src/data/riskRules.js'
import { editionForMoment } from '../src/lib/briefing/compose.js'

/**
 * A chart response in the shape the feed returns it: OHLCV arrays aligned to the
 * timestamp array, with nulls where a bar did not print. The third bar here is
 * the case that matters - a timestamp with no prices behind it.
 */
const CHART = {
  timestamp: [1_700_000_000, 1_700_003_600, 1_700_007_200, 1_700_010_800, 1_700_014_400],
  indicators: {
    quote: [
      {
        open: [10, 12, null, 13, 14],
        high: [11, 14, null, 15, 16],
        low: [9, 11, null, 12, 13],
        close: [12, 13, null, 14, 15],
        volume: [100, 200, null, 300, 400],
      },
    ],
  },
}

test('the feed parser drops bars that did not print and keeps the rest in order', () => {
  const candles = toCandles(CHART)
  assert.equal(candles.length, 4)
  assert.deepEqual(
    candles.map((candle) => candle.close),
    [12, 13, 14, 15]
  )
  assert.equal(candles[0].time, 1_700_000_000 * 1000)
  assert.equal(candles[0].volume, 100)
  assert.ok(candles.every((candle) => candle.high >= candle.low))
  assert.equal(toCandles({}).length, 0)
})

test('four hourly bars fold into one four-hour bar', () => {
  const folded = foldCandles(toCandles(CHART), FOLD_TO_4H)
  assert.equal(folded.length, 1)
  const [bar] = folded
  assert.equal(bar.open, 10, 'opens on the first bar of the group')
  assert.equal(bar.close, 15, 'closes on the last')
  assert.equal(bar.high, 16, 'takes the highest high across the group')
  assert.equal(bar.low, 9, 'takes the lowest low')
  assert.equal(bar.volume, 1000, 'sums the volume')
  assert.equal(bar.time, 1_700_000_000 * 1000, 'stamps at the group open')
})

test('the keyed feed names every desk ticker except the dollar index', () => {
  assert.equal(oandaInstrumentFor('GC=F'), 'XAU_USD')
  assert.equal(oandaInstrumentFor('^NDX'), 'NAS100_USD')
  assert.equal(oandaInstrumentFor('^GSPC'), 'SPX500_USD')
  assert.equal(oandaInstrumentFor('NZDJPY=X'), 'NZD_JPY')
  assert.equal(oandaInstrumentFor('DX-Y.NYB'), null)
})

test('chart queries translate to candle parameters that reach past the range', () => {
  assert.deepEqual(oandaQuery({ interval: '5m', range: '1d' }), { granularity: 'M5', count: 288 })
  assert.deepEqual(oandaQuery({ interval: '15m', range: '5d' }), { granularity: 'M15', count: 480 })
  assert.deepEqual(oandaQuery({ interval: '1h', range: '3mo' }), { granularity: 'H1', count: 2232 })
  assert.deepEqual(oandaQuery({ interval: '1d', range: '1y' }), { granularity: 'D', count: 366 })
  assert.equal(oandaQuery({ interval: '2m', range: '1d' }), null)
  assert.equal(oandaQuery({ interval: '5m', range: '2y' }), null)
})

test('a keyed candle response folds into the chart shape the client already parses', () => {
  const payload = toChartPayload({
    instrument: 'XAU_USD',
    candles: [
      {
        time: '1700000000.000000000',
        volume: 12,
        mid: { o: '4640.1', h: '4652.0', l: '4638.5', c: '4650.2' },
      },
      {
        time: '1700000300.000000000',
        volume: 8,
        mid: { o: '4650.2', h: '4655.9', l: '4649.0', c: '4645.7' },
      },
      { time: '1700000600.000000000', volume: 1 },
    ],
    dailyCandles: [
      {
        time: '1699920000.000000000',
        volume: 900,
        mid: { o: '4600.0', h: '4660.0', l: '4590.0', c: '4655.0' },
      },
      {
        time: '1700006400.000000000',
        volume: 400,
        mid: { o: '4655.0', h: '4656.4', l: '4630.0', c: '4645.7' },
      },
    ],
  })
  const [result] = payload.chart.result
  assert.equal(result.meta.symbol, 'XAU_USD')
  assert.equal(result.meta.fullExchangeName, 'OANDA')
  assert.equal(result.meta.regularMarketPrice, 4645.7, 'prices off the last bar that printed')
  assert.equal(
    result.meta.chartPreviousClose,
    4655.0,
    'prior close from the completed daily candle'
  )
  assert.equal(result.meta.regularMarketDayHigh, 4656.4)
  assert.equal(result.meta.regularMarketDayLow, 4630.0)
  assert.equal(result.timestamp.length, 2, 'drops the candle with no prices behind it')
  const candles = toCandles(result)
  assert.equal(candles.length, 2)
  assert.equal(candles[1].close, 4645.7)
  assert.equal(candles[0].time, 1_700_000_000 * 1000)
})

// 14:30 CT — August is CDT (UTC-5).
const NOW = new Date('2026-08-21T19:30:00Z')

test('calendar normalization keeps today, flags impact, and orders by time', () => {
  const rows = [
    {
      title: 'CPI m/m',
      country: 'USD',
      date: '2026-08-21T08:30:00-04:00',
      impact: 'High',
      forecast: '0.2%',
      previous: '0.3%',
    },
    {
      title: 'Earlier print',
      country: 'USD',
      date: '2026-08-21T04:00:00-04:00',
      impact: 'Low',
      forecast: '',
      previous: '',
    },
    { title: 'Yesterday', country: 'EUR', date: '2026-08-20T08:30:00-04:00', impact: 'High' },
  ]
  const events = normalizeCalendar(rows, NOW)
  assert.equal(events.length, 2)
  assert.equal(events[0].title, 'Earlier print')
  assert.equal(events[1].isHighImpact, true)
  assert.equal(events[1].isPast, true)
  assert.match(events[1].timeCt, /07:30/)
})

test('CT date keys hold the trading day across the UTC midnight boundary', () => {
  assert.equal(ctDateKey(NOW), '2026-08-21')
  assert.equal(ctDateKey(new Date('2026-08-22T03:30:00Z')), '2026-08-21')
  assert.equal(ctMinutesOfDay(NOW), 14 * 60 + 30)
})

test('session windows resolve in CT with the Asia wrap and dead zones', () => {
  assert.equal(sessionForCtMinutes(8 * 60), 'New York AM')
  assert.equal(sessionForCtMinutes(13 * 60 + 45), 'New York PM')
  assert.equal(sessionForCtMinutes(2 * 60 + 30), 'London')
  assert.equal(sessionForCtMinutes(19 * 60), 'Asia')
  assert.equal(sessionForCtMinutes(60), 'Asia')
  assert.equal(sessionForCtMinutes(5 * 60 + 30), null)
  assert.equal(sessionForCtMinutes(11 * 60), null)
  assert.equal(sessionForMoment(NOW), 'New York PM')
})

test('briefing editions switch at 15:00 CT', () => {
  assert.equal(editionForMoment(new Date('2026-08-21T19:59:00Z')).current.id, 'morning')
  assert.equal(editionForMoment(new Date('2026-08-21T20:00:00Z')).current.id, 'pm')
  assert.equal(editionForMoment(new Date('2026-08-21T20:00:00Z')).next.id, 'morning')
})
