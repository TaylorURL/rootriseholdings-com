import { cn } from '../../lib/cn'

/**
 * Surface container matching the design-system card treatment.
 *
 * @param {object} props
 * @param {React.ReactNode} [props.title] - optional header title
 * @param {React.ReactNode} [props.action] - optional header-right content
 * @param {React.ReactNode} props.children
 * @param {boolean} [props.padded=true] - apply inner padding to the body
 * @param {string} [props.className]
 * @param {string} [props.bodyClassName]
 */
export default function Card({ title, action, children, padded = true, className, bodyClassName }) {
  return (
    <section
      className={cn(
        'overflow-hidden rounded-lg border border-border bg-surface shadow-sm transition-colors hover:border-border-hover',
        className,
      )}
    >
      {(title || action) && (
        <header className="flex items-center justify-between gap-3 border-b border-border px-5 py-3.5">
          {typeof title === 'string' ? (
            <h2 className="text-sm font-semibold text-text">{title}</h2>
          ) : (
            title
          )}
          {action}
        </header>
      )}
      <div className={cn(padded && 'p-5', bodyClassName)}>{children}</div>
    </section>
  )
}
