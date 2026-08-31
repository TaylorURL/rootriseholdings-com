import test from 'node:test'
import assert from 'node:assert/strict'
import {
  createTrade,
  closeTrade,
  validateTradeDraft,
  deriveTradeNumbers,
  suggestedSize,
} from '../src/lib/journal/model.js'
import { computeDayState, evaluateTradeGate } from '../src/lib/journal/rules.js'
import {
  summarize,
  breakdownBy,
  equityCurve,
  dailyPnl,
  closedTrades,
} from '../src/lib/journal/stats.js'
import { evaluatePropFirm } from '../src/lib/journal/propFirm.js'
import { loadJournal, saveJournal, emptyJournal, currentEquity } from '../src/lib/journal/store.js'

const EQUITY = 100000

// 14:30 CT on a Friday (19:30 UTC in August, CDT).
const NOW = new Date('2026-08-21T19:30:00Z')

function draft(overrides = {}) {
  return {
    symbol: 'XAUUSD',
    side: 'BUY',
    entry: 2400,
    stop: 2390,
    target: 2430,
    riskPct: 1,
    size: 0.5,
    setup: 'OTE',
    grade: 'A',
    session: 'New York PM',
    ...overrides,
  }
}

function openAndClose(overrides, exitPrice, at = NOW) {
  const trade = createTrade(draft(overrides), { equity: EQUITY, now: at })
  return closeTrade(trade, { exitPrice, now: at })
}

test('planned R:R and risk amount derive from prices and equity', () => {
  const { plannedRR, riskAmount } = deriveTradeNumbers(draft(), EQUITY)
  assert.equal(plannedRR, 3)
  assert.equal(riskAmount, 1000)
})

test('closing at the target realizes the planned R on both sides', () => {
  const long = openAndClose({}, 2430)
  assert.equal(long.realizedR, 3)
  assert.equal(long.pnl, 3000)

  const short = openAndClose(
    { symbol: 'SP500', side: 'SELL', entry: 5500, stop: 5510, target: 5470 },
    5470
  )
  assert.equal(short.realizedR, 3)
})

test('a full stop-out realizes -1R', () => {
  const trade = openAndClose({}, 2390)
  assert.equal(trade.realizedR, -1)
  assert.equal(trade.pnl, -1000)
})

test('draft validation catches inverted levels and the SP500 long ban', () => {
  assert.ok(validateTradeDraft(draft({ stop: 2410 })).stop)
  assert.ok(validateTradeDraft(draft({ target: 2395 })).target)
  assert.ok(
    validateTradeDraft(draft({ symbol: 'SP500', side: 'BUY', stop: 2390, target: 2430 })).side
  )
  assert.deepEqual(validateTradeDraft(draft()), {})
})

test('suggested size needs a point value and honors the risk cap', () => {
  assert.equal(suggestedSize(draft(), EQUITY, null), null)
  // $100/point per unit, $10 stop distance, $1000 risk → 1 unit.
  assert.equal(suggestedSize(draft(), EQUITY, 100), 1)
})

test('day state trips the daily loss limit at 0.5 percent', () => {
  const losers = [
    openAndClose({ riskPct: 0.3 }, 2390),
    openAndClose({ riskPct: 0.3, grade: 'B' }, 2390),
  ]
  const state = computeDayState({ trades: losers, equity: EQUITY, now: NOW })
  assert.equal(state.realizedPnl, -600)
  assert.equal(state.dailyLossLimitHit, true)
  assert.equal(state.consecutiveLossStopHit, true)
  assert.equal(state.locked, true)
  assert.equal(state.lockouts.length, 2)
})

test('a breakeven exit neither extends nor resets the loss streak', () => {
  const first = openAndClose({ riskPct: 0.1 }, 2390)
  const breakeven = openAndClose({ riskPct: 0.1 }, 2400)
  const state = computeDayState({ trades: [first, breakeven], equity: EQUITY, now: NOW })
  assert.equal(state.consecutiveLosses, 1)
  assert.equal(state.locked, false)
})

test('the A+ cap counts trades opened today and gates the next A+', () => {
  const aPlusTrades = [
    createTrade(draft({ grade: 'A+' }), { equity: EQUITY, now: NOW }),
    createTrade(draft({ grade: 'A+' }), { equity: EQUITY, now: NOW }),
  ]
  const state = computeDayState({ trades: aPlusTrades, equity: EQUITY, now: NOW })
  assert.equal(state.aPlusUsed, 2)
  assert.equal(state.aPlusCapHit, true)

  const gate = evaluateTradeGate({ draft: draft({ grade: 'A+' }), plannedRR: 3, dayState: state })
  assert.equal(gate.allowed, false)

  const bGrade = evaluateTradeGate({ draft: draft({ grade: 'B' }), plannedRR: 3, dayState: state })
  assert.equal(bGrade.allowed, true)
})

test('the gate blocks an over-risk draft outright', () => {
  const state = computeDayState({ trades: [], equity: EQUITY, now: NOW })
  const gate = evaluateTradeGate({ draft: draft({ riskPct: 1.5 }), plannedRR: 3, dayState: state })
  assert.equal(gate.allowed, false)
  assert.equal(gate.blocks.length, 1)
  assert.equal(gate.departures.length, 0)
})

test('an under-R:R draft is a departure, not a block', () => {
  const state = computeDayState({ trades: [], equity: EQUITY, now: NOW })
  const gate = evaluateTradeGate({ draft: draft(), plannedRR: 0.5, dayState: state })
  assert.equal(gate.blocks.length, 0)
  assert.deepEqual(
    gate.departures.map((entry) => entry.id),
    ['below-min-rr']
  )
  assert.equal(gate.allowed, false, 'it waits on the acknowledgement')

  const acknowledged = evaluateTradeGate({
    draft: draft({ acknowledged: ['below-min-rr'] }),
    plannedRR: 0.5,
    dayState: state,
  })
  assert.equal(acknowledged.allowed, true, 'and goes through once it is given')
})

test('a draft at or above the minimum raises no departure', () => {
  const state = computeDayState({ trades: [], equity: EQUITY, now: NOW })
  const gate = evaluateTradeGate({ draft: draft(), plannedRR: 2, dayState: state })
  assert.equal(gate.allowed, true)
  assert.equal(gate.departures.length, 0)
})

test('an acknowledgement never unlocks a blocking rule', () => {
  const state = computeDayState({ trades: [], equity: EQUITY, now: NOW })
  const gate = evaluateTradeGate({
    draft: draft({ riskPct: 1.5, acknowledged: ['below-min-rr'] }),
    plannedRR: 0.5,
    dayState: state,
  })
  assert.equal(gate.allowed, false)
  assert.ok(gate.blocks.length > 0)
})

test('the acknowledged departures land on the saved trade', () => {
  const trade = createTrade(draft({ acknowledged: ['below-min-rr'] }), {
    equity: EQUITY,
    now: NOW,
  })
  assert.deepEqual(trade.departures, ['below-min-rr'])
  assert.deepEqual(createTrade(draft(), { equity: EQUITY, now: NOW }).departures, [])
})

test('summarize reports win rate, expectancy, and profit factor', () => {
  const closed = [openAndClose({}, 2430), openAndClose({}, 2430), openAndClose({}, 2390)]
  const stats = summarize(closedTrades(closed))
  assert.equal(stats.trades, 3)
  assert.ok(Math.abs(stats.winRate - 2 / 3) < 1e-9)
  // (2/3 × 3R) − (1/3 × 1R) = 5/3 R per trade.
  assert.ok(Math.abs(stats.expectancyR - 5 / 3) < 1e-9)
  assert.equal(stats.profitFactor, 6)
})

test('breakdown buckets by setup and drops empty buckets', () => {
  const closed = [openAndClose({ setup: 'OTE' }, 2430), openAndClose({ setup: 'BOS' }, 2390)]
  const rows = breakdownBy(closedTrades(closed), (trade) => trade.setup, [
    { id: 'BOS', label: 'BOS' },
    { id: 'CHoCH', label: 'CHoCH' },
    { id: 'OTE', label: 'OTE' },
  ])
  assert.deepEqual(
    rows.map((row) => row.key),
    ['BOS', 'OTE']
  )
})

test('equity curve and daily pnl bucket by CT day', () => {
  const closed = [openAndClose({}, 2430)]
  const curve = equityCurve(closed, EQUITY)
  assert.equal(curve.length, 1)
  assert.equal(curve[0].equity, 103000)
  assert.equal(curve[0].date, '2026-08-21')
  assert.equal(dailyPnl(closed)[0].trades, 1)
})

test('trailing prop-firm floors follow the high-water mark; static ones do not', () => {
  const day1 = openAndClose({ riskPct: 2 }, 2430, new Date('2026-08-18T19:00:00Z'))
  const day2 = openAndClose({ riskPct: 2 }, 2390, new Date('2026-08-19T19:00:00Z'))
  const trades = [day1, day2]
  const base = {
    id: 'f1',
    firmName: 'Firm',
    programName: 'Eval',
    startingBalance: 100000,
    profitTarget: 9000,
    maxDrawdown: 5000,
    dailyLossLimit: null,
    consistencyCapPct: 30,
    minTradingDays: 5,
  }

  const trailing = evaluatePropFirm({ ...base, drawdownType: 'trailing' }, trades)
  assert.equal(trailing.highWaterMark, 106000)
  assert.equal(trailing.drawdownFloor, 101000)
  assert.equal(trailing.balance, 104000)
  assert.equal(trailing.drawdownBuffer, 3000)

  const staticFirm = evaluatePropFirm({ ...base, drawdownType: 'static' }, trades)
  assert.equal(staticFirm.drawdownFloor, 95000)
  assert.equal(staticFirm.drawdownBuffer, 9000)

  assert.equal(trailing.daysTraded, 2)
  assert.equal(trailing.minDaysMet, false)
  // One profitable day carries 100% of profit — past the 30% consistency cap.
  assert.equal(trailing.consistencyBreached, true)
})

test('the store round-trips through an injected storage and derives equity', () => {
  const backing = new Map()
  const storage = {
    getItem: (key) => backing.get(key) ?? null,
    setItem: (key, value) => backing.set(key, value),
  }
  const journal = emptyJournal()
  journal.settings.startingEquity = 50000
  journal.trades.push(openAndClose({ riskPct: 1 }, 2430))
  saveJournal(journal, storage)
  const loaded = loadJournal(storage)
  assert.equal(loaded.trades.length, 1)
  assert.equal(currentEquity(loaded), 50000 + loaded.trades[0].pnl)
  assert.equal(currentEquity(emptyJournal()), null)
})
