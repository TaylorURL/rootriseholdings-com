import test from 'node:test'
import assert from 'node:assert/strict'
import { deriveTradeCall } from '../src/lib/smc/signal.js'
import { alignmentOf, scoreStructure } from '../src/lib/smc/score.js'
import {
  createSignal,
  resolveSignal,
  signalFingerprint,
  signalStats,
} from '../src/lib/signals/model.js'
import { scoreAgainstRead } from '../src/lib/signals/engine.js'

/**
 * A structure read that clears every gate, in the shape analyzeStructure
 * returns. The numbers are chosen so the arithmetic is checkable by hand:
 * a 20-point impulse from 100 to 120, a close at 105, and an ATR of 2, which
 * puts the stop at 99.4 and pays 15 against 5.6.
 */
function read(overrides = {}) {
  return {
    trend: 'up',
    bias: 'Bullish',
    bosInTrend: 1,
    atr: 2,
    lastClose: 105,
    lastEvent: { type: 'BOS Up', level: 110, index: 20, strength: 'Strong' },
    lastStrength: 'Strong',
    displayState: 'BOS Up',
    barsSinceEvent: 3,
    retestState: 'Retested',
    pullbackState: 'Healthy',
    pullbackPct: 50,
    swings: { lastHigh: 120, lastLow: 100 },
    leg: { origin: 100, extreme: 120 },
    retracementPct: 70,
    inOte: true,
    legInvalidated: false,
    oteZone: { from: 104.2, to: 107.6 },
    dealingRange: { high: 120, low: 100, positionPct: 25 },
    premiumDiscount: 'Discount',
    ...overrides,
  }
}

/** The mirror of read(), for the short side. */
function shortRead(overrides = {}) {
  return read({
    trend: 'down',
    bias: 'Bearish',
    lastClose: 115,
    lastEvent: { type: 'BOS Down', level: 110, index: 20, strength: 'Strong' },
    displayState: 'BOS Down',
    swings: { lastHigh: 120, lastLow: 100 },
    leg: { origin: 120, extreme: 100 },
    dealingRange: { high: 120, low: 100, positionPct: 75 },
    premiumDiscount: 'Premium',
    ...overrides,
  })
}

const long = (overrides, args = {}) =>
  deriveTradeCall({ execution: read(overrides), alignment: 'Full Bull', ...args })

const short = (overrides, args = {}) =>
  deriveTradeCall({ execution: shortRead(overrides), alignment: 'Full Bear', ...args })

test('a long enters at the close with the stop an ATR fraction past the swing', () => {
  const { call } = long()
  assert.equal(call.side, 'BUY')
  assert.equal(call.entry, 105)
  assert.ok(Math.abs(call.stop - 99.4) < 1e-9, 'stop is the swing low less 0.3 ATR')
  assert.equal(call.target, 120)
  assert.ok(Math.abs(call.rewardToRisk - 15 / 5.6) < 1e-9)
})

test('a long carries the two fib extension targets', () => {
  const { call } = long()
  assert.ok(Math.abs(call.target2 - (100 + 20 * 1.618)) < 1e-9)
  assert.equal(call.target3, 140)
})

test('a short mirrors the long, with the stop above the swing high', () => {
  const { call } = short()
  assert.equal(call.side, 'SELL')
  assert.equal(call.entry, 115)
  assert.ok(Math.abs(call.stop - 120.6) < 1e-9)
  assert.equal(call.target, 100)
})

test('a setup under the minimum reward-to-risk is refused, not published', () => {
  // A close at 115 leaves 5 to the target against 15.6 of risk.
  const { call, standDown } = long({ lastClose: 115 })
  assert.equal(call, null)
  assert.match(standDown, /minimum/i)
})

test('a weak or reclaimed break is refused', () => {
  assert.equal(long({ lastStrength: 'Weak' }).call, null)
  assert.equal(long({ lastStrength: 'Failed' }).call, null)
  assert.match(long({ lastStrength: 'Failed' }).standDown, /reclaimed/i)
})

test('a pullback outside the tradeable depths is refused', () => {
  assert.equal(long({ pullbackState: 'Deep' }).call, null)
  assert.equal(long({ pullbackState: 'Invalidated' }).call, null)
  assert.equal(long({ pullbackState: 'None' }).call, null)
  assert.ok(long({ pullbackState: 'Shallow', pullbackPct: 20 }).call)
})

test('a failed retest is refused', () => {
  const { call, standDown } = long({ retestState: 'Failed Retest' })
  assert.equal(call, null)
  assert.match(standDown, /retest/i)
})

test('higher timeframes that oppose the side refuse the call', () => {
  assert.equal(deriveTradeCall({ execution: read(), alignment: 'Full Bear' }).call, null)
  assert.match(
    deriveTradeCall({ execution: read(), alignment: 'Partial Bear' }).standDown,
    /against this side/i
  )
  assert.ok(deriveTradeCall({ execution: read(), alignment: 'Partial Bull' }).call)
})

test('higher timeframes that merely disagree with each other do not refuse the call', () => {
  // 'Mixed' is what alignmentOf returns whenever the three timeframes miss a
  // two-thirds majority, so one neutral higher timeframe reads the same as two
  // opposed ones. Refusing on it discarded setups that had cleared every gate
  // the desk states - this read scores a continuation of 100 against a
  // reversal risk of 5 - and it discarded them for a reading the score has
  // already priced.
  const { call, scores, standDown } = deriveTradeCall({ execution: read(), alignment: 'Mixed' })
  assert.ok(call, standDown ?? 'a mixed read is not an opposed one')
  assert.equal(scores.continuation, 100)
  assert.equal(scores.reversalRisk, 5)
  assert.equal(call.side, 'BUY')
})

test('a mixed read still has to clear the floor on its own merits', () => {
  // Removing the veto does not lower the bar: the same alignment on a read
  // that scores under the floor is still refused, and refused for the score.
  const { call, standDown } = deriveTradeCall({
    execution: read({
      bias: 'Neutral',
      displayState: 'Range',
      lastStrength: 'Moderate',
      pullbackState: 'Shallow',
      retestState: 'Pending',
      premiumDiscount: 'Premium',
    }),
    alignment: 'Mixed',
  })
  assert.equal(call, null)
  assert.match(standDown, /continuation/i)
})

test('a continuation score under the floor refuses the call', () => {
  // A neutral bias in a range, off a moderate break into premium: every part
  // is survivable and the sum is not.
  const { call, standDown } = deriveTradeCall({
    execution: read({
      bias: 'Neutral',
      displayState: 'Range',
      lastStrength: 'Moderate',
      pullbackState: 'Shallow',
      retestState: 'Pending',
      premiumDiscount: 'Premium',
    }),
    alignment: 'Partial Bull',
  })
  assert.equal(call, null)
  assert.match(standDown, /continuation/i)
})

test('reversal risk exactly at the ceiling is still allowed', () => {
  const { call, scores } = long({ displayState: 'Range', retestState: 'No Return' })
  assert.equal(scores.reversalRisk, 30)
  assert.ok(call, 'the ceiling is inclusive, as the indicator has it')
})

test('the scores are reported whether or not a call comes out of them', () => {
  const refused = long({ lastStrength: 'Failed' })
  assert.equal(refused.call, null)
  assert.ok(refused.scores.reversalRisk >= 25, 'a failed break carries its risk into the report')
})

test('no trend stands down', () => {
  assert.equal(long({ trend: 'none' }).call, null)
})

test('a shorts-only instrument stands down rather than calling a long', () => {
  const { call, standDown } = long({}, { sideConstraint: 'SHORT' })
  assert.equal(call, null)
  assert.match(standDown, /shorts only/i)
})

test('a shorts-only instrument still calls the short', () => {
  assert.equal(short({}, { sideConstraint: 'SHORT' }).call.side, 'SELL')
})

test('the grade needs both the score and the reward', () => {
  // 100/2.68 is an A; stretching the target to 130 pays 4.46 and makes it A+.
  assert.equal(long().call.grade, 'A')
  const stretched = long({
    leg: { origin: 100, extreme: 130 },
    swings: { lastHigh: 130, lastLow: 100 },
  })
  assert.equal(stretched.call.grade, 'A+')
})

test('alignment is a three-way vote', () => {
  assert.equal(alignmentOf(['Bullish', 'Bullish', 'Bullish']), 'Full Bull')
  assert.equal(alignmentOf(['Bearish', 'Bearish', 'Bearish']), 'Full Bear')
  assert.equal(alignmentOf(['Bullish', 'Bullish', 'Neutral']), 'Partial Bull')
  assert.equal(alignmentOf(['Bullish', 'Bullish', 'Bearish']), 'Mixed')
  assert.equal(alignmentOf(['Bullish', 'Neutral', 'Bearish']), 'Mixed')
})

test('the scores are capped at 100', () => {
  const scores = scoreStructure(read(), 'Full Bull')
  assert.equal(scores.continuation, 100)
  assert.ok(scores.reversalRisk <= 100)
})

/** A signal published at t=0 on a 1H timeframe. */
function signal(overrides = {}) {
  const { call } = deriveTradeCall({ execution: read(), alignment: 'Full Bull' })
  return {
    ...createSignal({ symbol: 'XAUUSD', timeframe: '1H', call, price: 118, now: 0 }),
    ...overrides,
  }
}

const bar = (time, low, high) => ({ time, low, high, open: low, close: high })

test('a signal stays live until price reaches the entry', () => {
  const resolved = resolveSignal(signal(), [bar(1000, 115, 119)], 2000)
  assert.equal(resolved.status, 'live')
  assert.equal(resolved.filledAt, null)
})

test('a filled signal that reaches the target scores its planned R', () => {
  const published = signal()
  const resolved = resolveSignal(published, [bar(1000, 104, 108), bar(2000, 118, 121)], 3000)
  assert.equal(resolved.status, 'target')
  assert.equal(resolved.filledAt, 1000)
  assert.equal(resolved.realisedR, published.rewardToRisk)
})

test('a filled signal that reaches the stop scores exactly -1R', () => {
  const resolved = resolveSignal(signal(), [bar(1000, 104, 108), bar(2000, 96, 101)], 3000)
  assert.equal(resolved.status, 'stop')
  assert.equal(resolved.realisedR, -1)
})

test('a bar spanning both sides is read as the stop', () => {
  const resolved = resolveSignal(signal(), [bar(1000, 95, 125)], 3000)
  assert.equal(resolved.status, 'stop')
})

/**
 * The bar that fills a call reaches the target as often as any other, and
 * whether it did so before or after touching the entry is not knowable from
 * the bar. Booking it as a win is the same unknowable the stop-and-target case
 * refuses to resolve in the call's favour, so it is refused here too - the
 * call is filled and still standing, and the next bar can pay it.
 */
test('the bar that fills a call cannot also pay it out', () => {
  const filled = resolveSignal(signal(), [bar(1000, 100, 121)], 3000)
  assert.equal(filled.status, 'filled')
  assert.equal(filled.filledAt, 1000)
  assert.equal(filled.realisedR, null)
})

test('the bar after the fill can pay it out', () => {
  const published = signal()
  const resolved = resolveSignal(published, [bar(1000, 100, 121), bar(2000, 118, 121)], 3000)
  assert.equal(resolved.status, 'target')
  assert.equal(resolved.filledAt, 1000)
  assert.equal(resolved.realisedR, published.rewardToRisk)
})

test('the bar that fills a call can still stop it out', () => {
  const resolved = resolveSignal(signal(), [bar(1000, 95, 121)], 3000)
  assert.equal(resolved.status, 'stop')
  assert.equal(resolved.realisedR, -1)
})

test('a signal price never reached expires rather than counting as a loss', () => {
  const resolved = resolveSignal(signal(), [bar(1000, 115, 119)], 49 * 3_600_000)
  assert.equal(resolved.status, 'expired')
  assert.equal(resolved.realisedR, null)
})

test('a settled signal is never re-scored', () => {
  const settled = { ...signal(), status: 'stop', realisedR: -1 }
  assert.deepEqual(resolveSignal(settled, [bar(1000, 118, 121)], 3000), settled)
})

test('the same call twice carries one fingerprint', () => {
  const { call } = deriveTradeCall({ execution: read() })
  const first = signalFingerprint({ symbol: 'XAUUSD', timeframe: '1H', ...call })
  const second = signalFingerprint({ symbol: 'XAUUSD', timeframe: '1H', ...call })
  assert.equal(first, second)
  assert.notEqual(first, signalFingerprint({ symbol: 'XAUUSD', timeframe: '15m', ...call }))
})

test('the hit rate counts only the calls that became trades', () => {
  const stats = signalStats([
    { status: 'target', realisedR: 2, emittedAt: 1 },
    { status: 'stop', realisedR: -1, emittedAt: 2 },
    { status: 'expired', realisedR: null, emittedAt: 3 },
    { status: 'live', realisedR: null, emittedAt: 4 },
  ])
  assert.equal(stats.published, 4)
  assert.equal(stats.triggered, 2)
  assert.equal(stats.hitRate, 0.5)
  assert.equal(stats.expired, 1)
  assert.equal(stats.live, 1)
  assert.equal(stats.totalR, 1)
})

/**
 * The venue guard, at the level the sweep applies it.
 *
 * The desk prices gold three ways and they do not agree - a COMEX future
 * shifted onto spot sits tens of dollars from a broker's spot CFD. When the
 * feed underneath a standing call changes, its frozen levels are being
 * compared against a different scale, and because a call's target is a level
 * price already hovers at while its stop sits an ATR beyond a swing, the error
 * manufactures wins far more readily than losses. So the call waits.
 */
test('a call is not scored against a venue it was not minted on', () => {
  const { call } = deriveTradeCall({ execution: read(), alignment: 'Full Bull' })
  const minted = createSignal({
    symbol: 'XAUUSD',
    timeframe: '1H',
    call,
    price: 118,
    venue: 'OANDA',
    now: 0,
  })
  assert.equal(minted.venue, 'OANDA')

  const candles = [bar(1000, 104, 108), bar(2000, 118, 121)]
  const ownVenue = scoreAgainstRead(minted, { candles, exchange: 'OANDA' }, 3000)
  assert.equal(ownVenue.status, 'target')

  const elsewhere = scoreAgainstRead(minted, { candles, exchange: 'Spot (COMEX basis)' }, 3000)
  assert.equal(elsewhere.status, 'live')
  assert.equal(elsewhere.realisedR, null)
})

test('a call minted without a venue is scored by whatever answered', () => {
  const { call } = deriveTradeCall({ execution: read(), alignment: 'Full Bull' })
  const minted = createSignal({ symbol: 'XAUUSD', timeframe: '1H', call, price: 118, now: 0 })
  assert.equal(minted.venue, null)
  const candles = [bar(1000, 104, 108), bar(2000, 118, 121)]
  assert.equal(scoreAgainstRead(minted, { candles, exchange: 'Anything' }, 3000).status, 'target')
})

test('a call whose instrument went unread this pass is left alone', () => {
  const { call } = deriveTradeCall({ execution: read(), alignment: 'Full Bull' })
  const minted = createSignal({ symbol: 'XAUUSD', timeframe: '1H', call, price: 118, now: 0 })
  assert.deepEqual(scoreAgainstRead(minted, null, 3000), minted)
  assert.deepEqual(scoreAgainstRead(minted, { candles: null, exchange: 'OANDA' }, 3000), minted)
})
