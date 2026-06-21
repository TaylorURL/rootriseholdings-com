import { FX_PAIRS } from './pairs'
import { seedQuote, tickQuote, anchorQuote, toPublicQuote } from './simulate'
import { fetchFrankfurterAnchors } from './frankfurterProvider'
import { fetchTwelveDataPrices } from './twelveDataProvider'

const TICK_INTERVAL_MS = 1200
const LIVE_REANCHOR_MS = 15000
const ANCHOR_REANCHOR_MS = 5 * 60 * 1000

/**
 * Provider modes, in priority order:
 *  - `live`      Twelve Data key present → real near-realtime, re-anchored often.
 *  - `anchored`  No key, but Frankfurter ECB rates seed real anchor prices.
 *  - `simulated` Fully offline fallback with realistic synthetic ticks.
 */
function resolveMode(env) {
  if (env?.VITE_FX_API_KEY) return 'live'
  return 'anchored'
}

/**
 * Create the FX data service: a single tick loop that random-walks every pair
 * for smooth motion and periodically re-anchors to real provider prices. The
 * loop runs only while at least one subscriber is attached.
 *
 * The service NEVER throws on missing keys or network failures — it degrades to
 * synthetic ticks and surfaces the active mode for the UI to display.
 *
 * @param {ImportMetaEnv} [env=import.meta.env]
 */
export function createFxService(env = import.meta.env) {
  const apiKey = env?.VITE_FX_API_KEY ?? null
  let mode = resolveMode(env)

  const state = new Map(FX_PAIRS.map((meta) => [meta.pair, seedQuote(meta)]))
  const subscribers = new Set()
  let tickTimer = null
  let anchorTimer = null
  let anchorController = null
  let announced = false

  const snapshot = () => Array.from(state.values(), toPublicQuote)

  const notify = () => {
    const quotes = snapshot()
    subscribers.forEach((callback) => callback(quotes))
  }

  const applyAnchors = (anchors) => {
    for (const [pair, price] of Object.entries(anchors)) {
      const quote = state.get(pair)
      if (quote) anchorQuote(quote, price)
    }
  }

  const reanchor = async () => {
    anchorController?.abort()
    anchorController = new AbortController()
    try {
      const anchors = apiKey
        ? await fetchTwelveDataPrices(apiKey, anchorController.signal)
        : await fetchFrankfurterAnchors(anchorController.signal)
      if (Object.keys(anchors).length > 0) applyAnchors(anchors)
    } catch (error) {
      if (error?.name === 'AbortError') return
      // Network/provider failure is non-fatal — keep simulating from last anchor.
      if (mode !== 'simulated') {
        mode = 'simulated'
        // eslint-disable-next-line no-console
        console.info(
          `[fxData] Live FX provider unreachable — using simulated market data. (${error.message})`,
        )
      }
    }
  }

  const announceOnce = () => {
    if (announced) return
    announced = true
    if (mode === 'live') {
      // eslint-disable-next-line no-console
      console.info('[fxData] Live FX provider active (Twelve Data).')
    } else {
      // eslint-disable-next-line no-console
      console.info(
        '[fxData] No VITE_FX_API_KEY set — anchoring to free ECB reference rates with simulated intraday ticks.',
      )
    }
  }

  const start = () => {
    if (tickTimer) return
    announceOnce()
    reanchor()
    tickTimer = setInterval(() => {
      state.forEach(tickQuote)
      notify()
    }, TICK_INTERVAL_MS)
    anchorTimer = setInterval(reanchor, mode === 'live' ? LIVE_REANCHOR_MS : ANCHOR_REANCHOR_MS)
  }

  const stop = () => {
    if (tickTimer) clearInterval(tickTimer)
    if (anchorTimer) clearInterval(anchorTimer)
    anchorController?.abort()
    tickTimer = null
    anchorTimer = null
  }

  return {
    /** Active provider mode: 'live' | 'anchored' | 'simulated'. */
    getMode: () => mode,
    /** Current quotes snapshot (array of public quotes). */
    getQuotes: snapshot,
    /**
     * Subscribe to tick updates. Returns an unsubscribe function. The tick loop
     * auto-starts on the first subscriber and stops when the last detaches.
     * @param {(quotes:object[]) => void} callback
     */
    subscribe(callback) {
      subscribers.add(callback)
      if (subscribers.size === 1) start()
      callback(snapshot())
      return () => {
        subscribers.delete(callback)
        if (subscribers.size === 0) stop()
      }
    },
  }
}

/** Shared singleton so every component drives one tick loop / one set of quotes. */
export const fxService = createFxService()
