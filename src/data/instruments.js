import { useEffect, useMemo, useState } from 'react'

/**
 * Instrument registry — the actual set the desk reads and trades.
 *
 * Smart-Money-Concepts (SMC) playbook narrows the universe to four tradable
 * instruments plus three FX pairs that are watched for sentiment context but
 * never executed as primaries. The shape mirrors the FX layer so charts/tables
 * can compose either source uniformly.
 *
 * TODO(data): swap the in-memory simulator below for a real market-data feed
 * (indices + metals via a vendor like Polygon / Tradermade / Twelve Data).
 * All UI consumes through {@link useInstrumentQuotes}; the swap is local to
 * this file. Keep the same public quote shape on the way out.
 */
export const INSTRUMENTS = [
  {
    symbol: 'XAUUSD',
    displaySymbol: 'XAU/USD',
    name: 'Gold spot',
    category: 'Commodity',
    primaryTimeframe: '1H',
    biasTimeframes: ['Daily', '4H'],
    sideConstraint: null,
    tradeable: true,
    isWatchOnly: false,
    note: 'Only trade in the direction of the higher-timeframe (Daily / 4H) bias.',
    seed: 2358.4,
    tickSize: 0.01,
    moveLabel: 'pts',
    volume: 'Spot',
  },
  {
    symbol: 'NAS100',
    displaySymbol: 'NAS100',
    name: 'Nasdaq 100 index',
    category: 'Index',
    primaryTimeframe: '15m',
    biasTimeframes: ['1H', '4H'],
    sideConstraint: null,
    tradeable: true,
    isWatchOnly: false,
    note: 'Intraday 15m execution; bias confirmed off 1H/4H structure.',
    seed: 19842.6,
    tickSize: 0.1,
    moveLabel: 'pts',
    volume: 'Index',
  },
  {
    symbol: 'US30',
    displaySymbol: 'US30',
    name: 'Dow Jones 30 index',
    category: 'Index',
    primaryTimeframe: '1H',
    biasTimeframes: ['4H', 'Daily'],
    sideConstraint: null,
    tradeable: true,
    isWatchOnly: false,
    note: '1H execution — cleaner structure than the other indices intraday.',
    seed: 39418.0,
    tickSize: 1,
    moveLabel: 'pts',
    volume: 'Index',
  },
  {
    symbol: 'SP500',
    displaySymbol: 'SP500',
    name: 'S&P 500 index',
    category: 'Index',
    primaryTimeframe: '15m',
    biasTimeframes: ['1H', '4H'],
    sideConstraint: 'SHORT',
    tradeable: true,
    isWatchOnly: false,
    note: 'SHORTS ONLY. Bias rule — never long this index.',
    seed: 5482.4,
    tickSize: 0.1,
    moveLabel: 'pts',
    volume: 'Index',
  },
  {
    symbol: 'USDJPY',
    displaySymbol: 'USD/JPY',
    name: 'US dollar / Japanese yen',
    category: 'FX',
    primaryTimeframe: 'Watch',
    biasTimeframes: ['Daily'],
    sideConstraint: null,
    tradeable: false,
    isWatchOnly: true,
    note: 'Monitor only — DXY corroboration, never executed as a primary.',
    seed: 156.42,
    tickSize: 0.001,
    moveLabel: 'pips',
    volume: 'Spot',
  },
  {
    symbol: 'NZDUSD',
    displaySymbol: 'NZD/USD',
    name: 'New Zealand dollar / US dollar',
    category: 'FX',
    primaryTimeframe: 'Watch',
    biasTimeframes: ['Daily'],
    sideConstraint: null,
    tradeable: false,
    isWatchOnly: true,
    note: 'Monitor only — risk-sentiment proxy.',
    seed: 0.6128,
    tickSize: 0.00001,
    moveLabel: 'pips',
    volume: 'Spot',
  },
  {
    symbol: 'NZDJPY',
    displaySymbol: 'NZD/JPY',
    name: 'New Zealand dollar / Japanese yen',
    category: 'FX',
    primaryTimeframe: 'Watch',
    biasTimeframes: ['Daily'],
    sideConstraint: null,
    tradeable: false,
    isWatchOnly: true,
    note: 'Monitor only — composite risk barometer.',
    seed: 95.84,
    tickSize: 0.001,
    moveLabel: 'pips',
    volume: 'Spot',
  },
]

/** Fast lookup by symbol. */
export const INSTRUMENT_META = INSTRUMENTS.reduce((map, entry) => {
  map[entry.symbol] = entry
  return map
}, {})

/** Decimal precision used when rendering a quote for the instrument. */
export function decimalsForInstrument(symbol) {
  const meta = INSTRUMENT_META[symbol]
  if (!meta) return 2
  const { tickSize } = meta
  if (tickSize >= 1) return 1
  if (tickSize >= 0.1) return 2
  if (tickSize >= 0.01) return 2
  if (tickSize >= 0.001) return 3
  return 5
}

/** Just the instruments the desk actively trades. */
export const TRADED_INSTRUMENTS = INSTRUMENTS.filter((entry) => entry.tradeable)

/** Just the watch-only pairs. */
export const WATCH_ONLY_INSTRUMENTS = INSTRUMENTS.filter((entry) => entry.isWatchOnly)

const VOLATILITY_BY_CATEGORY = {
  Commodity: 0.0011,
  Index: 0.0009,
  FX: 0.00022,
}

function seedInstrumentState(meta) {
  return {
    symbol: meta.symbol,
    bid: meta.seed,
    open: meta.seed,
    high: meta.seed,
    low: meta.seed,
    category: meta.category,
    tickSize: meta.tickSize,
    moveLabel: meta.moveLabel,
    primaryTimeframe: meta.primaryTimeframe,
    sideConstraint: meta.sideConstraint,
    isWatchOnly: meta.isWatchOnly,
    displaySymbol: meta.displaySymbol,
    name: meta.name,
    volume: meta.volume,
    dir: 'flat',
  }
}

function advanceInstrument(state) {
  const volatility = VOLATILITY_BY_CATEGORY[state.category] ?? 0.0005
  const drift = (Math.random() - 0.5) * volatility
  const reversion = ((state.open - state.bid) / state.open) * 0.03
  const previous = state.bid
  const next = state.bid * (1 + drift + reversion)
  state.bid = next
  state.high = Math.max(state.high, next)
  state.low = Math.min(state.low, next)
  state.dir = next > previous ? 'up' : next < previous ? 'down' : 'flat'
  return state
}

function projectInstrumentQuote(state) {
  const spreadTicks = state.category === 'FX' ? 12 : 6
  const spreadPrice = state.tickSize * spreadTicks
  const ask = state.bid + spreadPrice
  const change = state.bid - state.open
  const changePct = (change / state.open) * 100
  return {
    symbol: state.symbol,
    displaySymbol: state.displaySymbol,
    name: state.name,
    category: state.category,
    primaryTimeframe: state.primaryTimeframe,
    sideConstraint: state.sideConstraint,
    isWatchOnly: state.isWatchOnly,
    moveLabel: state.moveLabel,
    volume: state.volume,
    bid: state.bid,
    ask,
    spread: spreadTicks,
    change,
    changePct,
    high: state.high,
    low: state.low,
    dir: state.dir,
  }
}

let SHARED_STATE = INSTRUMENTS.map(seedInstrumentState)
let TICK_TIMER = null
const SUBSCRIBERS = new Set()

function broadcast() {
  const snapshot = SHARED_STATE.map(projectInstrumentQuote)
  SUBSCRIBERS.forEach((listener) => listener(snapshot))
}

function ensureTicking() {
  if (TICK_TIMER) return
  TICK_TIMER = setInterval(() => {
    SHARED_STATE = SHARED_STATE.map(advanceInstrument)
    broadcast()
  }, 1800)
}

function maybeStopTicking() {
  if (SUBSCRIBERS.size > 0) return
  if (!TICK_TIMER) return
  clearInterval(TICK_TIMER)
  TICK_TIMER = null
}

/**
 * Subscribe to the simulated instrument feed. Returns the latest snapshot for
 * all instruments plus a `bySymbol` map for direct lookups.
 *
 * @param {string[]} [symbols] - restrict to these symbols; omit for all
 */
export function useInstrumentQuotes(symbols) {
  const [snapshot, setSnapshot] = useState(() => SHARED_STATE.map(projectInstrumentQuote))

  useEffect(() => {
    SUBSCRIBERS.add(setSnapshot)
    ensureTicking()
    return () => {
      SUBSCRIBERS.delete(setSnapshot)
      maybeStopTicking()
    }
  }, [])

  const filter = symbols ? new Set(symbols) : null
  const visible = useMemo(
    () => (filter ? snapshot.filter((entry) => filter.has(entry.symbol)) : snapshot),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [snapshot, symbols?.join(',')],
  )

  const bySymbol = useMemo(
    () => visible.reduce((map, quote) => ((map[quote.symbol] = quote), map), {}),
    [visible],
  )

  return { quotes: visible, bySymbol }
}

/** Single-instrument convenience hook. */
export function useInstrumentQuote(symbol) {
  const { bySymbol } = useInstrumentQuotes([symbol])
  return bySymbol[symbol]
}
