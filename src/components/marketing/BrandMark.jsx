import { cn } from '../../lib/cn'
import { PRODUCT } from '../../lib/brand'

const SIZES = {
  sm: { box: 'h-7 w-7 rounded-sm', word: 'text-[14px]' },
  md: { box: 'h-8 w-8 rounded-control', word: 'text-[15px]' },
  lg: { box: 'h-10 w-10 rounded-control', word: 'text-[17px]' },
}

/**
 * The mark is the thing the desk reads: a rising sequence of higher lows with
 * the break above the last high marked. Drawn rather than lettered, so it holds
 * at a favicon's size where an ampersand closes up.
 */
function Glyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-[62%] w-[62%]">
      <path
        d="M3 19.5 8 14l3.5 3.5L21 8"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M15 7.4h6v6"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/**
 * The lockup: the mark, and the wordmark beside it where there is room for one.
 * The tile carries the accent fill and the glyph is knocked out of it, so the
 * pair reads the same on every ground the site has.
 */
export default function BrandMark({ size = 'md', showWordmark = true, className }) {
  const step = SIZES[size] ?? SIZES.md

  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <span
        className={cn(
          'accent-face flex shrink-0 items-center justify-center text-on-accent',
          step.box
        )}
      >
        <Glyph />
      </span>
      {showWordmark ? (
        <span className={cn('font-semibold tracking-tight text-text', step.word)}>
          {PRODUCT.name}
        </span>
      ) : null}
    </span>
  )
}
