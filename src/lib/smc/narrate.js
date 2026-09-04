import { describeSideConstraint } from '../../data/instruments.js'
import { OTE_ZONE } from './structure.js'

/**
 * Renders a structure read as briefing prose. Every sentence is a restatement
 * of a computed value — nothing here invents levels, catalysts, or forecasts,
 * so the text can never disagree with the numbers beside it.
 */

/** @param {number} value @param {number} decimals */
function px(value, decimals) {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

/**
 * @param {object} args
 * @param {string} args.label - instrument display name
 * @param {object} args.execution - structure read on the execution timeframe
 * @param {string} args.executionTimeframe
 * @param {object | null} args.htf - structure read on the bias timeframe
 * @param {string | null} args.htfTimeframe
 * @param {number} args.decimals - price precision for the instrument
 * @param {'LONG' | 'SHORT' | null} [args.sideConstraint]
 * @returns {{body:string, bullets:string[], tone:string}}
 */
export function narrateInstrument({
  label,
  execution,
  executionTimeframe,
  htf,
  htfTimeframe,
  decimals,
  sideConstraint,
}) {
  const sentences = []
  const bullets = []

  const htfBias = htf?.bias ?? 'Neutral'
  if (htf && htfTimeframe) {
    sentences.push(
      htfBias === 'Neutral'
        ? `${htfTimeframe} structure is neutral: no stacked highs and lows in either direction.`
        : `${htfTimeframe} bias is ${htfBias.toLowerCase()} from the swing sequence.`
    )
    bullets.push(`${htfTimeframe} bias: ${htfBias}`)
  }

  if (execution.lastEvent) {
    sentences.push(
      `Last ${executionTimeframe} structure event: ${execution.lastEvent.type} at ${px(execution.lastEvent.level, decimals)}.`
    )
    bullets.push(
      `${executionTimeframe}: ${execution.lastEvent.type} at ${px(execution.lastEvent.level, decimals)}`
    )
  } else {
    sentences.push(`No confirmed ${executionTimeframe} structure break in the loaded window.`)
  }

  if (execution.retracementPct != null && execution.trend !== 'none') {
    const trendWord = execution.trend === 'up' ? 'rally' : 'sell-off'
    if (execution.legInvalidated) {
      sentences.push(
        `Price has retraced past 100% of the last ${trendWord} leg, which invalidates the leg.`
      )
    } else if (execution.retracementPct < 0) {
      sentences.push(
        `Price is extending beyond the last ${trendWord} extreme rather than pulling back.`
      )
    } else {
      sentences.push(
        `Price has retraced ${Math.round(execution.retracementPct)}% of the last ${trendWord} leg.`
      )
    }
  }

  if (execution.oteZone && !execution.legInvalidated) {
    const zoneText = `${px(Math.min(execution.oteZone.from, execution.oteZone.to), decimals)} to ${px(Math.max(execution.oteZone.from, execution.oteZone.to), decimals)}`
    const zoneSide = execution.trend === 'up' ? 'long' : 'short'
    sentences.push(
      execution.inOte
        ? `Price is inside the ${zoneSide} OTE band (${Math.round(OTE_ZONE.from * 100)}–${Math.round(OTE_ZONE.to * 100)}%) at ${zoneText}.`
        : `The ${zoneSide} OTE band (${Math.round(OTE_ZONE.from * 100)}–${Math.round(OTE_ZONE.to * 100)}%) sits at ${zoneText}.`
    )
    bullets.push(`OTE ${zoneSide} zone: ${zoneText}`)
  }

  if (execution.premiumDiscount && execution.dealingRange) {
    sentences.push(
      `Within the dealing range (${px(execution.dealingRange.low, decimals)} to ${px(execution.dealingRange.high, decimals)}) price sits in ${execution.premiumDiscount.toLowerCase()} at ${Math.round(execution.dealingRange.positionPct)}%.`
    )
  }

  const aligned =
    htfBias !== 'Neutral' &&
    ((htfBias === 'Bullish' && execution.trend === 'up') ||
      (htfBias === 'Bearish' && execution.trend === 'down'))
  if (htf && htfTimeframe) {
    bullets.push(aligned ? 'Timeframes aligned' : 'Timeframes not aligned')
  }
  const restriction = describeSideConstraint(sideConstraint)
  if (restriction) {
    bullets.push(`Playbook: ${restriction.toLowerCase()}`)
  }

  const tone =
    execution.trend === 'up' && htfBias !== 'Bearish'
      ? 'bullish'
      : execution.trend === 'down' && htfBias !== 'Bullish'
        ? 'bearish'
        : 'mixed'

  return { body: sentences.join(' '), bullets, tone, label }
}
