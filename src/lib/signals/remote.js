import { loadSupabase } from '../supabase.js'
import { fromRow } from './row.js'

/**
 * Reading the published record.
 *
 * The browser no longer produces the record - the host's sweep does - so this
 * is a read and nothing else. What a reader sees is what the table holds,
 * which is what every other reader sees, which is the whole reason the sweep
 * moved off the tab.
 */

/**
 * How much of the record a surface loads.
 *
 * The history is the product and it is meant to be long, but a page does not
 * need all of it to draw a scoreboard and a list. This is a page size, not a
 * cap on what is kept: the table keeps everything.
 */
const PAGE_SIZE = 500

/**
 * @param {object} [options]
 * @param {AbortSignal} [options.signal]
 * @returns {Promise<{signals:object[], error:string|null}>} an empty record and
 *   a stated reason rather than a throw, so a desk whose record is unreachable
 *   still renders the rest of itself
 */
export async function fetchSignals({ signal } = {}) {
  try {
    const supabase = await loadSupabase()
    const query = supabase
      .from('signals')
      .select('*')
      .order('emitted_at', { ascending: false })
      .limit(PAGE_SIZE)
    const { data, error } = signal ? await query.abortSignal(signal) : await query
    if (error) return { signals: [], error: error.message }
    return { signals: (data ?? []).map(fromRow), error: null }
  } catch (error) {
    return { signals: [], error: String(error?.message ?? error) }
  }
}

/**
 * The last pass the desk ran, or nothing when the log cannot be read.
 *
 * A record with no calls in it is two entirely different facts wearing the same
 * face - the desk read the market and called nothing, or the desk did not read
 * the market - and a reader deciding whether to trust an empty screen is
 * exactly the person who needs them told apart. This is what the surfaces
 * condition that sentence on.
 *
 * A failure here is not worth saying out loud. The heartbeat is context for the
 * record rather than part of it, so a surface that cannot read one says nothing
 * about the sweep instead of putting a second error in front of a reader who
 * already has the record itself.
 *
 * @param {object} [options]
 * @param {AbortSignal} [options.signal]
 * @returns {Promise<{ranAt:number, origin:string|null, instruments:number, read:number,
 *   published:number, unread:object[], withheld:object[], ok:boolean}|null>}
 */
export async function fetchLastSweep({ signal } = {}) {
  try {
    const supabase = await loadSupabase()
    const query = supabase
      .from('sweep_runs')
      .select('*')
      .order('ran_at', { ascending: false })
      .limit(1)
    const { data, error } = signal ? await query.abortSignal(signal) : await query
    if (error) return null
    const row = data?.[0]
    if (!row) return null
    return {
      ranAt: new Date(row.ran_at).getTime(),
      origin: row.origin ?? null,
      instruments: row.instruments ?? 0,
      read: row.read ?? 0,
      published: row.published ?? 0,
      unread: Array.isArray(row.unread) ? row.unread : [],
      withheld: Array.isArray(row.withheld) ? row.withheld : [],
      ok: row.ok !== false,
    }
  } catch {
    return null
  }
}
