import { supabase } from '../supabase.js'
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
export const PAGE_SIZE = 500

/**
 * @param {object} [options]
 * @param {AbortSignal} [options.signal]
 * @returns {Promise<{signals:object[], error:string|null}>} an empty record and
 *   a stated reason rather than a throw, so a desk whose record is unreachable
 *   still renders the rest of itself
 */
export async function fetchSignals({ signal } = {}) {
  try {
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
