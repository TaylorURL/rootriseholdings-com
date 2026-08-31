/**
 * Journal persistence. One versioned record in browser storage holds trades,
 * account settings, and day plans; every mutation flows through
 * {@link saveJournal} so the storage shape stays in one file. The backend is a
 * parameter defaulting to window.localStorage, which is what lets the tests run
 * against a plain object and any other getItem/setItem store take its place.
 */
const STORAGE_KEY = 'rr.journal.v1'
const VERSION = 1

export function emptyJournal() {
  return {
    version: VERSION,
    trades: [],
    settings: {
      startingEquity: null,
      pointValues: {},
      firms: [],
      activeFirmId: null,
    },
    plans: {},
  }
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
 * @returns {object} the persisted journal, or a fresh one when absent/corrupt
 */
export function loadJournal(storage = defaultStorage()) {
  if (!storage) return emptyJournal()
  try {
    const raw = storage.getItem(STORAGE_KEY)
    if (!raw) return emptyJournal()
    const parsed = JSON.parse(raw)
    if (parsed?.version !== VERSION || !Array.isArray(parsed.trades)) return emptyJournal()
    const base = emptyJournal()
    return {
      ...base,
      ...parsed,
      settings: { ...base.settings, ...(parsed.settings ?? {}) },
      plans: parsed.plans ?? {},
    }
  } catch {
    return emptyJournal()
  }
}

/**
 * @param {object} journal
 * @param {Storage | null} [storage]
 */
export function saveJournal(journal, storage = defaultStorage()) {
  if (!storage) return
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(journal))
  } catch {
    // Quota or private-mode failure — the in-memory copy still drives the UI.
  }
}

/** Current equity = configured starting equity plus all realized P&L. */
export function currentEquity(journal) {
  const base = journal.settings.startingEquity
  if (base == null) return null
  const realized = journal.trades.reduce(
    (sum, trade) => sum + (trade.status === 'closed' ? (trade.pnl ?? 0) : 0),
    0
  )
  return base + realized
}
