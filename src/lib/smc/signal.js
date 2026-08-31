import { RISK_RULES, computeRewardToRisk } from '../../data/riskRules.js'
import { MAX_REVERSAL_RISK, MIN_CONTINUATION_SCORE, scoreStructure } from './score.js'

/**
 * The trade call a structure read implies.
 *
 * A structure read says where price is. A call says what to do about it, in
 * the numbers an order ticket needs: side, entry, stop, targets. Most reads
 * imply no call at all, and refusing those is the point — the gate below is
 * the same one the desk's chart annotations fire on, so the site publishes
 * what the chart draws rather than everything the chart could have drawn.
 *
 * @typedef {object} TradeCall
 * @property {'BUY'|'SELL'} side
 * @property {number} entry - the close of the bar that confirmed the setup
 * @property {number} stop - past the last swing, with an ATR of room
 * @property {number} target - the leg's extreme
 * @property {number} target2 - the 1.618 extension of the impulse
 * @property {number} target3 - the 2.0 extension of the impulse
 * @property {number} rewardToRisk - measured to the first target
 * @property {'A+'|'A'|'B'} grade
 * @property {string} setup - BOS | CHoCH | OTE
 * @property {string[]} reasons - what the read says, in the order it says it
 */

/** Room past the broken swing where the stop sits, in ATRs. */
const STOP_BUFFER_ATR = 0.3

/** Where the second and third targets sit on the impulse, as fib extensions. */
const TARGET_EXTENSIONS = { second: 1.618, third: 2.0 }

/** Pullback depths a setup may be taken from. Deeper is a trend in trouble. */
const TRADEABLE_PULLBACKS = new Set(['Shallow', 'Healthy'])

/** Breaks decisive enough to act on. */
const TRADEABLE_STRENGTH = new Set(['Strong', 'Moderate'])

const BULL_ALIGNMENTS = new Set(['Full Bull', 'Partial Bull'])
const BEAR_ALIGNMENTS = new Set(['Full Bear', 'Partial Bear'])

/**
 * The grade a call carries.
 *
 * Both halves have to be there: a high continuation score on a two-to-one is
 * an ordinary setup, and a five-to-one off a weak read is a lottery ticket.
 */
function gradeFor(continuation, rewardToRisk) {
  if (continuation >= 90 && rewardToRisk >= 3.0) return 'A+'
  if (continuation >= 80 && rewardToRisk >= 2.5) return 'A'
  return 'B'
}

const stand = (reason) => ({ call: null, standDown: reason })

/**
 * @param {object} args
 * @param {object} args.execution - analyzeStructure on the execution timeframe
 * @param {string} args.alignment - from alignmentOf() across execution and both bias timeframes
 * @param {'SHORT'|null} [args.sideConstraint] - a playbook restriction on this instrument
 * @param {number|null} [args.price] - the live price, when it differs from the last close
 * @returns {{call: TradeCall|null, standDown: string|null, scores: {continuation:number, reversalRisk:number}}}
 */
export function deriveTradeCall({ execution, alignment = 'Mixed', sideConstraint, price }) {
  const scores = scoreStructure(execution, alignment)
  const result = (outcome) => ({ ...outcome, scores })

  if (!execution || execution.trend === 'none') {
    return result(stand('No trend is established, so there is nothing to continue.'))
  }

  const side = execution.trend === 'up' ? 'BUY' : 'SELL'
  if (sideConstraint === 'SHORT' && side === 'BUY') {
    return result(stand('Structure is bullish, and the playbook allows shorts only here.'))
  }

  const { origin, extreme } = execution.leg ?? {}
  const swing = side === 'BUY' ? execution.swings?.lastLow : execution.swings?.lastHigh
  if (origin == null || extreme == null || swing == null) {
    return result(stand('The leg is not fully formed yet.'))
  }

  if (scores.continuation < MIN_CONTINUATION_SCORE) {
    return result(
      stand(
        `Continuation scores ${Math.round(scores.continuation)}, under the ${MIN_CONTINUATION_SCORE} this desk takes a setup at.`
      )
    )
  }
  if (scores.reversalRisk > MAX_REVERSAL_RISK) {
    return result(
      stand(
        `Reversal risk is ${Math.round(scores.reversalRisk)}, over the ${MAX_REVERSAL_RISK} ceiling.`
      )
    )
  }

  const alignmentOk =
    side === 'BUY' ? BULL_ALIGNMENTS.has(alignment) : BEAR_ALIGNMENTS.has(alignment)
  if (!alignmentOk) {
    return result(stand(`Higher timeframes read ${alignment.toLowerCase()}, not with this side.`))
  }
  if (!TRADEABLE_PULLBACKS.has(execution.pullbackState)) {
    return result(
      stand(
        execution.pullbackState
          ? `The pullback is ${execution.pullbackState.toLowerCase()}, not a depth this desk enters from.`
          : 'There is no measurable pullback to enter from.'
      )
    )
  }
  if (!TRADEABLE_STRENGTH.has(execution.lastStrength)) {
    return result(
      stand(
        execution.lastStrength === 'Failed'
          ? 'The last break was reclaimed, so it was not a break.'
          : 'The last break was weak, and a weak break is not acted on.'
      )
    )
  }
  if (execution.retestState === 'Failed Retest') {
    return result(stand('Price came back through the broken level, which fails the retest.'))
  }

  const atr = execution.atr
  if (!(atr > 0)) {
    return result(stand('There is not enough history to measure the stop against.'))
  }

  const entry = price ?? execution.lastClose
  if (entry == null) {
    return result(stand('No price to enter at.'))
  }

  const buffer = atr * STOP_BUFFER_ATR
  const stop = side === 'BUY' ? swing - buffer : swing + buffer
  const target = extreme
  const impulse = side === 'BUY' ? extreme - origin : origin - extreme
  const target2 =
    side === 'BUY'
      ? origin + impulse * TARGET_EXTENSIONS.second
      : origin - impulse * TARGET_EXTENSIONS.second
  const target3 =
    side === 'BUY'
      ? origin + impulse * TARGET_EXTENSIONS.third
      : origin - impulse * TARGET_EXTENSIONS.third

  const targetBeyondEntry = side === 'BUY' ? target > entry : target < entry
  const stopBehindEntry = side === 'BUY' ? stop < entry : stop > entry
  if (!targetBeyondEntry || !stopBehindEntry) {
    return result(stand('Price has already run past the level this setup would target.'))
  }

  const rewardToRisk = computeRewardToRisk({ entry, stop, target, side })
  if (!(rewardToRisk >= RISK_RULES.minRewardToRisk)) {
    return result(
      stand(
        `The setup pays ${rewardToRisk.toFixed(2)}R, under the ${RISK_RULES.minRewardToRisk}R minimum.`
      )
    )
  }

  const reasons = []
  if (execution.lastEvent) {
    reasons.push(`${execution.lastEvent.type} on a ${execution.lastStrength.toLowerCase()} candle`)
  }
  reasons.push(
    `Pullback is ${execution.pullbackState.toLowerCase()} at ${Math.round(execution.pullbackPct ?? 0)}%`
  )
  reasons.push(`Higher timeframes read ${alignment.toLowerCase()}`)
  if (execution.retestState) reasons.push(`Retest is ${execution.retestState.toLowerCase()}`)
  if (execution.premiumDiscount) {
    reasons.push(`Price sits in ${execution.premiumDiscount.toLowerCase()} of the dealing range`)
  }
  reasons.push(
    `Continuation ${Math.round(scores.continuation)}, reversal risk ${Math.round(scores.reversalRisk)}`
  )
  if (sideConstraint === 'SHORT') reasons.push('Playbook allows shorts only here')

  return result({
    call: {
      side,
      entry,
      stop,
      target,
      target2,
      target3,
      rewardToRisk,
      meetsMinimumRR: true,
      grade: gradeFor(scores.continuation, rewardToRisk),
      state: 'ready',
      setup: execution.inOte
        ? 'OTE'
        : (execution.lastEvent?.type ?? '').startsWith('CHoCH')
          ? 'CHoCH'
          : 'BOS',
      continuation: scores.continuation,
      reversalRisk: scores.reversalRisk,
      alignment,
      reasons,
    },
    standDown: null,
  })
}
