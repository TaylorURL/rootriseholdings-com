import { cn } from '../../lib/cn'

/**
 * A run of labelled figures, ruled rather than boxed.
 *
 * The count comes from the space, not from a breakpoint: a viewport query knows
 * how wide the window is and nothing about the column the figures landed in, so
 * four tiles forced into a three-hundred-pixel rail overlap each other while the
 * page around them reads as roomy. auto-fit against a minimum width asks the
 * column instead, and the row reflows wherever it is put.
 *
 * Boxing each figure would draw a grid of small cards; one hairline between
 * them says the same thing and leaves the numbers as the loudest part.
 */
export function FigureRow({ children, min = '6.5rem', className }) {
  return (
    <dl
      className={cn('grid gap-px overflow-hidden rounded-card bg-border', className)}
      style={{ gridTemplateColumns: `repeat(auto-fit, minmax(${min}, 1fr))` }}
    >
      {children}
    </dl>
  )
}

/**
 * One figure. The label is set small and quiet above a mono, tabular value, so
 * a column of them lines up on the decimal and does not jitter as it updates.
 */
export function Figure({ label, value, tone, note, className }) {
  return (
    <div className={cn('bg-surface px-3 py-2.5', className)}>
      <dt className="truncate font-mono text-[10px] uppercase tracking-label text-text-faint">
        {label}
      </dt>
      <dd
        className={cn(
          'mt-1 truncate font-mono text-[15px] font-semibold tabular-nums leading-none text-text',
          tone
        )}
      >
        {value}
      </dd>
      {note ? <dd className="mt-1 truncate text-[11px] text-text-faint">{note}</dd> : null}
    </div>
  )
}
