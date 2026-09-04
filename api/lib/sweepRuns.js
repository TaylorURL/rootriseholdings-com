/**
 * The sweep's own heartbeat.
 *
 * A pass that finds nothing writes nothing, which is correct - the record holds
 * calls, not attempts - and it is also why a sweep can stop working without
 * anything on the site changing. The published record was empty for three days
 * while the endpoint answered two hundred on every one of its two-minute
 * invocations, and there was no object anywhere that could be asked whether the
 * desk had read the market. This writes that object.
 *
 * It never fails a pass. The heartbeat is the record of the work, not the work,
 * and a table that is not there yet - or a write that is refused - is worth
 * reporting in the response and worth nothing at all compared to the call the
 * pass may have just published.
 */

/**
 * The codes a database gives for a table that does not exist.
 *
 * The migration lands separately from the deploy, so there is a window where
 * this table is not there. That is a deployment saying so, not a fault, and it
 * reads differently from a write the database refused.
 */
const MISSING_TABLE = new Set(['42P01', 'PGRST205'])

/**
 * The codes for a column the table does not have.
 *
 * Same window, one level down: a deploy that carries a new field can land
 * before the migration that makes room for it. Losing the whole heartbeat over
 * one field would trade the pass's only proof of life for a detail about it, so
 * the write goes again without the field and says which one it dropped.
 */
const MISSING_COLUMN = new Set(['42703', 'PGRST204'])

/**
 * Writes one pass's heartbeat.
 *
 * @param {object} client - the service-role client
 * @param {object} run
 * @param {string} run.origin - where the pass pointed its feed reads
 * @param {number} run.instruments - how many it set out to read
 * @param {number} run.read - how many answered
 * @param {number} run.published
 * @param {number} run.inserted
 * @param {number} run.updated
 * @param {{symbol:string, reason:string, detail:string|null}[]} run.unread
 * @param {{symbol:string, reason:string, detail:string|null}[]} [run.withheld]
 * @param {boolean} run.ok
 * @param {number} run.ms
 * @returns {Promise<'written'|'unavailable'|string>} the failure's own words
 *   where there was one, so the sweep's answer can carry it
 */
export async function recordSweepRun(client, run) {
  const row = {
    ran_at: new Date().toISOString(),
    origin: run.origin || null,
    instruments: run.instruments,
    read: run.read,
    published: run.published,
    inserted: run.inserted ?? 0,
    updated: run.updated ?? 0,
    unread: run.unread ?? [],
    withheld: run.withheld ?? [],
    ok: run.ok,
    ms: run.ms ?? null,
  }

  try {
    const { error } = await client.from('sweep_runs').insert(row)
    if (!error) return 'written'
    if (MISSING_TABLE.has(error.code)) return 'unavailable'
    if (!MISSING_COLUMN.has(error.code)) return String(error.message ?? error)

    const { withheld: _withheld, ...older } = row
    const retried = await client.from('sweep_runs').insert(older)
    if (!retried.error) return 'written without withheld'
    if (MISSING_TABLE.has(retried.error.code)) return 'unavailable'
    return String(retried.error.message ?? retried.error)
  } catch (error) {
    return String(error?.message ?? error)
  }
}
