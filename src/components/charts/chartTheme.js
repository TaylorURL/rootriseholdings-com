/**
 * Every chart on both the marketing site and the terminal pulls from here, so a
 * change to axis, grid or gradient treatment lands everywhere at once.
 *
 * The rules every chart keeps, so a reader learns them once:
 * - green is a gain and red is a loss, everywhere, and nothing else is drawn in
 *   either; the accent never stands for "up"
 * - the axes carry units, and the ticks are quiet but legible
 * - a zero or a starting line is ruled and labelled, never inferred
 * - a tooltip names every figure it shows
 */

const AXIS_COLOR = 'var(--ds-text-faint)'
export const AXIS_TICK = { fill: AXIS_COLOR, fontSize: 11, fontFamily: 'var(--ds-font-sans)' }
export const GRID_STROKE = 'var(--ds-border)'
export const GRID_DASH = '2 4'
export const CURSOR_STROKE = 'var(--ds-border-strong)'
export const ZERO_STROKE = 'var(--ds-border-strong)'
export const GAIN = 'var(--ds-positive)'
export const LOSS = 'var(--ds-danger)'

/** A label drawn on a reference line, in the chart's own quiet ink. */
export const REFERENCE_LABEL = {
  fill: 'var(--ds-text-muted)',
  fontSize: 11,
  fontWeight: 500,
  fontFamily: 'var(--ds-font-sans)',
}

/** Standard draw-in animation timing for area/line/bar series. */
export const DRAW = { isAnimationActive: true, animationDuration: 700, animationEasing: 'ease-out' }

const SHORT_DATE = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC',
})

/**
 * A CT day key (`2026-09-16`) as the axis prints it (`Sep 16`). Anything that
 * is not a day key is passed through, so a caller can hand over its own label.
 *
 * @param {string} key
 */
export function formatDayTick(key) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(key))
  if (!match) return String(key)
  return SHORT_DATE.format(Date.UTC(+match[1], +match[2] - 1, +match[3]))
}

/**
 * Dollars at axis precision: whole dollars under a thousand, one decimal of
 * thousands above it, and a sign only where the axis crosses zero.
 *
 * @param {number} value
 * @param {{signed?: boolean}} [options]
 */
export function formatUsdTick(value, { signed = false } = {}) {
  const sign = value < 0 ? '-' : signed && value > 0 ? '+' : ''
  const abs = Math.abs(value)
  const body = abs >= 1000 ? `${(abs / 1000).toFixed(abs >= 10000 ? 0 : 1)}k` : abs.toFixed(0)
  return `${sign}$${body}`
}

/**
 * Axis ticks on round numbers.
 *
 * An axis that reads $100k, $104k, $108k, $115k makes a reader do arithmetic
 * before they can compare two points, so the range is widened to the nearest
 * step of 1, 2, 2.5 or 5 at a power of ten and ticked evenly across it.
 *
 * @param {number} min
 * @param {number} max
 * @param {number} [count=5] - roughly how many ticks to draw
 * @returns {{domain: [number, number], ticks: number[]}}
 */
export function niceTicks(min, max, count = 5) {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return { domain: [0, 1], ticks: [0, 1] }
  if (min === max) {
    const pad = Math.abs(min) * 0.01 || 1
    min -= pad
    max += pad
  }
  const raw = (max - min) / Math.max(1, count - 1)
  const power = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * power).find((s) => s >= raw) ?? 10 * power
  const lo = Math.floor(min / step) * step
  const hi = Math.ceil(max / step) * step
  const ticks = []
  for (let value = lo; value <= hi + step / 2; value += step) ticks.push(+value.toFixed(6))
  return { domain: [lo, hi], ticks }
}
