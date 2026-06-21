/**
 * Static metadata for every FX pair the platform tracks. Seed prices are
 * realistic anchor levels used when no live provider is reachable; live
 * providers overwrite them with real quotes. Pip size drives spread/precision.
 */
export const FX_PAIRS = [
  { pair: 'EUR/USD', seed: 1.0842, pip: 0.0001, category: 'Majors', volume: '82.4B' },
  { pair: 'GBP/USD', seed: 1.2716, pip: 0.0001, category: 'Majors', volume: '41.2B' },
  { pair: 'USD/JPY', seed: 149.82, pip: 0.01, category: 'Majors', volume: '68.7B' },
  { pair: 'USD/CHF', seed: 0.9013, pip: 0.0001, category: 'Majors', volume: '22.1B' },
  { pair: 'AUD/USD', seed: 0.6489, pip: 0.0001, category: 'Majors', volume: '18.9B' },
  { pair: 'USD/CAD', seed: 1.3642, pip: 0.0001, category: 'Majors', volume: '25.3B' },
  { pair: 'NZD/USD', seed: 0.6012, pip: 0.0001, category: 'Minors', volume: '8.4B' },
  { pair: 'EUR/GBP', seed: 0.8523, pip: 0.0001, category: 'Minors', volume: '15.6B' },
  { pair: 'EUR/JPY', seed: 162.45, pip: 0.01, category: 'Minors', volume: '19.4B' },
  { pair: 'GBP/JPY', seed: 190.51, pip: 0.01, category: 'Minors', volume: '12.7B' },
  { pair: 'USD/TRY', seed: 32.418, pip: 0.0001, category: 'Exotics', volume: '3.1B' },
  { pair: 'USD/MXN', seed: 18.712, pip: 0.0001, category: 'Exotics', volume: '4.8B' },
  { pair: 'USD/ZAR', seed: 18.234, pip: 0.0001, category: 'Exotics', volume: '2.3B' },
  { pair: 'USD/SGD', seed: 1.3481, pip: 0.0001, category: 'Exotics', volume: '5.6B' },
]

/** Quick lookup of pair metadata by symbol. */
export const FX_PAIR_META = FX_PAIRS.reduce((map, entry) => {
  map[entry.pair] = entry
  return map
}, {})

/** Decimal precision a pair quotes to, derived from its pip size. */
export function decimalsForPair(pair) {
  const meta = FX_PAIR_META[pair]
  if (!meta) return pair.includes('JPY') ? 3 : 5
  return meta.pip === 0.01 ? 3 : 5
}

/** The three numerator/denominator currencies of a pair, e.g. 'EUR/USD' → ['EUR','USD']. */
export function splitPair(pair) {
  const [base, quote] = pair.split('/')
  return [base, quote]
}
