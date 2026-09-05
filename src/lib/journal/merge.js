/**
 * Reconciling a journal held in a browser with the one held on the account.
 *
 * The account is the record from here on, but the browser is where every
 * existing journal lives, so the first sign-in after this lands is the one
 * moment both sides hold something real. Overwriting either would throw away
 * work somebody typed, so neither is overwritten: the two are merged, and the
 * rules below are chosen so that no field of either input can be lost.
 *
 * The shape of the rules is the same everywhere. Anything with an identity -
 * a trade, a prop firm, a day plan - is unioned by that identity, and where
 * both sides hold the same one, the copy carrying more of the story wins. Only
 * the plain scalars have to pick a side, and there the account wins, because it
 * is the copy every other device is also reading.
 */

/**
 * Which of two versions of the same trade to keep.
 *
 * A trade is written once and changed once, when it closes, and closing is what
 * adds the exit price, the realised R and the money. So a closed copy strictly
 * contains an open one and there is nothing to weigh: the closed one wins. Two
 * closed copies means the same trade was closed on two devices, which can only
 * be a duplicate of the same act, and the later stamp is the one that recorded
 * it last. Two open copies are the same row by construction.
 *
 * @param {object} mine - the browser's copy
 * @param {object} theirs - the account's copy
 * @returns {object}
 */
function richerTrade(mine, theirs) {
  const mineClosed = mine.status === 'closed'
  const theirsClosed = theirs.status === 'closed'
  if (mineClosed !== theirsClosed) return mineClosed ? mine : theirs
  if (mineClosed && theirsClosed) {
    return new Date(theirs.closedAt ?? 0) >= new Date(mine.closedAt ?? 0) ? theirs : mine
  }
  return theirs
}

/**
 * Every trade from both sides, in the order they were opened.
 *
 * The record is kept in opening order everywhere else - restoreTrade sorts a
 * recovered trade back into it rather than appending - so a merge that appended
 * one side after the other would leave a journal that reads out of sequence.
 */
function mergeTrades(mine, theirs) {
  const byId = new Map()
  for (const trade of mine) byId.set(trade.id, trade)
  for (const trade of theirs) {
    const held = byId.get(trade.id)
    byId.set(trade.id, held ? richerTrade(held, trade) : trade)
  }
  return [...byId.values()].sort((a, b) => new Date(a.openedAt) - new Date(b.openedAt))
}

/**
 * Every firm from both sides, the account's copy winning a tie.
 *
 * A firm is configuration rather than history - a name, a drawdown, a target -
 * so there is no "further along" copy to prefer the way there is with a trade.
 * The account's is taken because it is the one every other device is reading.
 */
function mergeFirms(mine, theirs) {
  const byId = new Map()
  for (const firm of mine) byId.set(firm.id, firm)
  for (const firm of theirs) byId.set(firm.id, firm)
  return [...byId.values()]
}

/**
 * Every day plan from both sides, the later revision winning a shared date.
 *
 * savePlan stamps `updatedAt` on every write, so a plan edited on two devices
 * on the same day can be resolved by the one thing that separates them. A plan
 * written before that stamp existed sorts as the older of the two, which is the
 * safe direction: it means an unstamped local plan cannot displace a stamped
 * one that was written later.
 */
function mergePlans(mine, theirs) {
  const merged = { ...mine }
  for (const [dateKey, plan] of Object.entries(theirs ?? {})) {
    const held = merged[dateKey]
    if (!held) {
      merged[dateKey] = plan
      continue
    }
    merged[dateKey] = new Date(plan?.updatedAt ?? 0) >= new Date(held?.updatedAt ?? 0) ? plan : held
  }
  return merged
}

/**
 * Which firm is selected once both lists have been folded together.
 *
 * A selection is only meaningful if it names a firm that is still there, so
 * each candidate is checked against the merged list rather than trusted. The
 * account's choice is asked first, the browser's second, and a journal left
 * pointing at nothing falls back to the first firm it has - which is what
 * saveFirm does when it sets the selection on the first firm added.
 */
function mergeActiveFirmId(mine, theirs, firms) {
  const exists = (id) => id != null && firms.some((firm) => firm.id === id)
  if (exists(theirs)) return theirs
  if (exists(mine)) return mine
  return firms[0]?.id ?? null
}

/**
 * The account's journal and this browser's, folded into one that holds
 * everything either of them held.
 *
 * Scalars - the starting equity, and each point value - take the account's
 * answer where it has one and the browser's where it does not. `null` is what
 * an unset equity looks like, so "where it has one" is a real test rather than
 * a formality: a device that has never had the equity set cannot blank it on
 * the account, and an account that has never had it set still picks up the
 * figure the browser was using.
 *
 * @param {object} mine - the journal this browser holds
 * @param {object} theirs - the journal the account holds
 * @returns {object} a journal in the same shape as either input
 */
export function mergeJournals(mine, theirs) {
  if (!theirs) return mine
  if (!mine) return theirs

  const firms = mergeFirms(mine.settings?.firms ?? [], theirs.settings?.firms ?? [])

  return {
    ...theirs,
    version: theirs.version ?? mine.version,
    trades: mergeTrades(mine.trades ?? [], theirs.trades ?? []),
    settings: {
      ...mine.settings,
      ...theirs.settings,
      startingEquity: theirs.settings?.startingEquity ?? mine.settings?.startingEquity ?? null,
      pointValues: {
        ...(mine.settings?.pointValues ?? {}),
        ...(theirs.settings?.pointValues ?? {}),
      },
      firms,
      activeFirmId: mergeActiveFirmId(
        mine.settings?.activeFirmId,
        theirs.settings?.activeFirmId,
        firms
      ),
    },
    plans: mergePlans(mine.plans ?? {}, theirs.plans ?? {}),
  }
}

/**
 * Two records compared by content rather than by reference or by key order.
 *
 * A merge that changed nothing must not be written back, or a desk left open on
 * two machines would push an identical document at each other on every load.
 * `JSON.stringify` alone cannot answer that - it preserves insertion order, and
 * the merge above rebuilds its objects, so an unchanged record reliably
 * stringifies differently from the one it came from. Sorting the keys on the
 * way out is what makes the comparison about the content.
 *
 * @param {unknown} a
 * @param {unknown} b
 * @returns {boolean}
 */
export function sameRecord(a, b) {
  return stable(a) === stable(b)
}

function stable(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null'
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`
  const keys = Object.keys(value).sort()
  return `{${keys.map((key) => `${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}`
}

/**
 * What to do about the two copies, decided without touching either store.
 *
 * Kept apart from the context that calls it because this is the whole of the
 * behaviour worth arguing about - which copy wins, when a browser's record is
 * carried up, when nothing should be written at all - and it is worth being
 * able to test that without a React tree or a network around it.
 *
 * A journal that could not be reached is not a journal that is empty. Both
 * failure states return an instruction to change nothing, so a network blip or
 * a schema that has not caught up yet leaves the reader on the local copy they
 * already had rather than appearing to wipe their account.
 *
 * @param {object} local - the journal this browser holds
 * @param {{state:string, record:object|null}} remote - what fetchJournal returned
 * @returns {{adopt:object|null, push:object|null, migrated:boolean, outcome:string}}
 *   `adopt` is the record the app should now hold, or null to keep what it has;
 *   `push` is the record to write to the account, or null to write nothing
 */
export function reconcile(local, remote) {
  if (!remote || remote.state === 'unavailable' || remote.state === 'error') {
    return { adopt: null, push: null, migrated: false, outcome: remote?.state ?? 'error' }
  }

  if (remote.state === 'absent') {
    // The first sign-in on an account that has never held a journal. This is
    // the migration: whatever the browser has been carrying becomes the record.
    if (!hasContent(local)) {
      return { adopt: null, push: null, migrated: false, outcome: 'nothing-to-carry' }
    }
    return { adopt: local, push: local, migrated: true, outcome: 'migrated' }
  }

  // A browser with nothing of its own is a new device on an existing account,
  // which is the case this whole change exists to serve: take the record down
  // and write nothing back.
  if (!hasContent(local)) {
    return { adopt: remote.record, push: null, migrated: false, outcome: 'adopted' }
  }

  const merged = mergeJournals(local, remote.record)
  if (sameRecord(merged, remote.record)) {
    return { adopt: merged, push: null, migrated: false, outcome: 'in-sync' }
  }
  return { adopt: merged, push: merged, migrated: false, outcome: 'merged' }
}

/**
 * Whether a journal holds anything a person put there.
 *
 * A browser that has only ever rendered the page holds an empty record rather
 * than no record, and carrying that up to an account would be indistinguishable
 * from a real first migration while writing nothing worth keeping. The test is
 * what a person could have typed: a trade, an equity, a firm, a point value, a
 * plan. The version number and the empty containers around them are not.
 *
 * @param {object} journal
 * @returns {boolean}
 */
export function hasContent(journal) {
  if (!journal) return false
  if ((journal.trades ?? []).length > 0) return true
  if (Object.keys(journal.plans ?? {}).length > 0) return true
  const settings = journal.settings ?? {}
  if (settings.startingEquity != null) return true
  if ((settings.firms ?? []).length > 0) return true
  if (Object.keys(settings.pointValues ?? {}).length > 0) return true
  return false
}
