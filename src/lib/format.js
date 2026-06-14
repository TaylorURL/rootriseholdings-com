/**
 * Format a monetary value with thousands separators and fixed decimals.
 * @param {number} value
 * @param {object} [options]
 * @param {string} [options.prefix='$'] - currency symbol
 * @param {number} [options.decimals=2]
 * @param {boolean} [options.signed=false] - always show +/- sign
 */
export function formatCurrency(value, { prefix = '$', decimals = 2, signed = false } = {}) {
  const sign = signed && value > 0 ? '+' : value < 0 ? '-' : ''
  const formatted = Math.abs(value).toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
  return `${sign}${prefix}${formatted}`
}

/**
 * Format a percentage value with an explicit sign.
 * @param {number} value
 * @param {number} [decimals=2]
 */
export function formatPercent(value, decimals = 2) {
  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toFixed(decimals)}%`
}

/**
 * Format a signed pips value.
 * @param {number} value
 */
export function formatPips(value) {
  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toFixed(1)}`
}

/**
 * Choose a semantic text color class based on the sign of a value.
 * @param {number} value
 * @returns {string} Tailwind text color class
 */
export function signedColor(value) {
  if (value > 0) return 'text-positive'
  if (value < 0) return 'text-danger'
  return 'text-text-muted'
}

/**
 * Decimal precision for an FX price, by quote convention.
 * JPY-quoted pairs use 3 decimals; high-value exotics use 4; the rest use 5.
 * @param {string} pair
 */
export function pairDecimals(pair) {
  if (pair.includes('JPY')) return 3
  if (/TRY|MXN|ZAR/.test(pair)) return 4
  return 5
}

/**
 * Format an FX price using the correct precision for its pair.
 * @param {number} value
 * @param {string} pair
 */
export function formatPrice(value, pair) {
  return value.toFixed(pairDecimals(pair))
}

/**
 * Compute the elapsed duration between two "YYYY-MM-DD HH:mm" timestamps.
 * @param {string} startTime
 * @param {string} endTime
 * @returns {string} compact duration like "4h 23m"
 */
export function durationBetween(startTime, endTime) {
  const start = new Date(startTime.replace(' ', 'T'))
  const end = new Date(endTime.replace(' ', 'T'))
  const totalMinutes = Math.max(0, Math.round((end - start) / 60000))
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`
}
