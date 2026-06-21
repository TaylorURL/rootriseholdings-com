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
 * Format an instrument price with its instrument-specific decimal precision.
 * Falls back to {@link formatPrice} for legacy FX pair strings.
 *
 * @param {number} value
 * @param {string} symbol - e.g. 'XAUUSD', 'NAS100', 'USDJPY'
 * @param {number} [decimals] - override the default precision for the instrument
 */
export function formatInstrumentPrice(value, symbol, decimals) {
  if (decimals != null) return value.toFixed(decimals)
  if (symbol === 'XAUUSD') return value.toFixed(2)
  if (symbol === 'NAS100' || symbol === 'SP500') return value.toFixed(1)
  if (symbol === 'US30') return value.toFixed(1)
  if (symbol === 'USDJPY' || symbol === 'NZDJPY') return value.toFixed(3)
  if (symbol === 'NZDUSD') return value.toFixed(5)
  return formatPrice(value, symbol)
}

/**
 * Format a signed R-multiple to one decimal (e.g. +2.3R, -1.0R).
 * @param {number} value
 */
export function formatR(value) {
  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toFixed(1)}R`
}

/**
 * Format a generic instrument movement (price-points / pips). Decimal count
 * defaults to one for indices/commodities and one for pips.
 */
export function formatMove(value, decimals = 1) {
  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toFixed(decimals)}`
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
