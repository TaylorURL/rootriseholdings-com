/**
 * The table's shape, in the engine's terms.
 *
 * Both sides of the app read the record - the host writes it, the browser
 * renders it - so the mapping lives where both can import it rather than being
 * written twice and drifting.
 */

const ms = (value) => (value == null ? null : new Date(value).getTime())
const iso = (value) => (value == null ? null : new Date(value).toISOString())

/** @param {object} row @returns {object} a signal as the engine describes one */
export function fromRow(row) {
  return {
    id: row.id,
    fingerprint: row.fingerprint,
    symbol: row.symbol,
    timeframe: row.timeframe,
    side: row.side,
    entry: row.entry,
    stop: row.stop,
    target: row.target,
    target2: row.target2,
    target3: row.target3,
    rewardToRisk: row.reward_to_risk,
    grade: row.grade,
    setup: row.setup,
    continuation: row.continuation,
    reversalRisk: row.reversal_risk,
    alignment: row.alignment,
    reasons: Array.isArray(row.reasons) ? row.reasons : [],
    emittedAt: ms(row.emitted_at),
    venue: row.venue,
    priceAtEmit: row.price_at_emit,
    status: row.status,
    filledAt: ms(row.filled_at),
    resolvedAt: ms(row.resolved_at),
    realisedR: row.realised_r,
  }
}

/**
 * A signal in the shape the table stores it.
 *
 * The id is left off deliberately. The engine mints one from a counter that
 * starts again with every process, which is fine inside a sweep and useless as
 * a key across them, so the row keeps the database's own.
 *
 * @param {object} signal
 * @returns {object} a row ready to insert
 */
export function toRow(signal) {
  return {
    fingerprint: signal.fingerprint,
    symbol: signal.symbol,
    timeframe: signal.timeframe,
    side: signal.side,
    entry: signal.entry,
    stop: signal.stop,
    target: signal.target,
    target2: signal.target2 ?? null,
    target3: signal.target3 ?? null,
    reward_to_risk: signal.rewardToRisk,
    grade: signal.grade,
    setup: signal.setup,
    continuation: signal.continuation ?? null,
    reversal_risk: signal.reversalRisk ?? null,
    alignment: signal.alignment ?? null,
    reasons: signal.reasons ?? [],
    emitted_at: iso(signal.emittedAt),
    venue: signal.venue ?? null,
    price_at_emit: signal.priceAtEmit ?? null,
    status: signal.status,
    filled_at: iso(signal.filledAt),
    resolved_at: iso(signal.resolvedAt),
    realised_r: signal.realisedR ?? null,
  }
}

/** Epoch milliseconds as the timestamp the table stores. */
export { iso as toTimestamp }
