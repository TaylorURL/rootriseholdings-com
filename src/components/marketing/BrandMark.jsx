import { cn } from '../../lib/cn'
import { PRODUCT } from '../../lib/brand'

const MARK_SIZES = {
  sm: 'h-7 w-7 text-xs rounded-md',
  md: 'h-9 w-9 text-sm rounded-lg',
  lg: 'h-11 w-11 text-base rounded-lg',
}

/**
 * The Rise & Root brand lockup: a gradient "R" mark with optional wordmark.
 *
 * @param {object} props
 * @param {'sm'|'md'|'lg'} [props.size='md']
 * @param {boolean} [props.showWordmark=true]
 * @param {string} [props.className]
 */
export default function BrandMark({ size = 'md', showWordmark = true, className }) {
  return (
    <span className={cn('flex items-center gap-2.5', className)}>
      <span
        className={cn(
          'flex shrink-0 items-center justify-center bg-[var(--ds-accent-face)] font-mono font-bold text-on-accent shadow-[0_4px_20px_-6px_var(--ds-accent-glow)]',
          MARK_SIZES[size],
        )}
        aria-hidden="true"
      >
        R
      </span>
      {showWordmark && (
        <span className="text-[15px] font-semibold tracking-tight text-text">{PRODUCT.name}</span>
      )}
    </span>
  )
}
