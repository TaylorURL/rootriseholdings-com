import { cn } from '../../lib/cn'

const VARIANT_CLASSES = {
  buy: 'bg-[var(--ds-accent-soft)] text-accent-bright',
  sell: 'bg-[var(--ds-danger-soft)] text-danger',
  positive: 'bg-[var(--ds-positive-soft)] text-positive',
  danger: 'bg-[var(--ds-danger-soft)] text-danger',
  warning: 'bg-[var(--ds-warning-soft)] text-warning',
  neutral: 'bg-surface-2 text-text-muted',
  accent: 'bg-[var(--ds-accent-soft)] text-accent-bright',
}

/** Map a known status/side string to a badge variant. */
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
 * Small colored status/side badge.
 *
 * @param {object} props
 * @param {React.ReactNode} props.children - label text
 * @param {keyof typeof VARIANT_CLASSES} [props.variant] - explicit variant; inferred from text when omitted
 * @param {boolean} [props.dot=false] - show a leading status dot
 * @param {string} [props.className]
 */
export default function Badge({ children, variant, dot = false, className }) {
  const resolved = resolveVariant(variant, children)

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold uppercase tracking-wide',
        VARIANT_CLASSES[resolved],
        className,
      )}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />}
      {children}
    </span>
  )
}
