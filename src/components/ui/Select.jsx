import { ChevronDown } from 'lucide-react'
import { cn } from '../../lib/cn'

/**
 * Styled native select with a label and chevron affordance.
 *
 * @param {object} props
 * @param {string} props.label - accessible label (visually hidden when hideLabel)
 * @param {string} props.value
 * @param {(value:string) => void} props.onChange
 * @param {Array<{value:string,label:string}>} props.options
 * @param {boolean} [props.hideLabel=false]
 * @param {string} [props.className]
 */
export default function Select({ label, value, onChange, options, hideLabel = false, className }) {
  return (
    <label className={cn('flex flex-col gap-1.5', className)}>
      <span className={cn('text-xs font-medium uppercase tracking-wide text-text-faint', hideLabel && 'sr-only')}>
        {label}
      </span>
      <div className="relative">
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-label={label}
          className="w-full appearance-none rounded-md border border-[var(--ds-border-input)] bg-surface-2 py-2 pl-3 pr-9 text-sm text-text shadow-[var(--ds-field-inset)] outline-none transition-colors focus:border-border-hover"
        >
          {options.map((option) => (
            <option key={option.value} value={option.value} className="bg-surface text-text">
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-faint" aria-hidden="true" />
      </div>
    </label>
  )
}
