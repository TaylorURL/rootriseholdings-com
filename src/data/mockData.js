/**
 * Mock data for the gated terminal — modelled around the desk's actual Smart
 * Money Concepts (SMC) playbook. Every position, trade, and signal carries the
 * setup type (BOS / CHoCH / OTE), the session it triggered in, planned R:R,
 * and (for closed trades) the realised R-multiple.
 *
 * TODO(data): swap the static arrays below for live trade-journal / signal
 * streams when the backend ships. The journal/dashboards consume this module
 * directly; downstream R-math + rule enforcement lives in `./riskRules.js`.
 */
import { computeRealisedR, computeRewardToRisk } from './riskRules'

export const account = {
  balance: 124850.32,
  equity: 127234.18,
  margin: 3200.0,
  freeMargin: 124034.18,
  marginLevel: 3976.07,
  openPositions: 4,
  todayPnl: +1842.18,
  todayPnlPct: +1.45,
  weekPnl: +5120.44,
  weekPnlPct: +4.27,
  monthPnl: +14982.6,
  monthPnlPct: +13.65,
  accountNumber: '8042157',
  leverage: '1:100',
  currency: 'USD',
  server: 'RR-Live-01',
  accountType: 'Prop Firm — Funded',
  holder: 'Root & Rise Capital',
}

/**
 * Prop-firm account state. Trailing + static drawdown limits, profit target,
 * and the consistency rule (no single day may contribute > 30% of total profit).
 */
export const propFirm = {
  firmName: 'Apex Capital',
  programName: '$150K Evaluation — Stage 1',
  startingBalance: 150000.0,
  currentBalance: 124850.32,
  profitTarget: 9000.0,
  profitMade: 5120.44,
  staticDrawdown: 6000.0,
  trailingDrawdown: 6000.0,
  trailingHighWaterMark: 127234.18,
  trailingDrawdownLevel: 121234.18,
  staticDrawdownLevel: 144000.0,
  consistencyRulePct: 30,
  bestDayPnl: 1842.18,
  daysTraded: 12,
  minDaysRequired: 10,
  evaluationDeadline: '2026-07-31',
}

/**
 * Open positions — currently in the four primary instruments. `setup`, `session`,
 * `timeframe`, `riskPct`, `plannedRR`, `isAPlus` are SMC playbook fields.
 */
export const openPositions = [
  {
    id: 'P001',
    symbol: 'XAUUSD',
    type: 'BUY',
    size: 0.5,
    entryPrice: 2356.40,
    currentPrice: 2364.18,
    stopLoss: 2347.80,
    takeProfit: 2385.00,
    openTime: '2026-06-14 06:32',
    pnl: +389.0,
    movePts: +7.78,
    setup: 'OTE',
    session: 'London',
    timeframe: '1H',
    riskPct: 0.8,
    plannedRR: 3.3,
    isAPlus: true,
    note: 'Daily/4H bullish, 1H OTE tap — first A+ of the day.',
  },
  {
    id: 'P002',
    symbol: 'NAS100',
    type: 'SELL',
    size: 1.0,
    entryPrice: 19890.4,
    currentPrice: 19842.6,
    stopLoss: 19932.0,
    takeProfit: 19742.0,
    openTime: '2026-06-14 07:15',
    pnl: +478.0,
    movePts: +47.8,
    setup: 'CHoCH',
    session: 'New York AM',
    timeframe: '15m',
    riskPct: 0.9,
    plannedRR: 3.6,
    isAPlus: true,
    note: '4H CHoCH live, 15m OTE short — second A+ of the day, day-cap reached.',
  },
  {
    id: 'P003',
    symbol: 'US30',
    type: 'BUY',
    size: 0.3,
    entryPrice: 39392.0,
    currentPrice: 39418.0,
    stopLoss: 39320.0,
    takeProfit: 39560.0,
    openTime: '2026-06-13 22:48',
    pnl: +78.0,
    movePts: +26.0,
    setup: 'BOS',
    session: 'Asia',
    timeframe: '1H',
    riskPct: 0.7,
    plannedRR: 2.3,
    isAPlus: false,
    note: '1H BOS continuation off Asia low; B-tier setup.',
  },
  {
    id: 'P004',
    symbol: 'SP500',
    type: 'SELL',
    size: 0.5,
    entryPrice: 5492.6,
    currentPrice: 5482.4,
    stopLoss: 5499.0,
    takeProfit: 5460.0,
    openTime: '2026-06-14 09:04',
    pnl: +255.0,
    movePts: +10.2,
    setup: 'OTE',
    session: 'New York AM',
    timeframe: '15m',
    riskPct: 0.6,
    plannedRR: 5.1,
    isAPlus: false,
    note: 'Playbook short — fade into prior swing supply.',
  },
]

/**
 * SMC signals surfaced by the structure engine ("Gemini Market Structure Pro").
 * Each carries the setup type, session, multi-timeframe context, and a planned
 * R:R that already respects the 1:2 minimum.
 */
export const insights = [
  {
    id: 'SIG001',
    symbol: 'XAUUSD',
    direction: 'BUY',
    confidence: 91,
    entry: 2356.40,
    target: 2385.00,
    stopLoss: 2347.80,
    rrRatio: 3.33,
    setup: 'OTE',
    session: 'London',
    timeframe: '1H',
    biasTimeframes: ['Daily', '4H'],
    isAPlus: true,
    catalysts: ['Daily HH/HL intact', '1H bullish CHoCH at 2,354', 'DXY rolling over'],
    rationale:
      'Daily and 4H bias both bullish. London open delivered a 1H CHoCH at 2,354, opening a clean OTE long against the prior demand block.',
  },
  {
    id: 'SIG002',
    symbol: 'NAS100',
    direction: 'SELL',
    confidence: 88,
    entry: 19890.4,
    target: 19742.0,
    stopLoss: 19932.0,
    rrRatio: 3.54,
    setup: 'CHoCH',
    session: 'New York AM',
    timeframe: '15m',
    biasTimeframes: ['1H', '4H'],
    isAPlus: true,
    catalysts: ['4H CHoCH yesterday', '15m sweep of equal highs', 'Tech leadership rolling'],
    rationale:
      '4H CHoCH is the lower-timeframe permission slip. 15m swept the equal highs at 19,902 and printed a bearish FVG — OTE short against the new structure.',
  },
  {
    id: 'SIG003',
    symbol: 'US30',
    direction: 'BUY',
    confidence: 72,
    entry: 39392.0,
    target: 39560.0,
    stopLoss: 39320.0,
    rrRatio: 2.33,
    setup: 'BOS',
    session: 'Asia',
    timeframe: '1H',
    biasTimeframes: ['4H', 'Daily'],
    isAPlus: false,
    catalysts: ['1H BOS off Asia low', 'Higher-timeframe range intact'],
    rationale:
      '1H BOS continuation in line with the higher-timeframe range. B-tier — sized smaller than the A+ tickets.',
  },
  {
    id: 'SIG004',
    symbol: 'SP500',
    direction: 'SELL',
    confidence: 69,
    entry: 5492.6,
    target: 5460.0,
    stopLoss: 5499.0,
    rrRatio: 5.09,
    setup: 'OTE',
    session: 'New York AM',
    timeframe: '15m',
    biasTimeframes: ['1H', '4H'],
    isAPlus: false,
    catalysts: ['Playbook shorts-only', '15m OTE into prior swing'],
    rationale:
      'Playbook constraint — SP500 is shorts only. 15m OTE into the prior swing supply gives an outsized R:R but lower conviction than the gold/NAS plays.',
  },
  {
    id: 'SIG005',
    symbol: 'XAUUSD',
    direction: 'SELL',
    confidence: 41,
    entry: 2378.50,
    target: 2360.00,
    stopLoss: 2384.20,
    rrRatio: 3.25,
    setup: 'CHoCH',
    session: 'New York PM',
    timeframe: '1H',
    biasTimeframes: ['Daily'],
    isAPlus: false,
    catalysts: ['Counter-trend — daily bias still long'],
    rationale:
      'CHoCH against the higher-timeframe trend — flagged but skipped by the playbook (daily bias rules).',
  },
]

export const performance = {
  winRate: 67,
  profitFactor: 2.14,
  avgTradeDuration: '2h 48m',
  totalTrades: 87,
  bestStreak: 6,
}

/** Realised P&L per month for the current trading year (Jun is month-to-date). */
export const monthlyPnl = [
  { month: 'Jan', pnl: +6420.5 },
  { month: 'Feb', pnl: -2180.25 },
  { month: 'Mar', pnl: +9340.8 },
  { month: 'Apr', pnl: +4120.4 },
  { month: 'May', pnl: -1560.1 },
  { month: 'Jun', pnl: +14982.6 },
]

/** Live market session snapshot for the markets status banner. */
export const marketStatus = {
  state: 'Open',
  session: 'New York AM',
  liquidity: 'High Liquidity',
}

/** Aggregate sentiment composite shown on Insights. */
export const marketSentiment = [
  { id: 'usd', label: 'USD (DXY)', value: 'Bearish', tone: 'sell' },
  { id: 'risk', label: 'Risk Appetite', value: 'Defensive', tone: 'sell' },
  { id: 'gold', label: 'Gold Flow', value: 'Bid', tone: 'buy' },
]

/**
 * Net exposure across the four traded instruments. Reflects the current open
 * book, sums to 100%.
 */
export const instrumentExposure = [
  { symbol: 'XAUUSD', exposure: 38 },
  { symbol: 'NAS100', exposure: 31 },
  { symbol: 'US30', exposure: 18 },
  { symbol: 'SP500', exposure: 13 },
]

/** Recent journal events (relative to 2026-06-14). */
export const activityFeed = [
  { id: 'A1', time: '14 Jun · 09:04', type: 'position', message: 'Position P004 opened — SP500 SHORT 0.5 lots (OTE / 15m)' },
  { id: 'A2', time: '14 Jun · 07:15', type: 'position', message: 'Position P002 opened — NAS100 SHORT 1.0 lots · A+ (CHoCH / 15m)' },
  { id: 'A3', time: '14 Jun · 06:32', type: 'position', message: 'Position P001 opened — XAUUSD LONG 0.5 lots · A+ (OTE / 1H)' },
  { id: 'A4', time: '14 Jun · 06:00', type: 'briefing', message: 'Morning briefing published — 9-section read' },
  { id: 'A5', time: '13 Jun · 18:45', type: 'closed', message: 'T1044 closed — XAUUSD +2.6R · +$844.00' },
]

/**
 * Closed trades — each carries setup, session, planned R:R, and the realised R.
 * Trades are ordered most-recent-first.
 */
export const tradeHistory = (() => {
  const raw = [
    { id: 'T1044', symbol: 'XAUUSD', type: 'BUY', size: 0.5, entryPrice: 2341.20, exitPrice: 2358.40, stopLoss: 2334.80, openTime: '2026-06-13 14:22', closeTime: '2026-06-13 18:45', setup: 'OTE', session: 'London', timeframe: '1H', isAPlus: true, pnl: +860.0 },
    { id: 'T1043', symbol: 'NAS100', type: 'SELL', size: 0.8, entryPrice: 19960.4, exitPrice: 19888.2, stopLoss: 19998.0, openTime: '2026-06-13 09:10', closeTime: '2026-06-13 14:05', setup: 'BOS', session: 'New York AM', timeframe: '15m', isAPlus: false, pnl: +578.0 },
    { id: 'T1042', symbol: 'SP500', type: 'SELL', size: 0.4, entryPrice: 5498.6, exitPrice: 5503.2, stopLoss: 5503.0, openTime: '2026-06-12 20:33', closeTime: '2026-06-13 08:12', setup: 'OTE', session: 'New York PM', timeframe: '15m', isAPlus: false, pnl: -184.0 },
    { id: 'T1041', symbol: 'XAUUSD', type: 'BUY', size: 0.3, entryPrice: 2334.10, exitPrice: 2342.80, stopLoss: 2328.40, openTime: '2026-06-12 15:00', closeTime: '2026-06-12 20:18', setup: 'OTE', session: 'New York AM', timeframe: '1H', isAPlus: true, pnl: +261.0 },
    { id: 'T1040', symbol: 'US30', type: 'BUY', size: 0.5, entryPrice: 39220.0, exitPrice: 39298.0, stopLoss: 39180.0, openTime: '2026-06-12 09:45', closeTime: '2026-06-12 14:30', setup: 'BOS', session: 'New York AM', timeframe: '1H', isAPlus: false, pnl: +390.0 },
    { id: 'T1039', symbol: 'NAS100', type: 'SELL', size: 0.6, entryPrice: 19788.0, exitPrice: 19834.0, stopLoss: 19828.0, openTime: '2026-06-11 18:20', closeTime: '2026-06-12 09:30', setup: 'CHoCH', session: 'New York PM', timeframe: '15m', isAPlus: false, pnl: -276.0 },
    { id: 'T1038', symbol: 'XAUUSD', type: 'BUY', size: 0.4, entryPrice: 2318.60, exitPrice: 2334.40, stopLoss: 2312.20, openTime: '2026-06-11 06:48', closeTime: '2026-06-11 12:14', setup: 'BOS', session: 'London', timeframe: '1H', isAPlus: true, pnl: +632.0 },
    { id: 'T1037', symbol: 'US30', type: 'SELL', size: 0.5, entryPrice: 39510.0, exitPrice: 39444.0, stopLoss: 39542.0, openTime: '2026-06-10 14:50', closeTime: '2026-06-10 19:36', setup: 'CHoCH', session: 'New York AM', timeframe: '1H', isAPlus: false, pnl: +330.0 },
  ]
  return raw.map((trade) => {
    const realisedR = computeRealisedR({
      entry: trade.entryPrice,
      stop: trade.stopLoss,
      exit: trade.exitPrice,
      side: trade.type,
    })
    const plannedRR = computeRewardToRisk({
      entry: trade.entryPrice,
      stop: trade.stopLoss,
      target: trade.exitPrice,
      side: trade.type,
    })
    return {
      ...trade,
      realisedR: +realisedR.toFixed(2),
      plannedRR: +plannedRR.toFixed(2),
      movePts: +(trade.type === 'BUY' ? trade.exitPrice - trade.entryPrice : trade.entryPrice - trade.exitPrice).toFixed(2),
    }
  })
})()

/** Deterministic pseudo-random generator so charts stay stable across renders. */
function seededRandom(seed) {
  let state = seed % 2147483647
  if (state <= 0) state += 2147483646
  return () => {
    state = (state * 16807) % 2147483647
    return (state - 1) / 2147483646
  }
}

/**
 * Generate sparkline data for mini charts.
 * @param {number} baseValue - starting price
 * @param {number} [points=20] - number of data points
 * @param {number} [volatility=0.003] - per-step volatility factor
 * @param {number} [seed=1] - deterministic seed
 */
export function generateSparkline(baseValue, points = 20, volatility = 0.003, seed = 1) {
  const random = seededRandom(seed)
  const data = []
  let current = baseValue
  for (let i = 0; i < points; i++) {
    current = current * (1 + (random() - 0.48) * volatility)
    data.push({ value: +current.toFixed(5) })
  }
  return data
}

/**
 * Generate deterministic OHLC candles for a candlestick chart. Produces a
 * believable intraday walk with wicks, suitable for the terminal-grade preview.
 *
 * @param {number} baseValue - opening anchor price
 * @param {number} [count=40] - number of candles
 * @param {number} [volatility=0.0016] - per-candle volatility factor
 * @param {number} [seed=7] - deterministic seed
 */
export function generateCandles(baseValue, count = 40, volatility = 0.0016, seed = 7) {
  const random = seededRandom(seed)
  const candles = []
  let open = baseValue
  for (let i = 0; i < count; i++) {
    const drift = (random() - 0.5) * 2 * volatility
    const close = open * (1 + drift)
    const wick = Math.abs(open) * volatility * (0.4 + random())
    const high = Math.max(open, close) + wick * random()
    const low = Math.min(open, close) - wick * random()
    candles.push({
      label: i,
      open: +open.toFixed(5),
      high: +high.toFixed(5),
      low: +low.toFixed(5),
      close: +close.toFixed(5),
      range: [+low.toFixed(5), +high.toFixed(5)],
    })
    open = close
  }
  return candles
}

/**
 * Generate a 30-day equity curve with a gentle upward drift.
 * @param {number} [startEquity=112000] - equity 30 days ago
 * @param {number} [days=30] - number of days
 * @param {number} [seed=21] - deterministic seed
 */
export function generateEquityCurve(startEquity = 112000, days = 30, seed = 21) {
  const random = seededRandom(seed)
  const data = []
  let current = startEquity
  const now = new Date('2026-06-14T00:00:00Z')
  for (let i = days - 1; i >= 0; i--) {
    const drift = 0.0042
    const noise = (random() - 0.5) * 0.012
    current = current * (1 + drift + noise)
    const day = new Date(now.getTime() - i * 86400000)
    data.push({
      date: day.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      equity: +current.toFixed(2),
    })
  }
  return data
}
