import { expectancyInR } from '../../data/riskRules.js'
import { ctDateKey } from '../time.js'

/**
 * Aggregations over closed trades. Everything reports in R first and dollars
 * second, matching how the desk judges itself; consumers pass pre-filtered
 * trade lists so date-range slicing stays in one place (the caller).
 */

/** @param {object[]} trades */
export function closedTrades(trades) {
  return trades
    .filter((trade) => trade.status === 'closed')
    .sort((a, b) => new Date(a.closedAt) - new Date(b.closedAt))
}

/**
 * @param {object[]} closed - closed trades
 * @returns {object} headline stats for a trade set
 */
export function summarize(closed) {
  const base = expectancyInR(closed.map((trade) => ({ realisedR: trade.realizedR ?? 0 })))
  const totalR = closed.reduce((sum, trade) => sum + (trade.realizedR ?? 0), 0)
  const totalPnl = closed.reduce((sum, trade) => sum + (trade.pnl ?? 0), 0)
  const grossWin = closed.reduce((sum, trade) => sum + Math.max(0, trade.pnl ?? 0), 0)
  const grossLoss = closed.reduce((sum, trade) => sum + Math.min(0, trade.pnl ?? 0), 0)
  return {
    trades: closed.length,
    wins: closed.filter((trade) => (trade.realizedR ?? 0) > 0).length,
    losses: closed.filter((trade) => (trade.realizedR ?? 0) < 0).length,
    winRate: base.winRate,
    avgWinR: base.avgWin,
    avgLossR: base.avgLoss,
    expectancyR: base.expectancy,
    totalR,
    totalPnl,
    profitFactor: grossLoss !== 0 ? grossWin / Math.abs(grossLoss) : grossWin > 0 ? Infinity : 0,
  }
}

/**
 * @param {object[]} closed
 * @param {(trade:object) => string} keyOf
 * @param {Array<{id:string, label:string}>} [order] - render order; extras append
 * @returns {Array<object>} per-bucket {@link summarize} rows, empty buckets dropped
 */
export function breakdownBy(closed, keyOf, order) {
  const buckets = new Map()
  for (const trade of closed) {
    const key = keyOf(trade) ?? 'Other'
    if (!buckets.has(key)) buckets.set(key, [])
    buckets.get(key).push(trade)
  }
  const orderedKeys = order
    ? [
        ...order.map((entry) => entry.id).filter((id) => buckets.has(id)),
        ...[...buckets.keys()].filter((key) => !order.some((entry) => entry.id === key)),
      ]
    : [...buckets.keys()]
  return orderedKeys.map((key) => ({
    key,
    label: order?.find((entry) => entry.id === key)?.label ?? key,
    ...summarize(buckets.get(key)),
  }))
}

/**
 * @param {object[]} trades
 * @param {number} startingEquity
 * @returns {Array<{date:string, equity:number}>} equity after each closed trade,
 *   collapsed to one point per CT day, starting from the configured base
 */
export function equityCurve(trades, startingEquity) {
  const closed = closedTrades(trades)
  const byDay = new Map()
  let equity = startingEquity
  for (const trade of closed) {
    equity += trade.pnl ?? 0
    byDay.set(ctDateKey(trade.closedAt), equity)
  }
  return [...byDay.entries()].map(([date, value]) => ({ date, equity: +value.toFixed(2) }))
}

/**
 * @param {object[]} trades
 * @returns {Array<{date:string, pnl:number, r:number, trades:number}>} realized
 *   P&L per CT day, oldest first
 */
export function dailyPnl(trades) {
  const byDay = new Map()
  for (const trade of closedTrades(trades)) {
    const key = ctDateKey(trade.closedAt)
    const entry = byDay.get(key) ?? { date: key, pnl: 0, r: 0, trades: 0 }
    entry.pnl += trade.pnl ?? 0
    entry.r += trade.realizedR ?? 0
    entry.trades += 1
    byDay.set(key, entry)
  }
  return [...byDay.values()]
}

/** Longest win and loss streaks across a closed-trade sequence. */
export function streaks(closed) {
  let bestWin = 0
  let bestLoss = 0
  let currentWin = 0
  let currentLoss = 0
  for (const trade of closed) {
    const r = trade.realizedR ?? 0
    if (r > 0) {
      currentWin += 1
      currentLoss = 0
    } else if (r < 0) {
      currentLoss += 1
      currentWin = 0
    }
    bestWin = Math.max(bestWin, currentWin)
    bestLoss = Math.max(bestLoss, currentLoss)
  }
  return { bestWin, bestLoss }
}
