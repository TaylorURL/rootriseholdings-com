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
 * A parsed record in the shape this version holds, or null when it is not a
 * journal this version can read. Missing settings and plans are filled from
 * the empty journal, so a record written before a field existed still loads.
 *
 * @param {unknown} parsed
 * @returns {object | null}
 */
function normalizeJournal(parsed) {
  if (parsed?.version !== VERSION || !Array.isArray(parsed.trades)) return null
  const base = emptyJournal()
  return {
    ...base,
    version: VERSION,
    trades: parsed.trades,
    settings: { ...base.settings, ...(parsed.settings ?? {}) },
    plans: parsed.plans ?? {},
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
    return normalizeJournal(JSON.parse(raw)) ?? emptyJournal()
  } catch {
    return emptyJournal()
  }
}

/**
 * The journal as a file a reader can keep.
 *
 * The record lives in one browser's storage and nowhere else, so the file is
 * the only copy that survives a cleared profile or a new machine. It is the
 * stored shape itself, stamped with when it was written, so a file restored
 * later is exactly the journal that was saved.
 *
 * @param {object} journal
 * @param {Date} [now]
 * @returns {string} JSON text
 */
export function serializeJournal(journal, now = new Date()) {
  return JSON.stringify({ ...journal, exportedAt: now.toISOString() }, null, 2)
}

/**
 * Reads a journal back from a file's text.
 *
 * @param {string} text
 * @returns {object | null} the journal, or null when the text is not one this
 *   version can hold
 */
export function parseJournal(text) {
  try {
    return normalizeJournal(JSON.parse(text))
  } catch {
    return null
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
