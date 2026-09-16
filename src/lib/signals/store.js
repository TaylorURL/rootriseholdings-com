/**
 * What this browser remembers about the record.
 *
 * Which is now only the reader's own alert preference. The record itself moved
 * to the host, because a history kept in local storage said something
 * different on every device and vanished when the browser was cleared - and a
 * record that cannot be reproduced is not evidence anyone should pay for.
 * A notification toggle is the opposite: it is genuinely about this device,
 * and it belongs here.
 */
const STORAGE_KEY = 'rr.signals.v1'
const VERSION = 2

function defaultPreferences() {
  return { notifications: false }
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
 * @returns {{notifications: boolean}}
 */
export function loadPreferences(storage = defaultStorage()) {
  if (!storage) return defaultPreferences()
  try {
    const raw = storage.getItem(STORAGE_KEY)
    if (!raw) return defaultPreferences()
    const parsed = JSON.parse(raw)
    // Version 1 stored the whole ledger here. Its preferences are still worth
    // carrying across; its signals are not, and are left behind deliberately.
    return { ...defaultPreferences(), ...(parsed?.preferences ?? {}) }
  } catch {
    return defaultPreferences()
  }
}

/**
 * @param {{notifications: boolean}} preferences
 * @param {Storage | null} [storage]
 */
export function savePreferences(preferences, storage = defaultStorage()) {
  if (!storage) return
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify({ version: VERSION, preferences }))
  } catch {
    // Quota or private-mode failure — the in-memory copy still drives the UI.
  }
}
