/**
 * The signal record, and how a signal is scored once the tape has answered it.
 *
 * A call the desk publishes is a claim about what price does next, and the
 * only honest way to hold it is to write it down before the answer arrives and
 * score it against the bars that follow. So a signal stores the four numbers
 * it was published with and never re-reads them; the outcome is derived by
 * walking the candles printed after it, not by asking the engine what it
 * thinks now.
 *
 * Scoring runs in the order a trade actually happens. Price has to reach the
 * entry before anything else counts - a call that never filled is not a loss,
 * it is a call that did not become a trade. After a fill, whichever of the
 * stop and the target the tape touches first is the result. When one bar spans
 * both, the stop is taken: inside a bar there is no way to know which side
 * printed first, and a record that resolves its own ambiguities in its own
 * favour is worth nothing to anyone deciding whether to pay for it.
 *
 * @typedef {object} Signal
 * @property {string} id
 * @property {string} symbol
 * @property {string} timeframe
 * @property {'BUY'|'SELL'} side
 * @property {number} entry
 * @property {number} stop
 * @property {number} target
 * @property {number} rewardToRisk
 * @property {string} grade
 * @property {string} setup
 * @property {string[]} reasons
 * @property {number} emittedAt - epoch ms
 * @property {number|null} priceAtEmit
 * @property {'live'|'filled'|'target'|'stop'|'expired'} status
 * @property {number|null} filledAt
 * @property {number|null} resolvedAt
 * @property {number|null} realisedR - +rewardToRisk on a target, -1 on a stop
 */

/** How long a call stands before the tape is deemed to have ignored it. */
const EXPIRY_HOURS = { '15m': 8, '1H': 48, '4H': 120, Daily: 720 }

const HOUR_MS = 3_600_000

let counter = 0

function nextId(at) {
  counter += 1
  return `S${at.toString(36)}${counter.toString(36)}`
}

/** Two calls are the same call when every number an order needs matches. */
export function signalFingerprint({ symbol, timeframe, side, entry, stop, target }) {
  const round = (value) => Number(value).toPrecision(8)
  return [symbol, timeframe, side, round(entry), round(stop), round(target)].join('|')
}

/**
 * @param {object} args
 * @param {string} args.symbol
 * @param {string} args.timeframe
 * @param {object} args.call - from {@link import('../smc/signal.js').deriveTradeCall}
 * @param {number|null} [args.price] - the live price when the call was published
 * @param {number} [args.now] - epoch ms
 * @returns {Signal}
 */
export function createSignal({ symbol, timeframe, call, price = null, now = Date.now() }) {
  return {
    id: nextId(now),
    fingerprint: signalFingerprint({ symbol, timeframe, ...call }),
    symbol,
    timeframe,
    side: call.side,
    entry: call.entry,
    stop: call.stop,
    target: call.target,
    target2: call.target2 ?? null,
    target3: call.target3 ?? null,
    rewardToRisk: call.rewardToRisk,
    grade: call.grade,
    setup: call.setup,
    continuation: call.continuation ?? null,
    reversalRisk: call.reversalRisk ?? null,
    alignment: call.alignment ?? null,
    reasons: [...(call.reasons ?? [])],
    emittedAt: now,
    priceAtEmit: price,
    status: 'live',
    filledAt: null,
    resolvedAt: null,
    realisedR: null,
  }
}

function touched(candle, level) {
  return candle.low <= level && candle.high >= level
}

/**
 * Scores a signal against the bars printed since it was published.
 *
 * @param {Signal} signal
 * @param {object[]} candles - oldest first, any window covering the signal
 * @param {number} [now] - epoch ms
 * @returns {Signal} the signal, advanced as far as the candles allow
 */
export function resolveSignal(signal, candles, now = Date.now()) {
  if (signal.status === 'target' || signal.status === 'stop' || signal.status === 'expired') {
    return signal
  }

  const expiryMs = (EXPIRY_HOURS[signal.timeframe] ?? EXPIRY_HOURS['1H']) * HOUR_MS
  const deadline = signal.emittedAt + expiryMs
  let filledAt = signal.filledAt

  for (const candle of candles) {
    if (candle.time <= signal.emittedAt) continue
    if (filledAt == null) {
      if (!touched(candle, signal.entry)) continue
      filledAt = candle.time
    }
    // A bar spanning both sides is read as the stop, because the order the two
    // printed inside it is not knowable from the bar.
    const hitStop = touched(candle, signal.stop)
    const hitTarget = touched(candle, signal.target)
    if (hitStop) {
      return { ...signal, status: 'stop', filledAt, resolvedAt: candle.time, realisedR: -1 }
    }
    if (hitTarget) {
      return {
        ...signal,
        status: 'target',
        filledAt,
        resolvedAt: candle.time,
        realisedR: signal.rewardToRisk,
      }
    }
  }

  if (filledAt == null && now > deadline) {
    return { ...signal, status: 'expired', resolvedAt: deadline, realisedR: null }
  }
  return { ...signal, status: filledAt == null ? 'live' : 'filled', filledAt }
}

/** The statuses that mean the tape has finished answering. */
export const SETTLED = new Set(['target', 'stop', 'expired'])

/**
 * The record as a scoreboard.
 *
 * The hit rate counts only signals that became trades, because a call price
 * never reached says nothing about whether the read was right. Expiries carry
 * their own count and sit outside the rate entirely.
 *
 * @param {Signal[]} signals
 * @returns {object} counts, hit rate and total R
 */
export function signalStats(signals) {
  const settled = signals.filter((signal) => SETTLED.has(signal.status))
  const traded = settled.filter((signal) => signal.status !== 'expired')
  const wins = traded.filter((signal) => signal.status === 'target')
  const totalR = traded.reduce((sum, signal) => sum + (signal.realisedR ?? 0), 0)
  return {
    published: signals.length,
    live: signals.filter((signal) => signal.status === 'live').length,
    open: signals.filter((signal) => signal.status === 'filled').length,
    triggered: traded.length,
    wins: wins.length,
    losses: traded.length - wins.length,
    expired: settled.filter((signal) => signal.status === 'expired').length,
    hitRate: traded.length ? wins.length / traded.length : null,
    totalR,
    averageR: traded.length ? totalR / traded.length : null,
  }
}
