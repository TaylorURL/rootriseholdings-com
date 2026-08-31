import { useId } from 'react'
import { cn } from '../../lib/cn'

/**
 * One field, with its label, its optional leading icon and trailing control,
 * and a message slot that holds its height whether or not there is a message
 * in it - so a form never jumps as it is validated.
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
  ...inputProps
}) {
  const id = useId()
  const messageId = `${id}-message`

  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-[13px] font-medium text-text">
        {label}
      </label>
      <div className="relative">
        {Icon ? (
          <Icon
            aria-hidden="true"
            className={cn(
              'pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2',
              error ? 'text-danger' : 'text-text-faint'
            )}
          />
        ) : null}
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
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={error ? messageId : undefined}
          className={cn('field', Icon && 'pl-9', trailing && 'pr-11')}
          {...inputProps}
        />
        {trailing ? (
          <span className="absolute right-1.5 top-1/2 -translate-y-1/2">{trailing}</span>
        ) : null}
      </div>
      <p id={messageId} className="min-h-4 pt-1 text-xs text-danger" role="alert">
        {error ?? ''}
      </p>
    </div>
  )
}
