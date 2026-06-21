/**
 * Risk rules — the desk's strict, non-negotiable trading constraints.
 *
 * These flow through the journal UI (position cards, summary panels, history
 * stats) so violations surface visually rather than being buried in copy.
 */
export const RISK_RULES = {
  maxRiskPerTradePct: 1.0,
  dailyLossLimitPct: 0.5,
  minRewardToRisk: 2.0,
  maxConsecutiveLosses: 2,
  maxAPlusSetupsPerDay: 2,
}

/** Human-readable explanation list used on journal/insights surfaces. */
export const RISK_RULES_DESCRIPTIONS = [
  {
    id: 'risk-per-trade',
    label: 'Max 1% risk per trade',
    detail: 'Position sizing capped so a full stop-out costs at most 1% of equity.',
  },
  {
    id: 'daily-loss-limit',
    label: '0.5% daily loss limit',
    detail: 'Conservative mode — if realized loss for the session hits 0.5%, the desk is done.',
  },
  {
    id: 'min-rr',
    label: 'Minimum 1:2 reward-to-risk',
    detail: 'Skip any setup that does not target at least 2R from entry.',
  },
  {
    id: 'consecutive-loss-stop',
    label: 'Hard stop after 2 consecutive losses',
    detail: 'Two losers in a row closes the trading day, no exceptions.',
  },
  {
    id: 'aplus-cap',
    label: 'Cap of 2 "A+" setups per day',
    detail: 'Even when the tape is firing, no more than two A+ executions to avoid overtrading.',
  },
]

/** Setup-type vocabulary used by signals and journal entries. */
export const SETUP_TYPES = [
  { id: 'BOS', label: 'BOS', longLabel: 'Break of Structure', detail: 'Trend-continuation break of the most recent swing high (uptrend) or low (downtrend).' },
  { id: 'CHoCH', label: 'CHoCH', longLabel: 'Change of Character', detail: 'First counter-trend structure break — earliest tell of a reversal.' },
  { id: 'OTE', label: 'OTE', longLabel: 'Optimal Trade Entry', detail: 'Pullback into the 62–79% retracement zone of the prior leg for the cleanest R:R.' },
]

/** Trading sessions referenced across journal/briefing surfaces (ICT-style). */
export const SESSIONS = [
  { id: 'Asia', label: 'Asia', window: '18:00 – 03:00 CT' },
  { id: 'London', label: 'London', window: '02:00 – 05:00 CT' },
  { id: 'New York AM', label: 'New York AM', window: '07:00 – 10:00 CT' },
  { id: 'New York PM', label: 'New York PM', window: '13:30 – 16:00 CT' },
]

/**
 * Reward-to-risk ratio implied by an entry / stop / target triple. SMC playbook
 * caps at the minimum 1:2 floor; output is the raw multiple (reward / risk).
 *
 * @param {object} args
 * @param {number} args.entry
 * @param {number} args.stop
 * @param {number} args.target
 * @param {'BUY'|'SELL'} args.side
 */
export function computeRewardToRisk({ entry, stop, target, side }) {
  const isLong = side === 'BUY'
  const risk = isLong ? entry - stop : stop - entry
  const reward = isLong ? target - entry : entry - target
  if (risk <= 0) return 0
  return reward / risk
}

/**
 * R-multiple realised on a closed trade — i.e. how many "R" units of risk the
 * exit cleared. +2.0R means twice the planned risk was made; -1.0R means a full
 * stop-out.
 */
export function computeRealisedR({ entry, stop, exit, side }) {
  const isLong = side === 'BUY'
  const risk = isLong ? entry - stop : stop - entry
  if (risk <= 0) return 0
  const move = isLong ? exit - entry : entry - exit
  return move / risk
}

/**
 * Expectancy expressed in R per trade — the canonical SMC metric.
 *
 *   expectancy = (winRate * avgWin_R) − (lossRate * avgLoss_R)
 *
 * `avgLoss_R` is taken as a positive magnitude so the subtraction reads
 * naturally. A positive expectancy means each trade is, on average, additive.
 *
 * @param {{realisedR:number}[]} closedTrades
 */
export function expectancyInR(closedTrades) {
  if (!closedTrades.length) return { winRate: 0, avgWin: 0, avgLoss: 0, expectancy: 0, lossRate: 0 }
  const wins = closedTrades.filter((trade) => trade.realisedR > 0)
  const losses = closedTrades.filter((trade) => trade.realisedR <= 0)
  const winRate = wins.length / closedTrades.length
  const lossRate = losses.length / closedTrades.length
  const avgWin = wins.length ? wins.reduce((sum, trade) => sum + trade.realisedR, 0) / wins.length : 0
  const avgLoss = losses.length
    ? Math.abs(losses.reduce((sum, trade) => sum + trade.realisedR, 0) / losses.length)
    : 0
  const expectancy = winRate * avgWin - lossRate * avgLoss
  return { winRate, lossRate, avgWin, avgLoss, expectancy }
}

/** Run a list of closed trades through the rule book and flag violations. */
export function evaluateRuleStatus({ todayTrades, equity, aPlusToday }) {
  const dailyRealisedPnl = todayTrades.reduce((sum, trade) => sum + (trade.pnl ?? 0), 0)
  const dailyLossPct = equity > 0 ? Math.min(0, dailyRealisedPnl) / equity * 100 : 0

  let consecutiveLosses = 0
  for (let i = todayTrades.length - 1; i >= 0; i--) {
    if ((todayTrades[i].pnl ?? 0) < 0) consecutiveLosses += 1
    else break
  }

  return {
    dailyRealisedPnl,
    dailyLossPct,
    dailyLossPctRemaining: Math.max(0, RISK_RULES.dailyLossLimitPct + dailyLossPct),
    dailyLossLimitHit: Math.abs(dailyLossPct) >= RISK_RULES.dailyLossLimitPct,
    consecutiveLosses,
    consecutiveLossStopHit: consecutiveLosses >= RISK_RULES.maxConsecutiveLosses,
    aPlusToday,
    aPlusRemaining: Math.max(0, RISK_RULES.maxAPlusSetupsPerDay - aPlusToday),
    aPlusCapHit: aPlusToday >= RISK_RULES.maxAPlusSetupsPerDay,
  }
}
