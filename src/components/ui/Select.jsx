import { useId } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '../../lib/cn'

/**
 * The native select, dressed as a field.
 *
 * It carries the same label, the same box and the same message slot as the
 * text field, so a form mixing the two reads as one form rather than two kinds
 * of control. The slot under the box holds its height whether it carries a
 * hint, an error or nothing, so a row of fields never jumps as it validates.
 *
 * Options may carry a `group`; when any do, the list is drawn under optgroup
 * headings in the order the groups first appear, which is what makes a long
 * registry scannable inside a native menu.
 *
 * @param {object} props
 * @param {string} props.label - accessible label (visually hidden when hideLabel)
 * @param {string} props.value
 * @param {(value:string) => void} props.onChange
 * @param {Array<{value:string,label:string,group?:string}>} props.options
 * @param {boolean} [props.hideLabel=false]
 * @param {string} [props.hint] - a line under the box that explains the choice
 * @param {string} [props.error] - what is wrong; replaces the hint
 * @param {boolean} [props.required]
 * @param {boolean} [props.disabled]
 * @param {boolean} [props.compact=false] - no message slot, for a filter bar
 * @param {string} [props.className]
 */
export default function Select({
  label,
  value,
  onChange,
  options,
  hideLabel = false,
  hint,
  error,
  required = false,
  disabled = false,
  compact = false,
  className,
}) {
  const id = useId()
  const messageId = `${id}-message`
  const grouped = options.some((option) => option.group)
  const groups = grouped
    ? [...new Set(options.map((option) => option.group ?? ''))].map((group) => ({
        group,
        options: options.filter((option) => (option.group ?? '') === group),
      }))
    : null

  const renderOption = (option) => (
    <option key={option.value} value={option.value} className="bg-surface text-text">
      {option.label}
    </option>
  )

  return (
    <div className={className}>
      <label
        htmlFor={id}
        className={cn('mb-1.5 block text-[13px] font-medium text-text', hideLabel && 'sr-only')}
      >
        {label}
        {required ? (
          <span aria-hidden="true" className="ml-1 text-accent-bright">
            *
          </span>
        ) : null}
      </label>
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          required={required}
          disabled={disabled}
          aria-required={required || undefined}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={hint || error ? messageId : undefined}
          className="field cursor-pointer appearance-none truncate pl-3 pr-9"
        >
          {groups
            ? groups.map(({ group, options: members }) =>
                group ? (
                  <optgroup key={group} label={group} className="bg-surface text-text">
                    {members.map(renderOption)}
                  </optgroup>
                ) : (
                  members.map(renderOption)
                )
              )
            : options.map(renderOption)}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-faint"
          aria-hidden="true"
        />
      </div>
      {compact ? null : (
        <p
          id={messageId}
          className={cn('min-h-4 pt-1 text-xs', error ? 'text-danger' : 'text-text-faint')}
          role={error ? 'alert' : undefined}
        >
          {error ?? hint ?? ''}
        </p>
      )}
    </div>
  )
}
