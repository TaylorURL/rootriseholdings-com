import { decimalsForInstrument, INSTRUMENT_META } from '../data/instruments.js'

/**
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
 * @param {number} value
 * @returns {string} Tailwind text color class
 */
export function signedColor(value) {
  if (value > 0) return 'text-positive'
  if (value < 0) return 'text-danger'
  return 'text-text-muted'
}

/** FX-pair precision for a symbol the instrument registry does not know. */
function pairDecimals(pair) {
  if (pair.includes('JPY')) return 3
  return 5
}

/** What a surface shows in place of a price the feed did not serve. */
export const NO_VALUE = '–'

/**
 * A price at the precision its instrument trades in.
 *
 * The precision comes off the registry's tick size, so an instrument added
 * there prints at its own precision without a second list to keep in step. A
 * symbol the registry does not carry falls back to the FX convention.
 *
 * An instrument the feed does not price reads as unavailable rather than as a
 * number, because a stand-in figure on a trading surface is worse than a blank.
 *
 * @param {number|null|undefined} value
 * @param {string} symbol - e.g. 'XAUUSD', 'NAS100', 'USDJPY'
 * @param {number} [decimals] - override the default precision for the instrument
 */
export function formatInstrumentPrice(value, symbol, decimals) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return NO_VALUE
  if (decimals != null) return value.toFixed(decimals)
  if (INSTRUMENT_META[symbol]) return value.toFixed(decimalsForInstrument(symbol))
  return value.toFixed(pairDecimals(symbol))
}

/**
 * @param {number} value
 */
export function formatR(value) {
  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toFixed(1)}R`
}
