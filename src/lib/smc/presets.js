/**
 * Per-instrument tuning for the structure read.
 *
 * A swing on gold and a swing on EURUSD are not the same distance in ATRs, and
 * a breakout body that counts as strong on an index is ordinary on a major. The
 * indicator carries one preset per instrument family for exactly that reason,
 * and a read taken on the wrong preset calls swings the chart does not show.
 *
 * Matched to Structure V6's preset block. `Custom` is what an instrument
 * outside the six families reads on.
 */

const CUSTOM = {
  name: 'Custom',
  atrMult: 1.0,
  strongBody: 0.6,
  strongAdvance: 0.3,
  moderateBody: 0.4,
  moderateAdvance: 0.15,
}

const PRESETS = {
  XAUUSD: {
    atrMult: 1.0,
    strongBody: 0.6,
    strongAdvance: 0.3,
    moderateBody: 0.4,
    moderateAdvance: 0.15,
  },
  EURUSD: {
    atrMult: 0.8,
    strongBody: 0.55,
    strongAdvance: 0.25,
    moderateBody: 0.35,
    moderateAdvance: 0.12,
  },
  GBPUSD: {
    atrMult: 0.8,
    strongBody: 0.55,
    strongAdvance: 0.25,
    moderateBody: 0.35,
    moderateAdvance: 0.12,
  },
  USDJPY: {
    atrMult: 0.9,
    strongBody: 0.55,
    strongAdvance: 0.25,
    moderateBody: 0.35,
    moderateAdvance: 0.12,
  },
  US30: {
    atrMult: 0.9,
    strongBody: 0.6,
    strongAdvance: 0.28,
    moderateBody: 0.4,
    moderateAdvance: 0.14,
  },
  NAS100: {
    atrMult: 1.0,
    strongBody: 0.6,
    strongAdvance: 0.28,
    moderateBody: 0.4,
    moderateAdvance: 0.14,
  },
}

/** Ticker fragments each family answers to, tested in this order. */
const FAMILY_MATCHES = [
  ['XAUUSD', ['XAU', 'GOLD']],
  ['EURUSD', ['EURUSD', 'EUR/USD']],
  ['GBPUSD', ['GBPUSD', 'GBP/USD']],
  ['USDJPY', ['USDJPY', 'USD/JPY']],
  ['US30', ['US30', 'DJI', 'DJ30', 'DOW', 'YM', 'WS30']],
  ['NAS100', ['NAS100', 'NDX', 'NQ', 'NASDAQ']],
]

/**
 * The preset an instrument reads on, resolved from its ticker.
 *
 * @param {string} [symbol]
 * @returns {{name: string, atrMult: number, strongBody: number, strongAdvance: number, moderateBody: number, moderateAdvance: number}}
 */
export function presetFor(symbol) {
  const ticker = String(symbol ?? '').toUpperCase()
  for (const [name, fragments] of FAMILY_MATCHES) {
    if (fragments.some((fragment) => ticker.includes(fragment))) {
      return { name, ...PRESETS[name] }
    }
  }
  return { ...CUSTOM }
}
