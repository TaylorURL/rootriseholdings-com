/**
 * Risk rules — the desk's trading constraints.
 *
 * The journal holds them at entry (lib/journal/rules.js) and every surface
 * renders against the same constants, so a rule change here changes both the
 * gate and the copy. The account limits block outright; the setup-quality
 * minimum is a departure the ticket carries.
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
    detail: 'Conservative mode: once realized loss for the session reaches 0.5%, the desk is done.',
  },
  {
    id: 'min-rr',
    label: 'Minimum 1:2 reward-to-risk',
    detail:
      'Target at least 2R from entry. A ticket below it logs with the departure marked against it.',
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
  {
    id: 'BOS',
    label: 'BOS',
    longLabel: 'Break of Structure',
    detail: 'Trend-continuation break of the most recent swing high (uptrend) or low (downtrend).',
  },
  {
    id: 'CHoCH',
    label: 'CHoCH',
    longLabel: 'Change of Character',
    detail: 'The first counter-trend structure break, and the earliest tell of a reversal.',
  },
  {
    id: 'OTE',
    label: 'OTE',
    longLabel: 'Optimal Trade Entry',
    detail: 'Pullback into the 62–79% retracement zone of the prior leg for the cleanest R:R.',
  },
]

/**
 * Trading sessions referenced across journal/briefing surfaces (ICT-style).
 * Minute windows are Central Time; Asia wraps past midnight. Listed in
 * precedence order for {@link sessionForCtMinutes} — London wins its 02:00 –
 * 03:00 overlap with Asia because the desk trades that hour as the London open.
 */
export const SESSIONS = [
  {
    id: 'New York AM',
    label: 'New York AM',
    window: '07:00 – 10:00 CT',
    startMinCT: 7 * 60,
    endMinCT: 10 * 60,
  },
  {
    id: 'New York PM',
    label: 'New York PM',
    window: '13:30 – 16:00 CT',
    startMinCT: 13 * 60 + 30,
    endMinCT: 16 * 60,
  },
  {
    id: 'London',
    label: 'London',
    window: '02:00 – 05:00 CT',
    startMinCT: 2 * 60,
    endMinCT: 5 * 60,
  },
  { id: 'Asia', label: 'Asia', window: '18:00 – 03:00 CT', startMinCT: 18 * 60, endMinCT: 3 * 60 },
]

/**
 * @param {number} minutes - minutes since midnight, Central Time
 * @returns {string | null} matching session id, or null between sessions
 */
export function sessionForCtMinutes(minutes) {
  for (const session of SESSIONS) {
    const wraps = session.endMinCT < session.startMinCT
    const inWindow = wraps
      ? minutes >= session.startMinCT || minutes < session.endMinCT
      : minutes >= session.startMinCT && minutes < session.endMinCT
    if (inWindow) return session.id
  }
  return null
}

/**
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
 * Expectancy expressed in R per trade.
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
  const avgWin = wins.length
    ? wins.reduce((sum, trade) => sum + trade.realisedR, 0) / wins.length
    : 0
  const avgLoss = losses.length
    ? Math.abs(losses.reduce((sum, trade) => sum + trade.realisedR, 0) / losses.length)
    : 0
  const expectancy = winRate * avgWin - lossRate * avgLoss
  return { winRate, lossRate, avgWin, avgLoss, expectancy }
}
