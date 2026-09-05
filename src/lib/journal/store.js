/**
 * Journal persistence. One versioned record in browser storage holds trades,
 * account settings, and day plans; every mutation flows through
 * {@link saveJournal} so the storage shape stays in one file. The backend is a
 * parameter defaulting to window.localStorage, which is what lets the tests run
 * against a plain object and any other getItem/setItem store take its place.
 */
const STORAGE_KEY = 'rr.journal.v1'
const VERSION = 1

/**
 * Where the browser's own copy is kept the moment before the account's copy
 * first replaces it.
 *
 * The sync merges rather than overwrites, so in theory nothing is ever lost
 * and this is never read. It exists because "in theory" is doing real work in
 * that sentence: the merge is the first thing in this app to take two records
 * somebody typed and produce a third, and the cost of being wrong once is a
 * trading journal. One untouched copy of what the browser had, written before
 * anything is adopted, makes that recoverable rather than final.
 */
const BACKUP_KEY = 'rr.journal.v1.pre-sync'

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
 * The account holds the record now and this storage is the cache in front of
 * it, so a cleared profile is no longer the end of a journal. The file is still
 * worth having: it is the only copy that is not ours to lose, and the only one
 * a reader can read without us. It is the stored shape itself, stamped with
 * when it was written, so a file restored later is exactly the journal that was
 * saved.
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

/**
 * Keeps one untouched copy of what this browser held, once.
 *
 * Written before the first sync adopts anything and never overwritten
 * afterwards, because the copy worth keeping is the one from before any merge
 * ran - a second write would replace it with a record the sync had already
 * touched, which is the opposite of what it is for.
 *
 * @param {object} journal
 * @param {Storage | null} [storage]
 * @returns {boolean} whether this call is what wrote it
 */
export function backupJournalOnce(journal, storage = defaultStorage()) {
  if (!storage) return false
  try {
    if (storage.getItem(BACKUP_KEY)) return false
    storage.setItem(
      BACKUP_KEY,
      JSON.stringify({ ...journal, backedUpAt: new Date().toISOString() })
    )
    return true
  } catch {
    // A browser that will not take the backup still gets the sync; the account
    // copy is the durable one either way.
    return false
  }
}

/**
 * The pre-sync copy, for a reader who needs to see what their browser held
 * before the account's record arrived.
 *
 * @param {Storage | null} [storage]
 * @returns {object | null}
 */
export function loadBackupJournal(storage = defaultStorage()) {
  if (!storage) return null
  try {
    const raw = storage.getItem(BACKUP_KEY)
    if (!raw) return null
    return normalizeJournal(JSON.parse(raw))
  } catch {
    return null
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
