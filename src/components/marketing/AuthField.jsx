import { useId } from 'react'
import { cn } from '../../lib/cn'

/**
 * A labeled input with leading icon, optional trailing slot, and inline
 * validation-error display. Design-only — no data fetching or side effects.
 *
 * @param {object} props
 * @param {string} props.label - visible field label
 * @param {string} [props.type='text']
 * @param {string} [props.name]
 * @param {string} [props.value]
 * @param {(e: React.ChangeEvent<HTMLInputElement>) => void} [props.onChange]
 * @param {(e: React.FocusEvent<HTMLInputElement>) => void} [props.onBlur]
 * @param {string} [props.placeholder]
 * @param {string} [props.autoComplete]
 * @param {React.ComponentType<{className?: string}>} [props.icon] - lucide leading icon
 * @param {React.ReactNode} [props.trailing] - element rendered inside the input on the right
 * @param {string} [props.error] - error message; presence flips error styling
 * @param {boolean} [props.required]
 * @param {boolean} [props.disabled]
 * @param {string} [props.className]
 */
export default function AuthField({
  label,
  type = 'text',
  name,
  value,
  onChange,
  onBlur,
  placeholder,
  autoComplete,
  icon: Icon,
  trailing,
  error,
  required,
  disabled,
  className,
  ...rest
}) {
  const id = useId()
  const errorId = `${id}-error`
  const hasError = Boolean(error)

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-sm font-medium text-text">
        {label}
      </label>

      <div className="relative">
        {Icon && (
          <Icon
            className={cn(
              'pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2',
              hasError ? 'text-danger' : 'text-text-faint',
            )}
            aria-hidden="true"
          />
        )}

        <input
          id={id}
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required={required}
          disabled={disabled}
          aria-invalid={hasError || undefined}
          aria-describedby={hasError ? errorId : undefined}
          className={cn(
            'h-11 w-full rounded-lg border bg-surface-2 text-sm text-text',
            'placeholder:text-text-faint',
            'transition-colors duration-150',
            'focus-visible:outline-none',
            'disabled:cursor-not-allowed disabled:opacity-60',
            Icon ? 'pl-9' : 'pl-3',
            trailing ? 'pr-10' : 'pr-3',
            hasError
              ? 'border-danger focus:border-danger'
              : 'border-border-input focus:border-accent-bright',
          )}
          {...rest}
        />

        {trailing && (
          <div className="absolute right-1.5 top-1/2 flex -translate-y-1/2 items-center">
            {trailing}
          </div>
        )}
      </div>

      {hasError && (
        <p id={errorId} className="text-xs text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
