import { FX_PAIRS } from './pairs'

/**
 * Keyed near-realtime provider. Twelve Data offers a freemium FX quotes API.
 * Activated only when VITE_FX_API_KEY is present; otherwise this module is
 * never constructed and the platform falls back to the keyless path.
 *
 * @see https://twelvedata.com/docs#price
 */
const TWELVE_DATA_BASE = 'https://api.twelvedata.com/price'

const SYMBOLS = FX_PAIRS.map((entry) => entry.pair).join(',')

/**
 * Fetch the latest real prices for every tracked pair in a single batched call.
 *
 * @param {string} apiKey - Twelve Data API key from VITE_FX_API_KEY
 * @param {AbortSignal} [signal]
 * @returns {Promise<Record<string, number>>} map of pair → price
 * @throws on transport error, rate-limit, or an unparseable response
 */
export async function fetchTwelveDataPrices(apiKey, signal) {
  const url = `${TWELVE_DATA_BASE}?symbol=${encodeURIComponent(SYMBOLS)}&apikey=${apiKey}`
  const response = await fetch(url, { signal })
  if (!response.ok) throw new Error(`Twelve Data responded ${response.status}`)

  const payload = await response.json()
  if (payload?.status === 'error') throw new Error(payload.message ?? 'Twelve Data error')

  // Batched responses key by symbol; single-symbol responses are flat.
  const entries = SYMBOLS.includes(',')
    ? Object.entries(payload)
    : [[FX_PAIRS[0].pair, payload]]

  return entries.reduce((prices, [pair, value]) => {
    const price = Number(value?.price)
    if (Number.isFinite(price) && price > 0) prices[pair] = price
    return prices
  }, {})
}
