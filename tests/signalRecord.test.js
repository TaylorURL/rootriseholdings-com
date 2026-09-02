import test from 'node:test'
import assert from 'node:assert/strict'
import { fromRow, toRow } from '../src/lib/signals/row.js'
import { loadPreferences, savePreferences } from '../src/lib/signals/store.js'

/** A signal in the engine's own shape, with every optional field populated. */
function signal(overrides = {}) {
  return {
    id: 'S1abc',
    fingerprint: 'XAUUSD|1H|BUY|4650.0000|4640.0000|4680.0000',
    symbol: 'XAUUSD',
    timeframe: '1H',
    side: 'BUY',
    entry: 4650,
    stop: 4640,
    target: 4680,
    target2: 4700,
    target3: 4720,
    rewardToRisk: 3,
    grade: 'A+',
    setup: 'BOS',
    continuation: 92,
    reversalRisk: 18,
    alignment: 'Bullish',
    reasons: ['Structure broke up', 'Retest held'],
    emittedAt: 1_756_000_000_000,
    venue: 'OANDA',
    priceAtEmit: 4650,
    status: 'filled',
    filledAt: 1_756_000_600_000,
    resolvedAt: null,
    realisedR: null,
    ...overrides,
  }
}

/**
 * The host writes the record and the browser reads it, so the two mappings have
 * to agree on every field. A round trip is the cheapest way to say that: what
 * comes back has to be what went in, with the id the table assigns.
 */
test('a signal survives the round trip through a row', () => {
  const original = signal()
  const row = { id: 'a6f1e2c4-0000-4000-8000-000000000001', ...toRow(original) }
  const returned = fromRow(row)
  assert.deepEqual(returned, { ...original, id: row.id })
})

test('a row carries timestamps and the engine carries milliseconds', () => {
  const row = toRow(signal())
  assert.equal(row.emitted_at, new Date(1_756_000_000_000).toISOString())
  assert.equal(row.filled_at, new Date(1_756_000_600_000).toISOString())
  assert.equal(row.resolved_at, null)
})

test('the row leaves the id to the table', () => {
  assert.equal('id' in toRow(signal()), false)
})

test('an unresolved signal keeps its nulls rather than becoming zero', () => {
  const row = toRow(signal({ realisedR: null, target2: null, continuation: null }))
  assert.equal(row.realised_r, null)
  assert.equal(row.target2, null)
  assert.equal(row.continuation, null)
})

/** A stand-in for localStorage, so the preference test needs no browser. */
function memoryStorage(seed = {}) {
  const map = new Map(Object.entries(seed))
  return {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => map.set(key, value),
  }
}

test('a preference written by this device is read back', () => {
  const storage = memoryStorage()
  savePreferences({ notifications: true }, storage)
  assert.deepEqual(loadPreferences(storage), { notifications: true })
})

/**
 * The old shape kept the whole record in this key. A reader upgrading into the
 * host-swept record should keep their alert setting and lose nothing else that
 * matters - the signals in there are the browser's own stale copy of a record
 * the table now holds.
 */
test('a version 1 ledger contributes its preference and not its signals', () => {
  const storage = memoryStorage({
    'rr.signals.v1': JSON.stringify({
      version: 1,
      signals: [{ id: 'S1', status: 'target' }],
      preferences: { notifications: true },
    }),
  })
  const preferences = loadPreferences(storage)
  assert.deepEqual(preferences, { notifications: true })
  assert.equal('signals' in preferences, false)
})

test('an absent or unreadable store still yields a usable preference', () => {
  assert.deepEqual(loadPreferences(memoryStorage()), { notifications: false })
  assert.deepEqual(loadPreferences(memoryStorage({ 'rr.signals.v1': 'not json' })), {
    notifications: false,
  })
})
