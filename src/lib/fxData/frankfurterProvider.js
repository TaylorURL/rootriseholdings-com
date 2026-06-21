import { FX_PAIRS, splitPair } from './pairs'

/**
 * Keyless real-data provider. Frankfurter exposes ECB reference rates with no
 * API key, so we can anchor the platform to genuine market levels even when no
 * premium key is configured. Rates are daily (not tick-level), so they are used
 * to seed/re-anchor the live simulation rather than to drive every tick.
 *
 * @see https://www.frankfurter.app
 */
const FRANKFURTER_BASE = 'https://api.frankfurter.app/latest'

/** Currencies (besides USD) we need quotes for, derived from the tracked pairs. */
const SYMBOLS = [...new Set(FX_PAIRS.flatMap((entry) => splitPair(entry.pair)))].filter(
  (code) => code !== 'USD',
)

/**
 * Fetch real mid prices for every tracked pair, derived from USD-based ECB rates.
 *
 * @param {AbortSignal} [signal] - optional fetch abort signal
 * @returns {Promise<Record<string, number>>} map of pair → mid price
 * @throws when the network request fails or returns no rates
 */
export async function fetchFrankfurterAnchors(signal) {
  const url = `${FRANKFURTER_BASE}?from=USD&to=${SYMBOLS.join(',')}`
  const response = await fetch(url, { signal })
  if (!response.ok) throw new Error(`Frankfurter responded ${response.status}`)

  const { rates } = await response.json()
  if (!rates) throw new Error('Frankfurter returned no rates')

  // rates[X] is "X per 1 USD". USD itself is the implicit base (rate 1).
  const usdTo = { USD: 1, ...rates }

  return FX_PAIRS.reduce((anchors, { pair }) => {
    const [base, quote] = splitPair(pair)
    const basePerUsd = usdTo[base]
    const quotePerUsd = usdTo[quote]
    if (basePerUsd && quotePerUsd) {
      // price of pair = quote per 1 base = (quote/USD) / (base/USD)
      anchors[pair] = quotePerUsd / basePerUsd
    }
    return anchors
  }, {})
}
