import { RISK_RULES } from '../../data/riskRules.js'
import { ctDateKey } from '../time.js'
import { meetsMinimumRR } from './model.js'

/**
 * The rule book as a gate. `computeDayState` reduces the journal to what the
 * rules need to know about today; `evaluateTradeGate` turns that plus a draft
 * into a block, departure or warning verdict. Pages render from these instead of
 * re-deriving rule math, so every surface agrees on whether the desk is open.
 */

/** Realized R below this counts as a loss; above the mirror value, a win. */
const BREAKEVEN_EPSILON = 0.05

/**
 * @param {object} args
 * @param {object[]} args.trades - all journal trades
 * @param {number} args.equity - current account equity
 * @param {Date | string | number} [args.now]
 * @returns {object} today's totals, streaks, caps, and lockout list
 */
export function computeDayState({ trades, equity, now = new Date() }) {
  const todayKey = ctDateKey(now)

  const closedToday = trades
    .filter((trade) => trade.status === 'closed' && ctDateKey(trade.closedAt) === todayKey)
    .sort((a, b) => new Date(a.closedAt) - new Date(b.closedAt))
  const openedToday = trades.filter((trade) => ctDateKey(trade.openedAt) === todayKey)
  const openTrades = trades.filter((trade) => trade.status === 'open')

  const realizedPnl = closedToday.reduce((sum, trade) => sum + (trade.pnl ?? 0), 0)
  const realizedR = closedToday.reduce((sum, trade) => sum + (trade.realizedR ?? 0), 0)
  const dailyLossPct = equity > 0 ? (Math.min(0, realizedPnl) / equity) * 100 : 0
  const dailyLossLimitHit = Math.abs(dailyLossPct) >= RISK_RULES.dailyLossLimitPct

  let consecutiveLosses = 0
  for (let i = closedToday.length - 1; i >= 0; i--) {
    const r = closedToday[i].realizedR ?? 0
    if (r < -BREAKEVEN_EPSILON) consecutiveLosses += 1
    else if (r > BREAKEVEN_EPSILON) break
    // Breakeven exits neither extend nor reset the streak.
  }
  const consecutiveLossStopHit = consecutiveLosses >= RISK_RULES.maxConsecutiveLosses

  const aPlusUsed = openedToday.filter((trade) => trade.grade === 'A+').length
  const aPlusCapHit = aPlusUsed >= RISK_RULES.maxAPlusSetupsPerDay

  const openRiskPct = openTrades.reduce((sum, trade) => sum + (trade.riskPct ?? 0), 0)

  const lockouts = []
  if (dailyLossLimitHit) {
    lockouts.push({
      id: 'daily-loss-limit',
      label: 'Daily loss limit hit',
      detail: `Realized ${dailyLossPct.toFixed(2)}% today against the ${RISK_RULES.dailyLossLimitPct}% limit.`,
    })
  }
  if (consecutiveLossStopHit) {
    lockouts.push({
      id: 'consecutive-loss-stop',
      label: 'Two consecutive losses',
      detail: 'The hard stop is in force. The desk is closed for the day.',
    })
  }

  return {
    dateKey: todayKey,
    closedToday,
    openedToday,
    openTrades,
    realizedPnl,
    realizedR,
    dailyLossPct,
    dailyLossBudgetLeftPct: Math.max(0, RISK_RULES.dailyLossLimitPct + dailyLossPct),
    dailyLossLimitHit,
    consecutiveLosses,
    consecutiveLossStopHit,
    aPlusUsed,
    aPlusLeft: Math.max(0, RISK_RULES.maxAPlusSetupsPerDay - aPlusUsed),
    aPlusCapHit,
    openRiskPct,
    locked: lockouts.length > 0,
    lockouts,
  }
}

/**
 * The pre-trade gate, in three strengths.
 *
 * Blocks stop the entry outright. Departures let it through once the trader
 * says out loud that this one leaves the rule book, and the trade carries that
 * mark afterwards. Warnings only flag.
 *
 * Where a rule sits decides what the journal ends up holding. A desk does not
 * only take the setups its rules describe, and a journal that refuses the rest
 * does not become a stricter desk - it becomes a journal of the trades that
 * happened to fit, which is the one thing a journal must not be. So the
 * reward-to-risk minimum is a departure: the number is still shown against the
 * rule, the entry is still marked, and the record stays true. The lockouts and
 * the risk cap block, because those are the account's limits rather than the
 * setup's quality, and a trade past them costs money the rules exist to keep.
 *
 * @param {object} args
 * @param {object} args.draft - the trade draft, including any acknowledged
 *   departure ids
 * @param {number} args.plannedRR - derived planned reward-to-risk
 * @param {object} args.dayState - from {@link computeDayState}
 * @returns {{blocks:string[], warnings:string[], departures:object[],
 *   unacknowledged:object[], allowed:boolean}}
 */
export function evaluateTradeGate({ draft, plannedRR, dayState }) {
  const blocks = []
  const warnings = []
  const departures = []

  for (const lockout of dayState.lockouts) {
    blocks.push(`${lockout.label}. ${lockout.detail}`)
  }

  const riskPct = Number(draft.riskPct)
  if (Number.isFinite(riskPct) && riskPct > RISK_RULES.maxRiskPerTradePct) {
    blocks.push(
      `Risk is ${riskPct.toFixed(2)}%. The cap is ${RISK_RULES.maxRiskPerTradePct}% per trade.`
    )
  }

  if (Number.isFinite(plannedRR) && plannedRR > 0 && !meetsMinimumRR(plannedRR)) {
    departures.push({
      id: 'below-min-rr',
      label: `Below the ${RISK_RULES.minRewardToRisk.toFixed(0)}:1 minimum`,
      detail: `Planned R:R is ${plannedRR.toFixed(2)}:1 against a ${RISK_RULES.minRewardToRisk.toFixed(0)}:1 rule. Log it and the trade carries the mark.`,
    })
  }

  if (draft.grade === 'A+' && dayState.aPlusCapHit) {
    blocks.push(
      `Both A+ slots are used today (${dayState.aPlusUsed}/${RISK_RULES.maxAPlusSetupsPerDay}).`
    )
  }

  if (dayState.consecutiveLosses === 1) {
    warnings.push('One loss on the books. The next loss closes the day.')
  }
  const projectedLossPct =
    Math.abs(dayState.dailyLossPct) + (Number.isFinite(riskPct) ? riskPct : 0)
  if (!dayState.dailyLossLimitHit && projectedLossPct > RISK_RULES.dailyLossLimitPct) {
    warnings.push(
      `A full stop-out would take the day to -${projectedLossPct.toFixed(2)}%, past the ${RISK_RULES.dailyLossLimitPct}% daily limit.`
    )
  }

  const acknowledged = new Set(draft.acknowledged ?? [])
  const unacknowledged = departures.filter((departure) => !acknowledged.has(departure.id))

  return {
    blocks,
    warnings,
    departures,
    unacknowledged,
    allowed: blocks.length === 0 && unacknowledged.length === 0,
  }
}
