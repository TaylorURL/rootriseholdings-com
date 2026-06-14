import { Search } from 'lucide-react'
import { cn } from '../../lib/cn'

/**
 * Search text input with a leading icon, styled on the design tokens.
 *
 * @param {object} props
 * @param {string} props.value
 * @param {(value:string) => void} props.onChange
 * @param {string} [props.placeholder='Search']
 * @param {string} [props.ariaLabel='Search']
 * @param {string} [props.className]
 */
export default function SearchInput({ value, onChange, placeholder = 'Search', ariaLabel = 'Search', className }) {
  return (
    <div className={cn('relative', className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-faint" aria-hidden="true" />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        className="w-full rounded-md border border-[var(--ds-border-input)] bg-surface-2 py-2 pl-9 pr-3 text-sm text-text placeholder:text-text-faint shadow-[var(--ds-field-inset)] outline-none transition-colors focus:border-border-hover"
      />
    </div>
  )
}
