import { cn } from '../../lib/cn'

/**
 * Technical eyebrow label: a small uppercase mono caption preceded by a purple
 * status dot. The recurring "section index" motif of the marketing site.
 *
 * @param {object} props
 * @param {React.ReactNode} props.children
 * @param {string} [props.className]
 */
export default function Eyebrow({ children, className }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 font-mono text-xs font-medium uppercase tracking-[0.2em] text-text-muted',
        className,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-accent-bright shadow-[0_0_8px_var(--ds-accent-glow)]" aria-hidden="true" />
      {children}
    </span>
  )
}
