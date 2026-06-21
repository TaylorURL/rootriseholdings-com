import { FX_PAIR_META } from './pairs'

/** Per-category tick volatility and typical spread (in pips). */
const PROFILE = {
  Majors: { volatility: 0.00022, spread: 0.9 },
  Minors: { volatility: 0.00032, spread: 1.6 },
  Exotics: { volatility: 0.0009, spread: 14 },
}

/** Bounded pseudo-random in [-0.5, 0.5). */
function jitter() {
  return Math.random() - 0.5
}

/**
 * Build the initial in-memory quote state for a pair from its seed anchor.
 *
 * @param {{pair:string, seed:number, category:string, pip:number}} meta
 * @returns {object} mutable quote state
 */
export function seedQuote(meta) {
  const profile = PROFILE[meta.category] ?? PROFILE.Majors
  return {
    pair: meta.pair,
    bid: meta.seed,
    open: meta.seed,
    high: meta.seed,
    low: meta.seed,
    spread: profile.spread,
    pip: meta.pip,
    category: meta.category,
    volume: meta.volume,
    dir: 'flat',
  }
}

/**
 * Advance a quote one tick using a mean-reverting random walk so prices stay
 * lively yet realistic, never drifting far from their anchor.
 *
 * @param {object} state - quote state from {@link seedQuote}
 * @returns {object} the same state object, mutated and returned for chaining
 */
export function tickQuote(state) {
  const profile = PROFILE[state.category] ?? PROFILE.Majors
  const drift = jitter() * profile.volatility
  const reversion = (state.open - state.bid) / state.open * 0.04
  const previous = state.bid

  const next = state.bid * (1 + drift + reversion)
  state.bid = next
  state.high = Math.max(state.high, next)
  state.low = Math.min(state.low, next)
  state.dir = next > previous ? 'up' : next < previous ? 'down' : 'flat'
  return state
}

/**
 * Re-anchor a quote to a freshly fetched real price while preserving the
 * session open so the day's change percentage stays continuous.
 *
 * @param {object} state - existing quote state
 * @param {number} price - real mid price from a live provider
 */
export function anchorQuote(state, price) {
  if (!Number.isFinite(price) || price <= 0) return
  state.bid = price
  state.high = Math.max(state.high, price)
  state.low = Math.min(state.low, price)
}

/**
 * Project internal quote state into the public quote shape consumed by the UI.
 *
 * @param {object} state
 * @returns {{pair:string, bid:number, ask:number, spread:number, change:number,
 *   changePct:number, high:number, low:number, dir:string, category:string, volume:string}}
 */
export function toPublicQuote(state) {
  const ask = state.bid + state.spread * state.pip
  const change = state.bid - state.open
  const changePct = (change / state.open) * 100
  return {
    pair: state.pair,
    bid: state.bid,
    ask,
    spread: state.spread,
    change,
    changePct,
    high: state.high,
    low: state.low,
    dir: state.dir,
    category: state.category,
    volume: state.volume,
  }
}

export { FX_PAIR_META }
