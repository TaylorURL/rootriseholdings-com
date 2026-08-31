/**
 * Every chart on both the marketing site and the terminal pulls from here, so a
 * change to axis, grid or gradient treatment lands everywhere at once.
 */

export const AXIS_COLOR = 'var(--ds-text-faint)'
export const AXIS_TICK = { fill: AXIS_COLOR, fontSize: 11, fontFamily: 'var(--ds-font-mono)' }
export const GRID_STROKE = 'var(--ds-border)'
export const CURSOR_STROKE = 'var(--ds-border-strong)'

export const TREND_COLOR = {
  positive: 'var(--ds-positive)',
  negative: 'var(--ds-danger)',
  neutral: 'var(--ds-accent-bright)',
  accent: 'var(--ds-accent-bright)',
}

export function resolveTrend(trend, data, key = 'value') {
  if (trend) return trend
  if (!data || data.length < 2) return 'neutral'
  const delta = data[data.length - 1][key] - data[0][key]
  if (delta > 0) return 'positive'
  if (delta < 0) return 'negative'
  return 'neutral'
}

/** Standard draw-in animation timing for area/line/bar series. */
export const DRAW = { isAnimationActive: true, animationDuration: 900, animationEasing: 'ease-out' }

export const AREA_STOPS = [
  { offset: '0%', opacity: 0.3 },
  { offset: '55%', opacity: 0.08 },
  { offset: '100%', opacity: 0 },
]
