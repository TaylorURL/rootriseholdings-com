import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Merge conditional class names and resolve Tailwind conflicts.
 * @param {...any} inputs - clsx-compatible class values
 * @returns {string} merged className string
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs))
}
