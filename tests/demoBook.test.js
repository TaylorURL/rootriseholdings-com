import assert from 'node:assert/strict'
import test from 'node:test'
import { buildDemoBook, DEMO_BOOK } from '../src/lib/demo/book.js'

const DAY = 86_400_000
const START = Date.UTC(2026, 0, 5, 15, 0)

/**
 * @param {object} over
 * @returns {object} a settled signal in the shape the record hands back
 */
function signal(over = {}) {
  return {
    id: over.id ?? `S${Math.random().toString(36).slice(2)}`,
    symbol: 'XAUUSD',
    timeframe: '1H',
    side: 'BUY',
    entry: 2400,
    stop: 2390,
    target: 2430,
    rewardToRisk: 3,
    grade: 'A',
    setup: 'BOS',
    emittedAt: START,
    status: 'target',
    filledAt: START,
    resolvedAt: START + DAY,
    realisedR: 3,
    ...over,
  }
}

test('an empty record opens on the starting capital and books nothing', () => {
  const book = buildDemoBook([])
  assert.equal(book.equity, DEMO_BOOK.startingEquity)
  assert.equal(book.stats.trades, 0)
  assert.equal(book.stats.netPnl, 0)
  assert.equal(book.stats.winRate, null)
  assert.equal(book.stats.maxDrawdown, 0)
  // The curve still carries its opening point, so a chart has a line to draw
  // from rather than starting at the first trade.
  assert.deepEqual(book.curve, [{ date: 'Open', equity: DEMO_BOOK.startingEquity }])
})

test('a stop costs exactly the risk and a target pays it times R', () => {
  const book = buildDemoBook([
    signal({ id: 'a', status: 'stop', realisedR: -1, resolvedAt: START + DAY }),
  ])
  // 1% of 50,000 is 500, and a stop is -1R.
  assert.equal(book.equity, 49_500)
  assert.equal(book.closed[0].risk, 500)
  assert.equal(book.closed[0].pnl, -500)

  const won = buildDemoBook([signal({ id: 'b', realisedR: 2, resolvedAt: START + DAY })])
  assert.equal(won.equity, 51_000)
})

test('the book compounds, sizing each trade off the balance standing before it', () => {
  const book = buildDemoBook([
    signal({ id: 'a', realisedR: 2, resolvedAt: START + DAY }),
    signal({ id: 'b', status: 'stop', realisedR: -1, resolvedAt: START + 2 * DAY }),
  ])
  // 50,000 -> +2R on 500 risk = 51,000; then 1% of 51,000 is 510 risked and lost.
  assert.equal(book.closed[0].risk, 500)
  assert.equal(book.closed[1].risk, 510)
  assert.equal(book.equity, 50_490)
})

test('settlement order decides the compounding, not publication order', () => {
  const later = signal({ id: 'late', realisedR: 2, emittedAt: START, resolvedAt: START + 3 * DAY })
  const sooner = signal({
    id: 'soon',
    status: 'stop',
    realisedR: -1,
    emittedAt: START + DAY,
    resolvedAt: START + DAY,
  })
  const book = buildDemoBook([later, sooner])
  assert.deepEqual(
    book.closed.map((trade) => trade.id),
    ['soon', 'late']
  )
})

test('a call the tape never filled is counted and never priced', () => {
  const book = buildDemoBook([
    signal({ id: 'gone', status: 'expired', realisedR: null, resolvedAt: START + DAY }),
  ])
  assert.equal(book.stats.trades, 0)
  assert.equal(book.stats.expired, 1)
  assert.equal(book.stats.published, 1)
  assert.equal(book.equity, DEMO_BOOK.startingEquity)
})

test('an open position carries its risk and moves no balance', () => {
  const book = buildDemoBook([
    signal({ id: 'open', status: 'filled', realisedR: null, resolvedAt: null }),
  ])
  assert.equal(book.equity, DEMO_BOOK.startingEquity)
  assert.equal(book.stats.openCount, 1)
  assert.equal(book.open[0].risk, 500)
})

test('drawdown is measured from the peak the book actually reached', () => {
  const book = buildDemoBook([
    signal({ id: 'a', realisedR: 4, resolvedAt: START + DAY }),
    signal({ id: 'b', status: 'stop', realisedR: -1, resolvedAt: START + 2 * DAY }),
    signal({ id: 'c', status: 'stop', realisedR: -1, resolvedAt: START + 3 * DAY }),
  ])
  // Peak is 52,000 after the winner; two stops off it take back 520 then 514.80.
  assert.equal(book.stats.peak, 52_000)
  assert.ok(Math.abs(book.stats.maxDrawdown - 1034.8) < 0.01)
  assert.ok(Math.abs(book.stats.maxDrawdownPct - 1.99) < 0.01)
})

test('profit factor divides gross win by gross loss', () => {
  const book = buildDemoBook([
    signal({ id: 'a', realisedR: 2, resolvedAt: START + DAY }),
    signal({ id: 'b', status: 'stop', realisedR: -1, resolvedAt: START + 2 * DAY }),
  ])
  // 1,000 won against 510 lost.
  assert.ok(Math.abs(book.stats.profitFactor - 1000 / 510) < 1e-9)
})

test('the curve collapses a day of trades to the balance it closed on', () => {
  const sameDay = START + DAY
  const book = buildDemoBook([
    signal({ id: 'a', realisedR: 2, resolvedAt: sameDay }),
    signal({ id: 'b', status: 'stop', realisedR: -1, resolvedAt: sameDay + 3_600_000 }),
  ])
  // The opening point plus one dated point, not two.
  assert.equal(book.curve.length, 2)
  assert.equal(book.curve[0].date, 'Open')
  assert.equal(book.curve[1].equity, +book.equity.toFixed(2))
})
