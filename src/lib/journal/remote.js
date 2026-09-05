/**
 * The journal as the account holds it.
 *
 * One row per user in `public.journals`, carrying the same versioned document
 * `store.js` writes to local storage. Keeping the two in the same shape is the
 * point: the browser copy stays a cache that works offline and on a signed-out
 * page, the account copy is the record, and moving between them is a copy
 * rather than a translation.
 *
 * Nothing here throws. A journal that cannot be reached is a journal the reader
 * goes on using locally, and a desk that refused to open because a network was
 * down would be worse than one that is a few minutes behind. Every function
 * reports what happened instead, so the caller can say so.
 */

const TABLE = 'journals'

/** The Postgres code for a table that is not in the schema yet. */
const MISSING_TABLE = new Set(['42P01', 'PGRST205'])

/**
 * The journal on this account, or null where there is not one yet.
 *
 * `maybeSingle` rather than `single`, because no row is the expected answer on
 * a first sign-in and not an error worth reporting as one.
 *
 * @param {object} supabase
 * @param {string} userId
 * @returns {Promise<{state:'read'|'absent'|'unavailable'|'error',
 *   record:object|null, updatedAt:string|null, migratedAt:string|null, error:string|null}>}
 */
export async function fetchJournal(supabase, userId) {
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select('record, updated_at, migrated_at')
      .eq('user_id', userId)
      .maybeSingle()
    if (error) {
      if (MISSING_TABLE.has(error.code)) {
        return {
          state: 'unavailable',
          record: null,
          updatedAt: null,
          migratedAt: null,
          error: null,
        }
      }
      return {
        state: 'error',
        record: null,
        updatedAt: null,
        migratedAt: null,
        error: error.message ?? String(error),
      }
    }
    if (!data) {
      return { state: 'absent', record: null, updatedAt: null, migratedAt: null, error: null }
    }
    return {
      state: 'read',
      record: data.record ?? null,
      updatedAt: data.updated_at ?? null,
      migratedAt: data.migrated_at ?? null,
      error: null,
    }
  } catch (cause) {
    return {
      state: 'error',
      record: null,
      updatedAt: null,
      migratedAt: null,
      error: String(cause?.message ?? cause),
    }
  }
}

/**
 * Writes the journal to the account, creating the row on the first write.
 *
 * `upsert` on the primary key rather than a read followed by an insert or an
 * update: two tabs saving in the same moment would both read no row and both
 * insert, and the second would fail on the key rather than doing what it meant.
 *
 * `updated_at` is deliberately not sent. The column is stamped by a trigger, so
 * a browser with a wrong clock cannot make a stale record look current.
 *
 * @param {object} supabase
 * @param {string} userId
 * @param {object} record
 * @param {object} [options]
 * @param {boolean} [options.migrated] - stamp this write as the moment a
 *   browser's record was first carried onto the account
 * @returns {Promise<{ok:boolean, state:'written'|'unavailable'|'error', error:string|null}>}
 */
export async function pushJournal(supabase, userId, record, { migrated = false } = {}) {
  const row = { user_id: userId, record }
  if (migrated) row.migrated_at = new Date().toISOString()
  try {
    const { error } = await supabase.from(TABLE).upsert(row, { onConflict: 'user_id' })
    if (error) {
      if (MISSING_TABLE.has(error.code)) return { ok: false, state: 'unavailable', error: null }
      return { ok: false, state: 'error', error: error.message ?? String(error) }
    }
    return { ok: true, state: 'written', error: null }
  } catch (cause) {
    return { ok: false, state: 'error', error: String(cause?.message ?? cause) }
  }
}
