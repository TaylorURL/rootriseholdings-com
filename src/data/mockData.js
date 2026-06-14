export const account = {
  balance: 124850.32,
  equity: 127234.18,
  margin: 3200.0,
  freeMargin: 124034.18,
  marginLevel: 3976.07,
  openPositions: 4,
  todayPnl: +2383.86,
  todayPnlPct: +1.91,
  weekPnl: +5120.44,
  weekPnlPct: +4.27,
  monthPnl: +14982.6,
  monthPnlPct: +13.65,
  accountNumber: '8042157',
  leverage: '1:100',
  currency: 'USD',
  server: 'Miranda-Live-03',
  accountType: 'ECN Pro',
  holder: 'Miranda Capital LLC',
}

export const currencyPairs = [
  { pair: 'EUR/USD', bid: 1.08423, ask: 1.08431, spread: 0.8, change: +0.0034, changePct: +0.31, high: 1.08712, low: 1.08201, volume: '82.4B', category: 'Majors' },
  { pair: 'GBP/USD', bid: 1.27156, ask: 1.27168, spread: 1.2, change: -0.0021, changePct: -0.17, high: 1.27489, low: 1.27022, volume: '41.2B', category: 'Majors' },
  { pair: 'USD/JPY', bid: 149.823, ask: 149.831, spread: 0.8, change: +0.412, changePct: +0.28, high: 150.112, low: 149.401, volume: '68.7B', category: 'Majors' },
  { pair: 'USD/CHF', bid: 0.90134, ask: 0.90144, spread: 1.0, change: -0.00089, changePct: -0.1, high: 0.90312, low: 0.89988, volume: '22.1B', category: 'Majors' },
  { pair: 'AUD/USD', bid: 0.64892, ask: 0.64902, spread: 1.0, change: +0.00156, changePct: +0.24, high: 0.65034, low: 0.64721, volume: '18.9B', category: 'Majors' },
  { pair: 'USD/CAD', bid: 1.36421, ask: 1.36433, spread: 1.2, change: -0.00234, changePct: -0.17, high: 1.36789, low: 1.36312, volume: '25.3B', category: 'Majors' },
  { pair: 'NZD/USD', bid: 0.60123, ask: 0.60135, spread: 1.2, change: +0.00089, changePct: +0.15, high: 0.60287, low: 0.59934, volume: '8.4B', category: 'Minors' },
  { pair: 'EUR/GBP', bid: 0.85234, ask: 0.85246, spread: 1.2, change: +0.00178, changePct: +0.21, high: 0.85412, low: 0.85089, volume: '15.6B', category: 'Minors' },
  { pair: 'EUR/JPY', bid: 162.451, ask: 162.466, spread: 1.5, change: +0.298, changePct: +0.18, high: 162.733, low: 161.902, volume: '19.4B', category: 'Minors' },
  { pair: 'GBP/JPY', bid: 190.512, ask: 190.534, spread: 2.2, change: -0.184, changePct: -0.1, high: 191.045, low: 190.213, volume: '12.7B', category: 'Minors' },
  { pair: 'USD/TRY', bid: 32.4187, ask: 32.4512, spread: 32.5, change: +0.1843, changePct: +0.57, high: 32.512, low: 32.118, volume: '3.1B', category: 'Exotics' },
  { pair: 'USD/MXN', bid: 18.7124, ask: 18.7256, spread: 13.2, change: -0.0421, changePct: -0.22, high: 18.789, low: 18.654, volume: '4.8B', category: 'Exotics' },
  { pair: 'USD/ZAR', bid: 18.2341, ask: 18.2489, spread: 14.8, change: +0.0612, changePct: +0.34, high: 18.301, low: 18.142, volume: '2.3B', category: 'Exotics' },
  { pair: 'USD/SGD', bid: 1.34812, ask: 1.34829, spread: 1.7, change: -0.00098, changePct: -0.07, high: 1.34987, low: 1.34701, volume: '5.6B', category: 'Exotics' },
]

export const openPositions = [
  { id: 'P001', pair: 'EUR/USD', type: 'BUY', lots: 2.0, entryPrice: 1.08156, currentPrice: 1.08423, sl: 1.078, tp: 1.09, openTime: '2026-06-14 06:32', pnl: +534.0, pips: +26.7 },
  { id: 'P002', pair: 'GBP/USD', type: 'SELL', lots: 1.5, entryPrice: 1.27389, currentPrice: 1.27156, sl: 1.278, tp: 1.265, openTime: '2026-06-14 07:15', pnl: +349.5, pips: +23.3 },
  { id: 'P003', pair: 'USD/JPY', type: 'BUY', lots: 3.0, entryPrice: 150.234, currentPrice: 149.823, sl: 149.2, tp: 151.5, openTime: '2026-06-13 22:48', pnl: -1233.0, pips: -41.1 },
  { id: 'P004', pair: 'AUD/USD', type: 'BUY', lots: 1.0, entryPrice: 0.64712, currentPrice: 0.64892, sl: 0.643, tp: 0.655, openTime: '2026-06-14 09:04', pnl: +180.0, pips: +18.0 },
]

export const insights = [
  {
    id: 'INS001',
    pair: 'EUR/USD',
    direction: 'BUY',
    confidence: 87,
    entry: 1.08431,
    target: 1.09200,
    stopLoss: 1.07800,
    targetPips: +76.9,
    riskPips: -63.1,
    rrRatio: 1.22,
    catalysts: ['Bullish momentum', 'Support bounce', 'USD softening'],
    timeframe: '4H',
    strength: 'strong',
  },
  {
    id: 'INS002',
    pair: 'GBP/JPY',
    direction: 'SELL',
    confidence: 82,
    entry: 190.512,
    target: 189.200,
    stopLoss: 191.300,
    targetPips: +131.2,
    riskPips: -78.8,
    rrRatio: 1.66,
    catalysts: ['Bearish divergence', 'Resistance rejection', 'Risk-off sentiment'],
    timeframe: '1H',
    strength: 'strong',
  },
  {
    id: 'INS003',
    pair: 'AUD/USD',
    direction: 'BUY',
    confidence: 71,
    entry: 0.64902,
    target: 0.65500,
    stopLoss: 0.64400,
    targetPips: +59.8,
    riskPips: -50.2,
    rrRatio: 1.19,
    catalysts: ['Trend continuation', 'Commodity tailwind'],
    timeframe: '4H',
    strength: 'moderate',
  },
  {
    id: 'INS004',
    pair: 'USD/CHF',
    direction: 'SELL',
    confidence: 68,
    entry: 0.90134,
    target: 0.89400,
    stopLoss: 0.90600,
    targetPips: +73.4,
    riskPips: -46.6,
    rrRatio: 1.57,
    catalysts: ['DXY weakness', 'Safe-haven flow to CHF'],
    timeframe: '1H',
    strength: 'moderate',
  },
  {
    id: 'INS005',
    pair: 'USD/JPY',
    direction: 'SELL',
    confidence: 76,
    entry: 149.831,
    target: 148.500,
    stopLoss: 150.500,
    targetPips: +133.1,
    riskPips: -66.9,
    rrRatio: 1.99,
    catalysts: ['BoJ tightening bets', 'Bearish engulfing', 'Overbought RSI'],
    timeframe: '4H',
    strength: 'strong',
  },
  {
    id: 'INS006',
    pair: 'NZD/USD',
    direction: 'BUY',
    confidence: 58,
    entry: 0.60135,
    target: 0.60600,
    stopLoss: 0.59700,
    targetPips: +46.5,
    riskPips: -43.5,
    rrRatio: 1.07,
    catalysts: ['Mild recovery', 'Oversold bounce'],
    timeframe: '1H',
    strength: 'weak',
  },
]

export const performance = {
  winRate: 67,
  profitFactor: 2.14,
  avgTradeDuration: '4h 22m',
  totalTrades: 248,
  bestStreak: 9,
}

// Realised P&L per month for the current trading year (Jun is month-to-date).
export const monthlyPnl = [
  { month: 'Jan', pnl: +6420.5 },
  { month: 'Feb', pnl: -2180.25 },
  { month: 'Mar', pnl: +9340.8 },
  { month: 'Apr', pnl: +4120.4 },
  { month: 'May', pnl: -1560.1 },
  { month: 'Jun', pnl: +14982.6 },
]

// Live market session snapshot for the markets status banner.
export const marketStatus = {
  state: 'Open',
  session: 'London Session',
  liquidity: 'High Liquidity',
}

// Aggregate sentiment read used by the insights page.
export const marketSentiment = [
  { id: 'usd', label: 'USD Sentiment', value: 'Bearish', tone: 'sell' },
  { id: 'eur', label: 'EUR Sentiment', value: 'Bullish', tone: 'buy' },
  { id: 'risk', label: 'Risk Appetite', value: 'Neutral', tone: 'neutral' },
]

// Net exposure by currency leg across open positions (sums to 100%).
export const currencyExposure = [
  { currency: 'USD', exposure: 42 },
  { currency: 'EUR', exposure: 26 },
  { currency: 'GBP', exposure: 19 },
  { currency: 'JPY', exposure: 13 },
]

// Recent account event log for the activity feed (relative to 2026-06-14).
export const activityFeed = [
  { id: 'A1', time: '14 Jun · 09:04', type: 'position', message: 'Position P004 opened — AUD/USD BUY 1.0 lots' },
  { id: 'A2', time: '14 Jun · 07:15', type: 'position', message: 'Position P002 opened — GBP/USD SELL 1.5 lots' },
  { id: 'A3', time: '14 Jun · 06:32', type: 'signal', message: 'Signal alert triggered — USD/JPY SELL' },
  { id: 'A4', time: '13 Jun · 18:45', type: 'closed', message: 'Position T1044 closed — EUR/USD +$844.00' },
  { id: 'A5', time: '13 Jun · 08:00', type: 'deposit', message: 'Deposit processed — $5,000.00' },
]

export const tradeHistory = [
  { id: 'T1044', pair: 'EUR/USD', type: 'BUY', lots: 2.0, entryPrice: 1.07812, exitPrice: 1.08234, openTime: '2026-06-13 14:22', closeTime: '2026-06-13 18:45', pnl: +844.0, pips: +42.2 },
  { id: 'T1043', pair: 'GBP/JPY', type: 'SELL', lots: 1.0, entryPrice: 191.234, exitPrice: 190.812, openTime: '2026-06-13 09:10', closeTime: '2026-06-13 14:05', pnl: +316.5, pips: +42.2 },
  { id: 'T1042', pair: 'USD/CHF', type: 'BUY', lots: 2.5, entryPrice: 0.90289, exitPrice: 0.90056, openTime: '2026-06-12 20:33', closeTime: '2026-06-13 08:12', pnl: -582.5, pips: -23.3 },
  { id: 'T1041', pair: 'EUR/USD', type: 'SELL', lots: 1.5, entryPrice: 1.08589, exitPrice: 1.08234, openTime: '2026-06-12 15:00', closeTime: '2026-06-12 20:18', pnl: +532.5, pips: +35.5 },
  { id: 'T1040', pair: 'NZD/USD', type: 'BUY', lots: 1.0, entryPrice: 0.59834, exitPrice: 0.60112, openTime: '2026-06-12 09:45', closeTime: '2026-06-12 14:30', pnl: +278.0, pips: +27.8 },
  { id: 'T1039', pair: 'USD/JPY', type: 'SELL', lots: 2.0, entryPrice: 149.567, exitPrice: 150.123, openTime: '2026-06-11 18:20', closeTime: '2026-06-12 09:30', pnl: -1112.0, pips: -55.6 },
]

// Deterministic pseudo-random generator so charts stay stable across renders.
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
 * Generate hourly OHLC data for the main price chart.
 * @param {number} baseValue - starting price
 * @param {number} [hours=48] - hours of history
 * @param {number} [seed=7] - deterministic seed
 */
export function generatePriceHistory(baseValue, hours = 48, seed = 7) {
  const random = seededRandom(seed)
  const data = []
  let current = baseValue
  const now = new Date('2026-06-14T14:00:00Z')
  for (let i = hours; i >= 0; i--) {
    const open = current
    const change = (random() - 0.48) * 0.003
    const high = open * (1 + random() * 0.0015)
    const low = open * (1 - random() * 0.0015)
    const close = open * (1 + change)
    current = close
    const time = new Date(now.getTime() - i * 3600000)
    data.push({
      time: time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
      open: +open.toFixed(5),
      high: +high.toFixed(5),
      low: +low.toFixed(5),
      close: +close.toFixed(5),
      value: +close.toFixed(5),
    })
  }
  return data
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
