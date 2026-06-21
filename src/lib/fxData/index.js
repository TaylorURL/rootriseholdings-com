/**
 * FX data layer — single entry point.
 *
 * The provider is swappable behind {@link fxService}: it serves live Twelve Data
 * quotes when VITE_FX_API_KEY is set, otherwise anchors to free ECB reference
 * rates (no key) and simulates realistic intraday ticks. It never requires a
 * secret to build or run.
 */
export { fxService, createFxService } from './createFxService'
export { useFxQuotes, useFxQuote } from './useFxQuotes'
export { FX_PAIRS, FX_PAIR_META, decimalsForPair, splitPair } from './pairs'
