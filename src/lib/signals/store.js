/**
 * Signal persistence.
 *
 * The record is the product: a subscriber deciding whether the calls are worth
 * paying for reads the history, not the live panel. So it outlives the session
 * it was written in, and it is capped rather than unbounded - a browser store
 * that grows forever eventually throws, and the throw lands on the write that
 * would have recorded a loss.
 */
const STORAGE_KEY = 'rr.signals.v1'
const VERSION = 1

/** How many settled signals the record keeps before dropping the oldest. */
export const HISTORY_LIMIT = 500

export function emptyLedger() {
  return { version: VERSION, signals: [], preferences: { notifications: false } }
}

function defaultStorage() {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null
  } catch {
    return null
  }
}

/**
 * @param {Storage | null} [storage]
 * @returns {object} the stored ledger, or a fresh one when absent or corrupt
 */
export function loadSignals(storage = defaultStorage()) {
  if (!storage) return emptyLedger()
  try {
    const raw = storage.getItem(STORAGE_KEY)
    if (!raw) return emptyLedger()
    const parsed = JSON.parse(raw)
    if (parsed?.version !== VERSION || !Array.isArray(parsed.signals)) return emptyLedger()
    const base = emptyLedger()
    return {
      ...base,
      ...parsed,
      preferences: { ...base.preferences, ...(parsed.preferences ?? {}) },
    }
  } catch {
    return emptyLedger()
  }
}

/**
 * @param {object} ledger
 * @param {Storage | null} [storage]
 */
export function saveSignals(ledger, storage = defaultStorage()) {
  if (!storage) return
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(ledger))
  } catch {
    // Quota or private-mode failure — the in-memory copy still drives the UI.
  }
}

/** Newest first, trimmed to the limit. */
export function trimHistory(signals, limit = HISTORY_LIMIT) {
  if (signals.length <= limit) return signals
  return [...signals].sort((a, b) => b.emittedAt - a.emittedAt).slice(0, limit)
}
