import { ArrowDownRight, ArrowUpRight } from 'lucide-react'
import { cn } from '../../lib/cn'

const VARIANT_CLASSES = {
  buy: 'bg-[var(--ds-positive-soft)] text-positive',
  sell: 'bg-[var(--ds-danger-soft)] text-danger',
  positive: 'bg-[var(--ds-positive-soft)] text-positive',
  danger: 'bg-[var(--ds-danger-soft)] text-danger',
  warning: 'bg-[var(--ds-warning-soft)] text-warning',
  neutral: 'bg-[var(--ds-neutral-soft)] text-text-muted',
  accent: 'bg-[var(--ds-accent-soft)] text-accent',
}

function resolveVariant(variant, children) {
  if (variant) return variant
  const label = String(children).toLowerCase()
  if (label === 'buy' || label === 'long' || label === 'open') return 'buy'
  if (label === 'sell' || label === 'short') return 'sell'
  if (label === 'closed') return 'neutral'
  if (label === 'pending') return 'warning'
  return 'neutral'
}

/**
 * @param {object} props
 * @param {React.ReactNode} props.children - label text
 * @param {keyof typeof VARIANT_CLASSES} [props.variant] - explicit variant; inferred from text when omitted
 * @param {boolean} [props.dot=false] - show a leading status dot
 * @param {string} [props.title] - what an abbreviated label stands for, on hover
 * @param {string} [props.className]
 */
export default function Badge({ children, variant, dot = false, title, className }) {
  const resolved = resolveVariant(variant, children)

  return (
    <span
      title={title}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-sm px-1.5 py-0.5 text-[11px] font-semibold leading-4',
        VARIANT_CLASSES[resolved],
        className
      )}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />}
      {children}
    </span>
  )
}

/**
 * Which way a trade points.
 *
 * Green against red is the only thing separating a long from a short wherever
 * a side is drawn as a bare word, and that pair is the one a red-green
 * deficiency loses first - on a phone, in daylight, which is where this is
 * read. The arrow carries the same fact in shape, so the direction survives
 * without colour.
 *
 * @param {object} props
 * @param {'BUY'|'SELL'} props.side
 */
export function SideBadge({ side }) {
  const isBuy = side === 'BUY'
  const Arrow = isBuy ? ArrowUpRight : ArrowDownRight

  return (
    <Badge variant={isBuy ? 'buy' : 'sell'} className="gap-1">
      <Arrow className="h-3 w-3" aria-hidden="true" />
      {side}
    </Badge>
  )
}
