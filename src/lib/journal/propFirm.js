import { dailyPnl } from './stats.js'

/**
 * Prop-firm evaluation math. A firm config plus the journal's closed trades
 * yields drawdown floors, target progress, and the consistency check. All of
 * it derives from realized P&L — open positions do not move a firm's official
 * balance until they close.
 *
 * @typedef {object} PropFirmConfig
 * @property {string} id
 * @property {string} firmName
 * @property {string} programName
 * @property {number} startingBalance
 * @property {number} profitTarget - dollars above starting balance
 * @property {number} maxDrawdown - dollars of total drawdown allowed
 * @property {'static'|'trailing'} drawdownType - trailing follows the realized
 *   high-water mark; static floors from the starting balance
 * @property {number | null} dailyLossLimit - dollars per day, when the firm has one
 * @property {number | null} consistencyCapPct - max share of profit one day may hold
 * @property {number | null} minTradingDays
 */

/**
 * @param {PropFirmConfig} firm
 * @param {object[]} trades - journal trades (closed ones drive the math)
 * @returns {object} evaluation snapshot
 */
export function evaluatePropFirm(firm, trades) {
  const days = dailyPnl(trades)

  let balance = firm.startingBalance
  let highWaterMark = firm.startingBalance
  let worstDay = 0
  for (const day of days) {
    balance += day.pnl
    highWaterMark = Math.max(highWaterMark, balance)
    worstDay = Math.min(worstDay, day.pnl)
  }

  const trailingFloor = highWaterMark - firm.maxDrawdown
  const staticFloor = firm.startingBalance - firm.maxDrawdown
  const drawdownFloor = firm.drawdownType === 'trailing' ? trailingFloor : staticFloor
  const drawdownUsed = Math.max(
    0,
    (firm.drawdownType === 'trailing' ? highWaterMark : firm.startingBalance) - balance
  )
  const drawdownBuffer = balance - drawdownFloor

  const profitMade = balance - firm.startingBalance
  const bestDayPnl = days.reduce((best, day) => Math.max(best, day.pnl), 0)
  const consistencyShare = profitMade > 0 ? (bestDayPnl / profitMade) * 100 : 0
  const consistencyBreached =
    firm.consistencyCapPct != null && profitMade > 0 && consistencyShare > firm.consistencyCapPct

  const daysTraded = days.length
  const targetProgressPct =
    firm.profitTarget > 0 ? Math.max(0, (profitMade / firm.profitTarget) * 100) : 0

  return {
    balance,
    highWaterMark,
    profitMade,
    profitTarget: firm.profitTarget,
    targetProgressPct,
    targetRemaining: Math.max(0, firm.profitTarget - profitMade),
    targetReached: profitMade >= firm.profitTarget,
    drawdownFloor,
    drawdownUsed,
    drawdownBuffer,
    drawdownBusted: balance <= drawdownFloor,
    worstDay,
    bestDayPnl,
    consistencyShare,
    consistencyBreached,
    daysTraded,
    minTradingDays: firm.minTradingDays ?? null,
    minDaysMet: firm.minTradingDays == null || daysTraded >= firm.minTradingDays,
  }
}
