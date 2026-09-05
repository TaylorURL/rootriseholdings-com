import test from 'node:test'
import assert from 'node:assert/strict'
import { mergeJournals, reconcile, hasContent, sameRecord } from '../src/lib/journal/merge.js'
import { emptyJournal } from '../src/lib/journal/store.js'

function trade(id, overrides = {}) {
  return {
    id,
    symbol: 'XAUUSD',
    side: 'BUY',
    entry: 4650,
    stop: 4640,
    target: 4680,
    status: 'open',
    openedAt: `2026-09-0${id}T10:00:00.000Z`,
    closedAt: null,
    exitPrice: null,
    realizedR: null,
    pnl: null,
    ...overrides,
  }
}

function journal(overrides = {}) {
  const base = emptyJournal()
  return {
    ...base,
    ...overrides,
    settings: { ...base.settings, ...(overrides.settings ?? {}) },
  }
}

/**
 * The whole point of the merge is that neither side can lose work, so the first
 * thing tested is the case the migration actually produces: a laptop with a
 * history signing into an account that already has one from a phone.
 */
test('a merge keeps every trade from both sides, in opening order', () => {
  const mine = journal({ trades: [trade(1), trade(3)] })
  const theirs = journal({ trades: [trade(2), trade(4)] })

  const merged = mergeJournals(mine, theirs)

  assert.deepEqual(
    merged.trades.map((entry) => entry.id),
    [1, 2, 3, 4],
    'all four survive, sorted by when they were opened rather than by side'
  )
})

/**
 * A trade is written once and changed once, when it closes, and closing is the
 * only thing that adds an exit price and the money. So a closed copy strictly
 * contains an open one and there is nothing to weigh.
 */
test('a closed copy of a trade beats an open one, whichever side holds it', () => {
  const closed = trade(1, { status: 'closed', closedAt: '2026-09-01T14:00:00.000Z', pnl: 250 })

  const localClosed = mergeJournals(journal({ trades: [closed] }), journal({ trades: [trade(1)] }))
  assert.equal(localClosed.trades[0].status, 'closed')
  assert.equal(localClosed.trades[0].pnl, 250)

  const remoteClosed = mergeJournals(journal({ trades: [trade(1)] }), journal({ trades: [closed] }))
  assert.equal(remoteClosed.trades[0].status, 'closed')
  assert.equal(remoteClosed.trades[0].pnl, 250)
})

test('two closed copies of one trade resolve to the one closed later', () => {
  const early = trade(1, { status: 'closed', closedAt: '2026-09-01T12:00:00.000Z', pnl: 100 })
  const late = trade(1, { status: 'closed', closedAt: '2026-09-01T15:00:00.000Z', pnl: 300 })

  assert.equal(
    mergeJournals(journal({ trades: [late] }), journal({ trades: [early] })).trades[0].pnl,
    300
  )
  assert.equal(
    mergeJournals(journal({ trades: [early] }), journal({ trades: [late] })).trades[0].pnl,
    300
  )
})

/**
 * An unset equity is null, so "the account wins" cannot be applied blindly - a
 * device that never had the figure set would blank it for every other one.
 */
test('an equity set on one side survives a side that has none', () => {
  const fromLocal = mergeJournals(
    journal({ settings: { startingEquity: 50000 } }),
    journal({ settings: { startingEquity: null } })
  )
  assert.equal(fromLocal.settings.startingEquity, 50000)

  const accountWins = mergeJournals(
    journal({ settings: { startingEquity: 50000 } }),
    journal({ settings: { startingEquity: 75000 } })
  )
  assert.equal(
    accountWins.settings.startingEquity,
    75000,
    'a real disagreement goes to the account'
  )
})

test('firms union, and the selection is checked against what actually survived', () => {
  const mine = journal({
    settings: { firms: [{ id: 'a', name: 'Alpha' }], activeFirmId: 'a' },
  })
  const theirs = journal({
    settings: { firms: [{ id: 'b', name: 'Beta' }], activeFirmId: 'b' },
  })

  const merged = mergeJournals(mine, theirs)
  assert.deepEqual(merged.settings.firms.map((firm) => firm.id).sort(), ['a', 'b'])
  assert.equal(merged.settings.activeFirmId, 'b', 'the account names the selection')

  // A selection naming a firm neither side kept falls back rather than dangling.
  const dangling = mergeJournals(
    journal({ settings: { firms: [], activeFirmId: 'gone' } }),
    journal({ settings: { firms: [{ id: 'c', name: 'Gamma' }], activeFirmId: 'gone' } })
  )
  assert.equal(dangling.settings.activeFirmId, 'c')
})

test('a plan edited on both devices on one day resolves to the later revision', () => {
  const merged = mergeJournals(
    journal({ plans: { '2026-09-05': { bias: 'long', updatedAt: '2026-09-05T09:00:00.000Z' } } }),
    journal({ plans: { '2026-09-05': { bias: 'short', updatedAt: '2026-09-05T11:00:00.000Z' } } })
  )
  assert.equal(merged.plans['2026-09-05'].bias, 'short')

  const otherWay = mergeJournals(
    journal({ plans: { '2026-09-05': { bias: 'long', updatedAt: '2026-09-05T13:00:00.000Z' } } }),
    journal({ plans: { '2026-09-05': { bias: 'short', updatedAt: '2026-09-05T11:00:00.000Z' } } })
  )
  assert.equal(otherWay.plans['2026-09-05'].bias, 'long')
})

/**
 * hasContent decides whether a browser is carrying something worth migrating.
 * A page that has only ever been rendered holds an empty record, not no record.
 */
test('an untouched journal holds no content, and any one field is content', () => {
  assert.equal(hasContent(emptyJournal()), false)
  assert.equal(hasContent(journal({ trades: [trade(1)] })), true)
  assert.equal(hasContent(journal({ settings: { startingEquity: 1000 } })), true)
  assert.equal(hasContent(journal({ settings: { firms: [{ id: 'a' }] } })), true)
  assert.equal(hasContent(journal({ settings: { pointValues: { XAUUSD: 100 } } })), true)
  assert.equal(hasContent(journal({ plans: { '2026-09-05': { bias: 'long' } } })), true)
})

test('sameRecord reads content rather than key order', () => {
  assert.equal(sameRecord({ a: 1, b: [1, 2] }, { b: [1, 2], a: 1 }), true)
  assert.equal(sameRecord({ a: 1 }, { a: 2 }), false)
  assert.equal(sameRecord({ a: [1, 2] }, { a: [2, 1] }), false, 'order inside an array is content')
})

/**
 * reconcile is the decision the sync acts on, and every branch of it is a claim
 * about somebody's data.
 */
test('a first sign-in carries the browser record up and marks it migrated', () => {
  const local = journal({ trades: [trade(1)], settings: { startingEquity: 50000 } })
  const decision = reconcile(local, { state: 'absent', record: null })

  assert.equal(decision.outcome, 'migrated')
  assert.equal(decision.migrated, true)
  assert.equal(decision.push, local)
  assert.equal(decision.adopt, local)
})

test('a first sign-in from a browser holding nothing writes nothing at all', () => {
  const decision = reconcile(emptyJournal(), { state: 'absent', record: null })
  assert.equal(decision.outcome, 'nothing-to-carry')
  assert.equal(decision.push, null)
  assert.equal(decision.adopt, null)
})

/**
 * The case the whole change exists for: a new device, an account that already
 * has the journal. It comes down, and nothing goes up.
 */
test('a fresh browser adopts the account record without writing back', () => {
  const remote = journal({ trades: [trade(1), trade(2)] })
  const decision = reconcile(emptyJournal(), { state: 'read', record: remote })

  assert.equal(decision.outcome, 'adopted')
  assert.equal(decision.adopt, remote)
  assert.equal(decision.push, null)
})

test('two records that already agree are left alone rather than rewritten', () => {
  const record = journal({ trades: [trade(1)], settings: { startingEquity: 50000 } })
  const decision = reconcile(record, { state: 'read', record })

  assert.equal(decision.outcome, 'in-sync')
  assert.equal(decision.push, null, 'an unchanged record is not posted back')
})

test('two records that differ merge, and the merge is what gets written up', () => {
  const local = journal({ trades: [trade(1)] })
  const remote = journal({ trades: [trade(2)] })
  const decision = reconcile(local, { state: 'read', record: remote })

  assert.equal(decision.outcome, 'merged')
  assert.deepEqual(
    decision.adopt.trades.map((entry) => entry.id),
    [1, 2]
  )
  assert.equal(decision.push, decision.adopt)
  assert.equal(decision.migrated, false, 'a merge is not a migration')
})

/**
 * A journal that could not be reached is not a journal that is empty, and the
 * difference is somebody's history. Both failures change nothing on either side.
 */
test('an unreachable account leaves the browser record exactly where it was', () => {
  const local = journal({ trades: [trade(1)] })

  for (const state of ['unavailable', 'error']) {
    const decision = reconcile(local, { state, record: null })
    assert.equal(decision.adopt, null, `${state}: nothing is adopted`)
    assert.equal(decision.push, null, `${state}: nothing is written`)
    assert.equal(decision.outcome, state)
  }

  const noAnswer = reconcile(local, null)
  assert.equal(noAnswer.adopt, null)
  assert.equal(noAnswer.push, null)
})
