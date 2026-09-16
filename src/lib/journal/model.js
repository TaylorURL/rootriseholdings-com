import { RISK_RULES, computeRewardToRisk, computeRealisedR } from '../../data/riskRules.js'
import { INSTRUMENT_META, allowsSide, describeSideConstraint } from '../../data/instruments.js'
import { sessionForMoment } from '../time.js'

/**
 * Trade model. The journal is R-based: each trade stores the dollar risk the
 * stop represents, and realized P&L is derived as realizedR × riskAmount. That
 * keeps the math broker-agnostic — no per-instrument contract sizes — while
 * every number the rules care about (risk %, R multiples, daily loss) stays
 * exact.
 */
export const TRADE_GRADES = ['A+', 'A', 'B']

const TRADE_STATUS = { open: 'open', closed: 'closed' }

let idCounter = 0

/** Collision-safe id without depending on crypto.randomUUID availability. */
function nextTradeId(now) {
  idCounter += 1
  return `T${now.getTime().toString(36)}${idCounter.toString(36)}`
}

/**
 * @param {object} draft - raw form values
 * @param {string} draft.symbol
 * @param {'BUY'|'SELL'} draft.side
 * @param {number} draft.entry
 * @param {number} draft.stop
 * @param {number} draft.target
 * @param {number} draft.riskPct - percent of equity the stop represents
 * @param {string} draft.setup - BOS | CHoCH | OTE
 * @param {string} draft.grade - A+ | A | B
 * @param {number} equity - account equity at entry time
 * @returns {{plannedRR:number, riskAmount:number, perR:number}}
 */
export function deriveTradeNumbers(draft, equity) {
  const plannedRR = computeRewardToRisk({
    entry: Number(draft.entry),
    stop: Number(draft.stop),
    target: Number(draft.target),
    side: draft.side,
  })
  const riskAmount = equity > 0 ? (equity * Number(draft.riskPct || 0)) / 100 : 0
  return { plannedRR, riskAmount, perR: riskAmount }
}

/**
 * Field-level validation for a trade draft. Rule-book gating (daily limits,
 * caps) lives in rules.js — this only answers whether the numbers make sense.
 *
 * @param {object} draft
 * @returns {Record<string, string>} field → message, empty when valid
 */
export function validateTradeDraft(draft) {
  const errors = {}
  const entry = Number(draft.entry)
  const stop = Number(draft.stop)
  const target = Number(draft.target)
  const riskPct = Number(draft.riskPct)
  const size = draft.size === '' || draft.size == null ? null : Number(draft.size)

  if (!draft.symbol) errors.symbol = 'Pick an instrument.'
  if (draft.side !== 'BUY' && draft.side !== 'SELL') errors.side = 'Pick a side.'
  if (!Number.isFinite(entry) || entry <= 0) errors.entry = 'Enter the entry price.'
  if (!Number.isFinite(stop) || stop <= 0) errors.stop = 'Enter the stop price.'
  if (!Number.isFinite(target) || target <= 0) errors.target = 'Enter the target price.'
  if (!Number.isFinite(riskPct) || riskPct <= 0) errors.riskPct = 'Enter the risk percent.'
  if (size != null && (!Number.isFinite(size) || size <= 0))
    errors.size = 'Size must be a positive number.'
  if (!TRADE_GRADES.includes(draft.grade)) errors.grade = 'Pick a grade.'
  if (!draft.setup) errors.setup = 'Pick a setup type.'

  if (!errors.entry && !errors.stop) {
    if (draft.side === 'BUY' && stop >= entry) errors.stop = 'A long stop sits below the entry.'
    if (draft.side === 'SELL' && stop <= entry) errors.stop = 'A short stop sits above the entry.'
  }
  if (!errors.entry && !errors.target) {
    if (draft.side === 'BUY' && target <= entry)
      errors.target = 'A long target sits above the entry.'
    if (draft.side === 'SELL' && target >= entry)
      errors.target = 'A short target sits below the entry.'
  }

  const meta = INSTRUMENT_META[draft.symbol]
  if (meta && !allowsSide(meta.sideConstraint, draft.side)) {
    const allowed = describeSideConstraint(meta.sideConstraint).toLowerCase()
    errors.side = `${meta.displaySymbol} is ${allowed} in the playbook.`
  }

  return errors
}

/**
 * @param {object} draft - validated form values (see {@link validateTradeDraft})
 * @param {object} context
 * @param {number} context.equity - account equity at entry
 * @param {Date} [context.now]
 * @returns {object} a persisted-shape open trade
 */
export function createTrade(draft, { equity, now = new Date() }) {
  const { plannedRR, riskAmount } = deriveTradeNumbers(draft, equity)
  return {
    id: nextTradeId(now),
    symbol: draft.symbol,
    side: draft.side,
    entry: Number(draft.entry),
    stop: Number(draft.stop),
    target: Number(draft.target),
    size: draft.size === '' || draft.size == null ? null : Number(draft.size),
    riskPct: Number(draft.riskPct),
    riskAmount,
    plannedRR,
    setup: draft.setup,
    grade: draft.grade,
    session: draft.session || sessionForMoment(now) || 'Off-Session',
    timeframe: draft.timeframe || INSTRUMENT_META[draft.symbol]?.primaryTimeframe || null,
    note: draft.note?.trim() || null,
    // Which rules this entry knowingly left. An empty list is a trade inside
    // the book; the marks are what let the stats separate the two.
    departures: Array.isArray(draft.acknowledged) ? [...draft.acknowledged] : [],
    status: TRADE_STATUS.open,
    openedAt: now.toISOString(),
    closedAt: null,
    exitPrice: null,
    realizedR: null,
    pnl: null,
  }
}

/**
 * @param {object} trade - an open trade
 * @param {object} exit
 * @param {number} exit.exitPrice
 * @param {Date} [exit.now]
 * @returns {object} the closed trade with realizedR and pnl filled in
 */
export function closeTrade(trade, { exitPrice, now = new Date() }) {
  const realizedR = computeRealisedR({
    entry: trade.entry,
    stop: trade.stop,
    exit: Number(exitPrice),
    side: trade.side,
  })
  return {
    ...trade,
    status: TRADE_STATUS.closed,
    exitPrice: Number(exitPrice),
    closedAt: now.toISOString(),
    realizedR,
    pnl: realizedR * trade.riskAmount,
  }
}

/**
 * Suggested position size for the drafted risk. Depends on the per-point
 * dollar value of one unit, which is broker-specific, so it comes from the
 * user's instrument settings rather than static metadata. Returns null when it
 * cannot be computed honestly.
 *
 * @param {object} draft
 * @param {number} equity
 * @param {number | null | undefined} pointValue - dollars per point for 1.0 unit
 * @returns {number | null} units such that a stop-out loses riskPct of equity
 */
export function suggestedSize(draft, equity, pointValue) {
  const entry = Number(draft.entry)
  const stop = Number(draft.stop)
  const riskPct = Number(draft.riskPct)
  if (!pointValue || !Number.isFinite(entry) || !Number.isFinite(stop) || entry === stop)
    return null
  if (!Number.isFinite(riskPct) || riskPct <= 0 || equity <= 0) return null
  const riskAmount = (equity * riskPct) / 100
  const stopDistance = Math.abs(entry - stop)
  return riskAmount / (stopDistance * pointValue)
}

/** Rule-book cross-check: planned R:R versus the 1:2 minimum. */
export function meetsMinimumRR(plannedRR) {
  return plannedRR >= RISK_RULES.minRewardToRisk
}
