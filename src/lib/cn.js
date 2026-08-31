import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * @param {...any} inputs - clsx-compatible class values
 * @returns {string} merged className string
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs))
}
