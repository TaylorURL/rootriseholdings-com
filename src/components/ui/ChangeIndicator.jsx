import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { cn } from '../../lib/cn'
import { formatPercent, signedColor } from '../../lib/format'

/**
 * Directional change indicator: colored arrow icon plus a signed percentage.
 *
 * @param {object} props
 * @param {number} props.value - percentage change (e.g. 0.31 for +0.31%)
 * @param {'sm'|'md'} [props.size='md']
 * @param {boolean} [props.showIcon=true]
 * @param {string} [props.className]
 */
export default function ChangeIndicator({ value, size = 'md', showIcon = true, className }) {
  const Icon = value > 0 ? TrendingUp : value < 0 ? TrendingDown : Minus
  const isCompact = size === 'sm'

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 font-mono tabular-nums font-medium',
        isCompact ? 'text-xs' : 'text-sm',
        signedColor(value),
        className,
      )}
    >
      {showIcon && <Icon className={isCompact ? 'h-3 w-3' : 'h-3.5 w-3.5'} aria-hidden="true" />}
      {formatPercent(value)}
    </span>
  )
}
