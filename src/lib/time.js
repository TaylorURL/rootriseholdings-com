import { sessionForCtMinutes } from '../data/riskRules.js'

/**
 * Central Time helpers. The desk runs on America/Chicago: trading days,
 * session windows, and briefing editions are all defined in CT, so every
 * date-bucketing decision funnels through here rather than the host timezone.
 */
export const DESK_TIME_ZONE = 'America/Chicago'

const CT_PARTS = new Intl.DateTimeFormat('en-US', {
  timeZone: DESK_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

/**
 * @param {Date | string | number} value
 * @returns {{year:number, month:number, day:number, hour:number, minute:number}}
 */
export function ctParts(value) {
  const date = value instanceof Date ? value : new Date(value)
  const parts = {}
  for (const part of CT_PARTS.formatToParts(date)) {
    if (part.type !== 'literal') parts[part.type] = Number(part.value)
  }
  // Intl reports midnight as hour 24 in some engines; normalize to 0.
  if (parts.hour === 24) parts.hour = 0
  return parts
}

/**
 * @param {Date | string | number} value
 * @returns {string} CT calendar date as YYYY-MM-DD — the desk's trading-day key
 */
export function ctDateKey(value) {
  const { year, month, day } = ctParts(value)
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

/**
 * @param {Date | string | number} value
 * @returns {number} minutes since CT midnight
 */
export function ctMinutesOfDay(value) {
  const { hour, minute } = ctParts(value)
  return hour * 60 + minute
}

/**
 * @param {Date | string | number} value
 * @returns {string | null} the desk session the moment falls in, or null
 */
export function sessionForMoment(value) {
  return sessionForCtMinutes(ctMinutesOfDay(value))
}

/**
 * Renders a moment in the desk's time zone.
 *
 * Intl rejects a format that mixes `dateStyle` or `timeStyle` with individual
 * field options, so a caller asking for either style gets it on its own rather
 * than layered over the default fields.
 *
 * @param {Date | string | number} value
 * @param {object} [options] - Intl.DateTimeFormat options merged over the default
 * @returns {string} the moment rendered in CT
 */
export function formatCt(value, options = {}) {
  const date = value instanceof Date ? value : new Date(value)
  const styled = options.dateStyle != null || options.timeStyle != null
  const fields = styled
    ? {}
    : { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }
  return new Intl.DateTimeFormat('en-US', {
    timeZone: DESK_TIME_ZONE,
    ...fields,
    ...options,
  }).format(date)
}
