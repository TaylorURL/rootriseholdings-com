/**
 * Every chart on both the marketing site and the terminal pulls from here, so a
 * change to axis, grid or gradient treatment lands everywhere at once.
 */

const AXIS_COLOR = 'var(--ds-text-faint)'
export const AXIS_TICK = { fill: AXIS_COLOR, fontSize: 11, fontFamily: 'var(--ds-font-sans)' }
export const GRID_STROKE = 'var(--ds-border)'
export const CURSOR_STROKE = 'var(--ds-border-strong)'

/** Standard draw-in animation timing for area/line/bar series. */
export const DRAW = { isAnimationActive: true, animationDuration: 900, animationEasing: 'ease-out' }
