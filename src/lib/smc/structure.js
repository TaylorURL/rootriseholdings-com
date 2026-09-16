/**
 * Market-structure engine, ported from the desk's TradingView indicator
 * (Structure V6) so the chart annotations, the briefing's written read, and
 * the published calls all describe the same swings.
 *
 * What it reads: ATR-thresholded zigzag swings on a per-instrument threshold,
 * break events confirmed on close, the strength of the candle that made each
 * break, whether the broken level was retested or reclaimed, how far the
 * pullback went, per-leg fib retracement with the 62-79% OTE band, and
 * premium/discount against the last confirmed dealing range.
 *
 * Everything past the swing model exists to be refused on. A break is not a
 * setup: score.js weighs the read and signal.js turns the few that survive
 * into a ticket.
 *
 * Pure function of candle history — no fetching, no globals — so it runs the
 * same under tests, in the browser, and against any provider's candles.
 *
 * @typedef {object} Candle
 * @property {number} open
 * @property {number} high
 * @property {number} low
 * @property {number} close
 * @property {number | string} [time]
 */

/** Wilder-smoothed average true range, matching Pine's ta.atr. */
export function atrSeries(candles, length) {
  const values = new Array(candles.length).fill(null)
  let previousClose = null
  let atr = null
  let warmupSum = 0
  for (let i = 0; i < candles.length; i++) {
    const candle = candles[i]
    const trueRange =
      previousClose == null
        ? candle.high - candle.low
        : Math.max(
            candle.high - candle.low,
            Math.abs(candle.high - previousClose),
            Math.abs(candle.low - previousClose)
          )
    if (i < length) {
      warmupSum += trueRange
      atr = warmupSum / (i + 1)
    } else {
      atr = (atr * (length - 1) + trueRange) / length
    }
    values[i] = atr
    previousClose = candle.close
  }
  return values
}

export const OTE_ZONE = { from: 0.62, to: 0.79 }

/** Bars without a structure event after which the read is a range, not a trend. */
export const RANGE_BARS = 20

/** Bars a fresh break is watched over before it can still be called failed. */
const FAILED_LOOKBACK = 3

/**
 * How decisively a level was broken.
 *
 * A break is only worth acting on when the bar that made it committed to it:
 * a body filling most of its own range, and a close far enough past the level
 * in ATRs that the next bar's noise cannot undo it. The two thresholds are per
 * instrument, since the same body ratio means different things on gold and on
 * a major.
 */
function classifyBreakout({ candle, atr, brokenLevel, isUp, preset }) {
  const range = candle.high - candle.low
  const body = Math.abs(candle.close - candle.open)
  const bodyRatio = range > 0 ? body / range : 0
  const advance = isUp ? candle.close - brokenLevel : brokenLevel - candle.close
  const advanceRatio = atr > 0 ? advance / atr : 0
  if (bodyRatio >= preset.strongBody && advanceRatio >= preset.strongAdvance) return 'Strong'
  if (bodyRatio >= preset.moderateBody && advanceRatio >= preset.moderateAdvance) return 'Moderate'
  return 'Weak'
}

/**
 * @param {Candle[]} candles - oldest first
 * @param {object} [options]
 * @param {number} [options.atrLength=14]
 * @param {object} [options.preset] - from presetFor(); decides the swing threshold and the strength cuts
 * @param {number} [options.atrMult] - overrides the preset's swing threshold
 * @returns {object} the structure read after the final candle
 */
export function analyzeStructure(candles, { atrLength = 14, preset, atrMult } = {}) {
  const tuning = preset ?? {
    name: 'Custom',
    atrMult: 1.0,
    strongBody: 0.6,
    strongAdvance: 0.3,
    moderateBody: 0.4,
    moderateAdvance: 0.15,
  }
  const swingMult = atrMult ?? tuning.atrMult
  const atr = atrSeries(candles, atrLength)

  let dir = 0
  let curHigh = null
  let curLow = null

  let h0 = null
  let h1 = null
  let l0 = null
  let l1 = null
  let lastSwingHigh = null
  let lastSwingLow = null

  let pendingHigh = null
  let pendingLow = null
  let highFired = false
  let lowFired = false

  let trend = 'none'
  let bosInTrend = 0
  let trendOrigin = null
  let trendExtreme = null
  let lastEvent = null
  let lastEventBar = null
  let lastStrength = null
  let previousClose = null

  let retestLevel = null
  let retestIsUp = false
  let retestEventBar = null
  let retestState = null
  let retestTouched = false

  let watchLevel = null
  let watchIsUp = false
  let watchBar = null

  const events = []

  const recordEvent = (type, level, index, strength) => {
    lastEvent = { type, level, index, strength }
    lastEventBar = index
    lastStrength = strength
    events.push(lastEvent)
  }

  for (let i = 0; i < candles.length; i++) {
    const candle = candles[i]
    const barAtr = atr[i] ?? 0
    const threshold = barAtr * swingMult

    if (dir === 0) {
      dir = 1
      curHigh = candle.high
      curLow = candle.low
    }

    let newSwingHigh = null
    let newSwingLow = null
    if (dir === 1) {
      if (candle.high > curHigh) curHigh = candle.high
      if (curHigh - candle.low >= threshold && threshold > 0) {
        newSwingHigh = curHigh
        dir = -1
        curLow = candle.low
      }
    } else {
      if (candle.low < curLow) curLow = candle.low
      if (candle.high - curLow >= threshold && threshold > 0) {
        newSwingLow = curLow
        dir = 1
        curHigh = candle.high
      }
    }

    if (newSwingHigh != null) {
      h1 = h0
      h0 = newSwingHigh
      lastSwingHigh = newSwingHigh
      pendingHigh = newSwingHigh
      highFired = false
    }
    if (newSwingLow != null) {
      l1 = l0
      l0 = newSwingLow
      lastSwingLow = newSwingLow
      pendingLow = newSwingLow
      lowFired = false
    }

    const brokeUp =
      pendingHigh != null &&
      !highFired &&
      candle.close > pendingHigh &&
      (previousClose == null || previousClose <= pendingHigh)
    const brokeDown =
      pendingLow != null &&
      !lowFired &&
      candle.close < pendingLow &&
      (previousClose == null || previousClose >= pendingLow)

    let trendStarted = false
    let brokenAt = null
    let brokeIsUp = false

    // A break against the standing trend is a CHoCH, whatever the trend has
    // done up to here. It used to have to get past `bosInTrend >= 1` as well,
    // so a trend that started on a CHoCH and never printed a BOS could not be
    // reversed at all: the break set its fired flag on the way in, matched
    // neither arm, and was consumed without recording anything. The trend then
    // stood in the wrong direction for as long as the series ran - GBPUSD held
    // `up` through three separate downside breaks and a retracement of 230% of
    // its own leg - and every read taken off it was of a leg that was already
    // dead. A stuck trend is not a conservative reading of the tape; it is a
    // reading of a tape that stopped some bars ago. Whether a break is worth
    // acting on is decided downstream, by its strength, its retest and the
    // scores, which is where a whipsaw is supposed to be refused.
    if (brokeUp) {
      highFired = true
      const strength = classifyBreakout({
        candle,
        atr: barAtr,
        brokenLevel: pendingHigh,
        isUp: true,
        preset: tuning,
      })
      if (trend === 'up') {
        bosInTrend += 1
        recordEvent('BOS Up', pendingHigh, i, strength)
        brokenAt = pendingHigh
        brokeIsUp = true
        if (lastSwingLow != null) trendOrigin = lastSwingLow
      } else {
        recordEvent('CHoCH Up', pendingHigh, i, strength)
        brokenAt = pendingHigh
        brokeIsUp = true
        trend = 'up'
        bosInTrend = 0
        trendStarted = true
      }
    }

    if (brokeDown) {
      lowFired = true
      const strength = classifyBreakout({
        candle,
        atr: barAtr,
        brokenLevel: pendingLow,
        isUp: false,
        preset: tuning,
      })
      if (trend === 'down') {
        bosInTrend += 1
        recordEvent('BOS Down', pendingLow, i, strength)
        brokenAt = pendingLow
        brokeIsUp = false
        if (lastSwingHigh != null) trendOrigin = lastSwingHigh
      } else {
        recordEvent('CHoCH Down', pendingLow, i, strength)
        brokenAt = pendingLow
        brokeIsUp = false
        trend = 'down'
        bosInTrend = 0
        trendStarted = true
      }
    }

    if (trendStarted) {
      if (trend === 'up') {
        trendOrigin = lastSwingLow ?? candle.low
        trendExtreme = candle.high
      } else {
        trendOrigin = lastSwingHigh ?? candle.high
        trendExtreme = candle.low
      }
    }

    if (trend === 'up' && trendExtreme != null && candle.high > trendExtreme)
      trendExtreme = candle.high
    if (trend === 'down' && trendExtreme != null && candle.low < trendExtreme)
      trendExtreme = candle.low

    // A break is only trusted once price has come back to the level it broke
    // and held the far side of it. Coming back and closing through again is a
    // failed retest, which is the strongest tell that the break was liquidity
    // rather than intent.
    if (brokenAt != null) {
      retestLevel = brokenAt
      retestIsUp = brokeIsUp
      retestEventBar = i
      retestState = 'Pending'
      retestTouched = false
    } else if (
      retestEventBar != null &&
      i > retestEventBar &&
      retestState !== 'Retested' &&
      retestState !== 'Failed Retest' &&
      retestState !== 'No Return'
    ) {
      const barsSince = i - retestEventBar
      const tolerance = barAtr * 0.1
      const touching = retestIsUp
        ? candle.low <= retestLevel + tolerance
        : candle.high >= retestLevel - tolerance
      const perforated = retestIsUp ? candle.close < retestLevel : candle.close > retestLevel
      const distanceAtr =
        barAtr > 0
          ? retestIsUp
            ? (candle.close - retestLevel) / barAtr
            : (retestLevel - candle.close) / barAtr
          : 0

      if (touching && !retestTouched) retestTouched = true

      if (retestTouched && perforated) {
        retestState = 'Failed Retest'
      } else if (retestTouched && !perforated && barsSince >= 1) {
        const held = retestIsUp ? candle.close > retestLevel : candle.close < retestLevel
        if (held) retestState = 'Retested'
      } else if (!retestTouched && distanceAtr >= 2.0) {
        retestState = 'No Return'
      } else if (barsSince >= 10 && !retestTouched) {
        retestState = 'No Return'
      } else if (barsSince >= 10 && retestTouched && retestState === 'Pending') {
        retestState = 'Retested'
      }
    }

    // A break that closes back through its own level within a few bars was not
    // a break. The strength it was filed under is withdrawn rather than kept.
    if (watchBar != null && i > watchBar && i - watchBar <= FAILED_LOOKBACK) {
      const reclaimed = watchIsUp ? candle.close < watchLevel : candle.close > watchLevel
      if (reclaimed) {
        lastStrength = 'Failed'
        watchBar = null
      }
    }
    if (watchBar != null && i - watchBar > FAILED_LOOKBACK) watchBar = null
    if (brokenAt != null) {
      watchLevel = brokenAt
      watchIsUp = brokeIsUp
      watchBar = i
    }

    previousClose = candle.close
  }

  const lastIndex = candles.length - 1
  const lastCandle = lastIndex >= 0 ? candles[lastIndex] : null
  const lastClose = lastCandle?.close ?? null
  const lastAtr = lastIndex >= 0 ? (atr[lastIndex] ?? null) : null

  let bias = 'Neutral'
  if (h0 != null && h1 != null && l0 != null && l1 != null) {
    if (h0 > h1 && l0 > l1) bias = 'Bullish'
    else if (h0 < h1 && l0 < l1) bias = 'Bearish'
  }

  let retracementPct = null
  let oteZone = null
  let legInvalidated = false
  if (trend !== 'none' && trendOrigin != null && trendExtreme != null) {
    const legSize = Math.abs(trendExtreme - trendOrigin)
    if (legSize > 0 && lastClose != null) {
      const pulled = trend === 'up' ? trendExtreme - lastClose : lastClose - trendExtreme
      retracementPct = (pulled / legSize) * 100
      legInvalidated = retracementPct > 100
      oteZone =
        trend === 'up'
          ? {
              from: trendExtreme - legSize * OTE_ZONE.to,
              to: trendExtreme - legSize * OTE_ZONE.from,
            }
          : {
              from: trendExtreme + legSize * OTE_ZONE.from,
              to: trendExtreme + legSize * OTE_ZONE.to,
            }
    }
  }

  // The pullback is measured against the bar's own extreme rather than its
  // close: what matters is how far price actually came back, not where it
  // happened to settle.
  let pullbackState = null
  let pullbackPct = null
  if (trend !== 'none' && trendOrigin != null && trendExtreme != null && lastCandle) {
    const impulse = Math.abs(trendExtreme - trendOrigin)
    if (impulse > 0) {
      const retraced = Math.max(
        trend === 'up' ? trendExtreme - lastCandle.low : lastCandle.high - trendExtreme,
        0
      )
      pullbackPct = Math.min((retraced / impulse) * 100, 100)
      if (pullbackPct < 5) pullbackState = 'None'
      else if (pullbackPct <= 38.2) pullbackState = 'Shallow'
      else if (pullbackPct <= 61.8) pullbackState = 'Healthy'
      else if (pullbackPct <= 78.6) pullbackState = 'Deep'
      else pullbackState = 'Invalidated'
    }
  }

  let premiumDiscount = null
  let dealingRange = null
  if (
    lastSwingHigh != null &&
    lastSwingLow != null &&
    lastSwingHigh > lastSwingLow &&
    lastClose != null
  ) {
    const positionPct = ((lastClose - lastSwingLow) / (lastSwingHigh - lastSwingLow)) * 100
    dealingRange = { high: lastSwingHigh, low: lastSwingLow, positionPct }
    premiumDiscount = positionPct >= 60 ? 'Premium' : positionPct <= 40 ? 'Discount' : 'Equilibrium'
  }

  const barsSinceEvent = lastEventBar == null ? null : lastIndex - lastEventBar
  const displayState =
    lastEventBar == null ? 'Init' : barsSinceEvent >= RANGE_BARS ? 'Range' : lastEvent.type

  const inOte =
    retracementPct != null &&
    retracementPct >= OTE_ZONE.from * 100 &&
    retracementPct <= OTE_ZONE.to * 100

  return {
    candles: candles.length,
    lastClose,
    atr: lastAtr,
    preset: tuning.name,
    trend,
    bias,
    bosInTrend,
    lastEvent,
    lastStrength,
    displayState,
    barsSinceEvent,
    retestState,
    pullbackState,
    pullbackPct,
    events,
    swings: { lastHigh: lastSwingHigh, lastLow: lastSwingLow },
    leg: trend !== 'none' ? { origin: trendOrigin, extreme: trendExtreme } : null,
    retracementPct,
    inOte,
    legInvalidated,
    oteZone,
    dealingRange,
    premiumDiscount,
  }
}
