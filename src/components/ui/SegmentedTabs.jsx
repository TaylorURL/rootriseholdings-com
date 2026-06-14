import { cn } from '../../lib/cn'

/**
 * Segmented control for mutually-exclusive filters.
 *
 * @param {object} props
 * @param {string[]} props.options
 * @param {string} props.value - currently selected option
 * @param {(option:string) => void} props.onChange
 * @param {string} [props.ariaLabel='Filter']
 * @param {string} [props.className]
 */
export default function SegmentedTabs({ options, value, onChange, ariaLabel = 'Filter', className }) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn('inline-flex items-center gap-1 rounded-md border border-border bg-surface-2 p-0.5', className)}
    >
      {options.map((option) => (
        <button
          key={option}
          type="button"
          role="tab"
          aria-selected={value === option}
          onClick={() => onChange(option)}
          className={cn(
            'rounded px-3 py-1.5 text-xs font-medium transition-colors',
            value === option
              ? 'bg-[var(--ds-accent-soft)] text-accent-bright'
              : 'text-text-muted hover:text-text',
          )}
        >
          {option}
        </button>
      ))}
    </div>
  )
}
