import test from 'node:test'
import assert from 'node:assert/strict'
import { analyzeStructure, atrSeries, OTE_ZONE, RANGE_BARS } from '../src/lib/smc/structure.js'
import { presetFor } from '../src/lib/smc/presets.js'

/** Deterministic candle builder: straight runs of one-point closes. */
function run(candles, from, steps, direction) {
  let price = from
  for (let i = 0; i < steps; i++) {
    const open = price
    const close = price + direction
    candles.push({
      open,
      close,
      high: Math.max(open, close) + 0.4,
      low: Math.min(open, close) - 0.4,
    })
    price = close
  }
  return price
}

/** Rally – pullback cycles that force swings, a CHoCH, and BOS continuations. */
function uptrendCandles() {
  const candles = []
  let price = 100
  price = run(candles, price, 10, +1) // 110
  price = run(candles, price, 4, -1) // 106 — swing high forms
  price = run(candles, price, 8, +1) // 114 — breaks 110: CHoCH Up
  price = run(candles, price, 4, -1) // 110 — swing high 114, swing low behind
  price = run(candles, price, 8, +1) // 118 — breaks 114: BOS Up
  run(candles, price, 4, -1) // 114 — pullback into the last leg
  return candles
}

test('ATR converges to the candle range for a constant series', () => {
  const candles = []
  run(candles, 100, 40, +1)
  const atr = atrSeries(candles, 14)
  const last = atr[atr.length - 1]
  // Each bar spans 1.8 points (1 body + 0.4 wick each side).
  assert.ok(Math.abs(last - 1.8) < 0.2, `ATR ${last} should sit near 1.8`)
})

test('an uptrend with pullbacks produces CHoCH then BOS and a bullish read', () => {
  const read = analyzeStructure(uptrendCandles(), { atrLength: 5, atrMult: 2.0 })

  const types = read.events.map((event) => event.type)
  assert.ok(types.includes('CHoCH Up'), `events were ${types.join(', ')}`)
  assert.ok(types.includes('BOS Up'), `events were ${types.join(', ')}`)
  assert.ok(types.indexOf('CHoCH Up') < types.indexOf('BOS Up'))

  assert.equal(read.trend, 'up')
  assert.equal(read.bias, 'Bullish')
  assert.ok(read.leg.extreme > read.leg.origin)

  // The final 4-point pullback off the extreme sits inside the last leg.
  assert.ok(read.retracementPct > 0 && read.retracementPct <= 100)

  // OTE band is the 62–79% retracement of the leg, below the extreme.
  const legSize = read.leg.extreme - read.leg.origin
  assert.ok(Math.abs(read.oteZone.to - (read.leg.extreme - legSize * OTE_ZONE.from)) < 1e-9)
  assert.ok(Math.abs(read.oteZone.from - (read.leg.extreme - legSize * OTE_ZONE.to)) < 1e-9)
  assert.ok(read.oteZone.from < read.oteZone.to)
})

test('the mirrored downtrend reads bearish with a short OTE above price', () => {
  const candles = uptrendCandles().map((candle) => ({
    open: 220 - candle.open,
    close: 220 - candle.close,
    high: 220 - candle.low,
    low: 220 - candle.high,
  }))
  const read = analyzeStructure(candles, { atrLength: 5, atrMult: 2.0 })
  assert.equal(read.trend, 'down')
  assert.equal(read.bias, 'Bearish')
  assert.ok(read.events.some((event) => event.type === 'CHoCH Down'))
  assert.ok(read.events.some((event) => event.type === 'BOS Down'))
  assert.ok(read.oteZone.from > read.lastClose)
})

test('a flat tape stays neutral with no structure events', () => {
  const candles = []
  for (let i = 0; i < 30; i++) {
    candles.push({ open: 100, close: 100.1, high: 100.6, low: 99.6 })
  }
  const read = analyzeStructure(candles, { atrLength: 5, atrMult: 2.0 })
  assert.equal(read.events.length, 0)
  assert.equal(read.trend, 'none')
  assert.equal(read.bias, 'Neutral')
})

test('a break is classified by the body that made it', () => {
  const read = analyzeStructure(uptrendCandles(), { atrLength: 5, atrMult: 2.0 })
  assert.ok(['Strong', 'Moderate', 'Weak', 'Failed'].includes(read.lastStrength))
  assert.equal(read.lastEvent.strength, read.lastStrength)
})

test('the read carries the pullback depth as a state, not only a percentage', () => {
  const read = analyzeStructure(uptrendCandles(), { atrLength: 5, atrMult: 2.0 })
  assert.ok(read.pullbackPct >= 0 && read.pullbackPct <= 100)
  assert.ok(['None', 'Shallow', 'Healthy', 'Deep', 'Invalidated'].includes(read.pullbackState))
})

test('a tape that stops printing events reads as a range', () => {
  const candles = uptrendCandles()
  // Twenty-odd bars of nothing after the last break is the range threshold.
  for (let i = 0; i < 25; i++) {
    candles.push({ open: 114, close: 114, high: 114.2, low: 113.8 })
  }
  const read = analyzeStructure(candles, { atrLength: 5, atrMult: 2.0 })
  assert.equal(read.displayState, 'Range')
  assert.ok(read.barsSinceEvent >= RANGE_BARS)
})

test('a flat tape has no event and reads as Init', () => {
  const candles = []
  for (let i = 0; i < 30; i++) candles.push({ open: 100, close: 100, high: 100.1, low: 99.9 })
  const read = analyzeStructure(candles, { atrLength: 5 })
  assert.equal(read.displayState, 'Init')
  assert.equal(read.barsSinceEvent, null)
})

/** A CHoCH Up that never gets a BOS behind it, then a collapse through the leg. */
function unconfirmedThenReversedCandles() {
  const candles = []
  let price = 100
  price = run(candles, price, 10, +1) // 110 — swing high forms behind the pullback
  price = run(candles, price, 4, -1) // 106
  price = run(candles, price, 8, +1) // 114 — breaks 110: CHoCH Up, no BOS after it
  run(candles, price, 20, -1) // 94 — straight back down through the swing low
  return candles
}

test('a trend started on a CHoCH reverses without needing a BOS first', () => {
  const read = analyzeStructure(unconfirmedThenReversedCandles(), { atrLength: 5, atrMult: 2.0 })

  // The break that ends an unconfirmed trend used to be consumed without being
  // recorded, which left the trend standing while price walked away from it.
  const types = read.events.map((event) => event.type)
  assert.ok(types.includes('CHoCH Down'), `events were ${types.join(', ')}`)
  assert.equal(read.trend, 'down')

  // And the leg the read describes is the live one rather than the abandoned
  // one: a leg price has retraced past is not a leg anything can be read off.
  assert.equal(read.legInvalidated, false)
  assert.ok(read.retracementPct <= 100)
})

test('an instrument reads on its own preset', () => {
  assert.equal(presetFor('XAUUSD').name, 'XAUUSD')
  assert.equal(presetFor('GOLD').name, 'XAUUSD')
  assert.equal(presetFor('NAS100').atrMult, 1.0)
  assert.equal(presetFor('EURUSD').atrMult, 0.8)
  assert.equal(presetFor('AUDCAD').name, 'Custom')
})
