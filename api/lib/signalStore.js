/**
 * The published record, as the host reads and writes it.
 *
 * The engine speaks in epoch milliseconds and camel case because that is what
 * a browser hands a chart; the table speaks in timestamps and snake case
 * because that is what a database is for. This is the one place the two meet,
 * so neither side has to know about the other.
 *
 * Writes go out under the service role. The table's own policy lets a signed-in
 * reader select and nothing else, which is the point: the sweep is the only
 * author of the record, and a record its readers could edit is not evidence of
 * anything.
 */

import { createClient } from '@supabase/supabase-js'
import { fromRow, toRow } from '../../src/lib/signals/row.js'

/** The statuses a sweep still has work to do on. */
const STANDING = ['live', 'filled']

const iso = (value) => (value == null ? null : new Date(value).toISOString())

/**
 * The service-role client, or null when the host is not configured for it.
 *
 * Returning null rather than throwing lets the sweep answer with a plain
 * "not configured" instead of a stack trace, which is the difference between a
 * deploy that is missing a variable and one that looks broken.
 */
export function signalClient() {
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

/**
 * The calls the tape has not finished answering.
 *
 * A settled signal is never scored again - resolveSignal returns it untouched -
 * so a sweep that read the whole history would re-send thousands of rows to
 * learn nothing. Reading only what is standing keeps a sweep the same size
 * whether the record is a week old or a year.
 *
 * @param {object} client
 * @returns {Promise<object[]>}
 */
export async function readStanding(client) {
  const { data, error } = await client
    .from('signals')
    .select('*')
    .in('status', STANDING)
    .order('emitted_at', { ascending: false })
  if (error) throw new Error(`reading the record failed: ${error.message}`)
  return (data ?? []).map(fromRow)
}

/**
 * Writes a sweep's outcome back.
 *
 * New calls are inserted and existing ones updated by id, rather than both
 * going through one upsert: a published call has no id yet, and an upsert
 * keyed on the fingerprint would quietly overwrite the standing call a
 * re-formed setup is supposed to sit alongside.
 *
 * Calls are inserted one at a time rather than as one batch, because a batch
 * is all-or-nothing: a single duplicate refusal would discard every other call
 * found in the same pass, and a pass that finds several at once is exactly the
 * one worth keeping. A duplicate is ignored on purpose - the partial unique
 * index is what stops two overlapping sweeps publishing the same standing call
 * twice, and the loser of that race has nothing to report, because the call it
 * wanted to write is already in the record. A sweep publishes a handful at
 * most, so the extra round trips cost nothing worth trading a lost call for.
 *
 * A call the engine has just minted carries an id from its own counter, and a
 * call read back from the table carries the table's. Which is which is decided
 * by the ids the sweep reported as published rather than by the shape of the
 * id, because the shape is the engine's business and could change.
 *
 * @param {object} client
 * @param {object} args
 * @param {object[]} args.published - calls found this sweep
 * @param {object[]} args.scored - every standing call, advanced
 * @param {object[]} args.before - the same calls as they were read
 * @returns {Promise<{inserted:number, updated:number}>}
 */
export async function persistSweep(client, { published, scored, before }) {
  let inserted = 0
  const publishedIds = new Set(published.map((signal) => signal.id))
  const fresh = scored.filter((signal) => publishedIds.has(signal.id))

  for (const signal of fresh) {
    const { error } = await client.from('signals').insert(toRow(signal))
    if (!error) {
      inserted += 1
      continue
    }
    if (error.code === '23505') continue
    throw new Error(`publishing ${signal.symbol} failed: ${error.message}`)
  }

  const priorStatus = new Map(before.map((signal) => [signal.id, signal.status]))
  const changed = scored.filter(
    (signal) => !publishedIds.has(signal.id) && priorStatus.get(signal.id) !== signal.status
  )

  for (const signal of changed) {
    const { error } = await client
      .from('signals')
      .update({
        status: signal.status,
        filled_at: iso(signal.filledAt),
        resolved_at: iso(signal.resolvedAt),
        realised_r: signal.realisedR ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', signal.id)
    if (error) throw new Error(`scoring ${signal.id} failed: ${error.message}`)
  }

  return { inserted, updated: changed.length }
}
