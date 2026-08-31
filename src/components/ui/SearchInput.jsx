import { useId } from 'react'
import { Search } from 'lucide-react'
import { cn } from '../../lib/cn'

/**
 * The search field.
 *
 * The label is hidden rather than absent: the placeholder it would otherwise
 * lean on disappears the moment somebody types, which leaves the field
 * unnamed exactly when a reader is trying to remember what it filters.
 *
 * @param {object} props
 * @param {string} props.value
 * @param {(value:string) => void} props.onChange
 * @param {string} [props.placeholder='Search']
 * @param {string} [props.ariaLabel='Search']
 * @param {string} [props.className]
 */
export default function SearchInput({
  value,
  onChange,
  placeholder = 'Search',
  ariaLabel = 'Search',
  className,
}) {
  const id = useId()

  return (
    <div className={cn('relative', className)}>
      <label htmlFor={id} className="sr-only">
        {ariaLabel}
      </label>
      <Search
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-faint"
        aria-hidden="true"
      />
      <input
        id={id}
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="field py-2 pl-9 pr-3"
      />
    </div>
  )
}
