import { cn } from '../../lib/cn'

/**
 * A row of exclusive choices drawn as one control.
 *
 * Two jobs share the shape. A filter over a list is a set of tabs, and a
 * choice inside a form is a radio group: the same buttons, but what assistive
 * tech is told differs, and a form control announced as a tab strip is a
 * control a screen reader user cannot fill in. `kind` decides which contract
 * the row honours.
 *
 * @param {object} props
 * @param {string[]} props.options
 * @param {string} props.value - currently selected option
 * @param {(option:string) => void} props.onChange
 * @param {string} [props.ariaLabel='Filter']
 * @param {'tabs'|'choice'} [props.kind='tabs']
 * @param {string} [props.className]
 */
export default function SegmentedTabs({
  options,
  value,
  onChange,
  ariaLabel = 'Filter',
  kind = 'tabs',
  className,
}) {
  const choice = kind === 'choice'
  return (
    <div
      role={choice ? 'radiogroup' : 'tablist'}
      aria-label={ariaLabel}
      className={cn(
        'inline-flex flex-wrap items-center gap-1 rounded-control p-1 shadow-[inset_0_0_0_1px_var(--ds-border-strong)]',
        className
      )}
    >
      {options.map((option) => {
        const selected = value === option
        return (
          <button
            key={option}
            type="button"
            role={choice ? 'radio' : 'tab'}
            aria-checked={choice ? selected : undefined}
            aria-selected={choice ? undefined : selected}
            onClick={() => onChange(option)}
            className={cn(
              'press focus-ring rounded-sm px-3 py-1.5 text-[13px] font-medium transition-colors duration-200 ease-out',
              selected
                ? 'bg-[var(--ds-accent-fill)] font-bold text-on-accent'
                : 'text-text-muted hover:text-text'
            )}
          >
            {option}
          </button>
        )
      })}
    </div>
  )
}
