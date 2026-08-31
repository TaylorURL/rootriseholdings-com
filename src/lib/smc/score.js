/**
 * What the structure read is worth, as two opposing numbers.
 *
 * A structure read says where price is. It does not say whether the read is
 * one to act on, and most of them are not: a break can be real and still sit
 * against the higher timeframe, on a weak candle, after a pullback that went
 * too far. The continuation score adds up what argues for the trend holding
 * and the reversal risk adds up what argues against it, so a setup can be
 * refused for the sum of several small faults rather than only for one
 * disqualifying one.
 *
 * Both are matched to Structure V6's own scoring, which is the reference the
 * desk's chart annotations come from.
 */

/** The floor a call must clear on the continuation score. */
export const MIN_CONTINUATION_SCORE = 70

/** The ceiling a call must stay under on reversal risk. */
export const MAX_REVERSAL_RISK = 30

/**
 * How the execution timeframe's bias sits against the two above it.
 *
 * Three timeframes agreeing is the only reading that carries no counter-trend
 * argument at all; two agreeing with none against is the weakest one a call is
 * still allowed on.
 *
 * @param {string[]} biases - execution bias first, then the higher timeframes
 * @returns {'Full Bull'|'Full Bear'|'Partial Bull'|'Partial Bear'|'Mixed'}
 */
export function alignmentOf(biases) {
  const present = biases.filter(Boolean)
  const bulls = present.filter((bias) => bias === 'Bullish').length
  const bears = present.filter((bias) => bias === 'Bearish').length
  if (bulls === 3) return 'Full Bull'
  if (bears === 3) return 'Full Bear'
  if (bulls === 2 && bears === 0) return 'Partial Bull'
  if (bears === 2 && bulls === 0) return 'Partial Bear'
  return 'Mixed'
}

/**
 * @param {object} read - an analyzeStructure result
 * @param {string} alignment - from alignmentOf()
 * @returns {{continuation: number, reversalRisk: number}} both 0-100
 */
export function scoreStructure(read, alignment) {
  const { bias, trend, displayState, lastStrength, pullbackState, retestState, premiumDiscount } =
    read

  let continuation = 0
  let reversalRisk = 0

  const agrees = (bias === 'Bullish' && trend === 'up') || (bias === 'Bearish' && trend === 'down')
  const opposes = (bias === 'Bullish' && trend === 'down') || (bias === 'Bearish' && trend === 'up')
  if (agrees) continuation += 25
  else if (bias === 'Neutral') continuation += 10
  if (opposes) reversalRisk += 20
  else if (bias === 'Neutral') reversalRisk += 10

  const state = displayState ?? ''
  if (state.includes('BOS')) continuation += 15
  else if (state.includes('CHoCH')) continuation += 8
  if (state === 'Range') reversalRisk += 20
  else if (state.includes('CHoCH')) reversalRisk += 15

  if (lastStrength === 'Strong') continuation += 25
  else if (lastStrength === 'Moderate') continuation += 15
  else if (lastStrength === 'Weak') continuation += 5
  if (lastStrength === 'Failed') reversalRisk += 25
  else if (lastStrength === 'Weak') reversalRisk += 15
  else if (lastStrength === 'Moderate') reversalRisk += 5

  if (pullbackState === 'Healthy') continuation += 20
  else if (pullbackState === 'Shallow') continuation += 15
  else if (pullbackState === 'None') continuation += 10
  else if (pullbackState === 'Deep') continuation += 8
  if (pullbackState === 'Invalidated') reversalRisk += 20
  else if (pullbackState === 'Deep') reversalRisk += 15
  else if (pullbackState === 'Healthy') reversalRisk += 5

  if (retestState === 'Retested') continuation += 15
  else if (retestState === 'No Return') continuation += 10
  else if (retestState === 'Pending') continuation += 7
  if (retestState === 'Failed Retest') reversalRisk += 15
  else if (retestState === 'No Return') reversalRisk += 5
  else if (retestState === 'Pending') reversalRisk += 3

  if (trend === 'up') {
    if (alignment === 'Full Bull') continuation += 5
    else if (alignment === 'Full Bear') reversalRisk += 10
    else if (alignment === 'Partial Bear') reversalRisk += 5
  } else if (trend === 'down') {
    if (alignment === 'Full Bear') continuation += 5
    else if (alignment === 'Full Bull') reversalRisk += 10
    else if (alignment === 'Partial Bull') reversalRisk += 5
  }

  if (trend === 'up') {
    if (premiumDiscount === 'Discount') continuation += 5
    else if (premiumDiscount === 'Premium') reversalRisk += 5
  } else if (trend === 'down') {
    if (premiumDiscount === 'Premium') continuation += 5
    else if (premiumDiscount === 'Discount') reversalRisk += 5
  }

  return {
    continuation: Math.min(continuation, 100),
    reversalRisk: Math.min(reversalRisk, 100),
  }
}
