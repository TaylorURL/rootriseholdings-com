import { cn } from '../../lib/cn'

/**
 * The panel everything in the terminal sits in.
 *
 * The edge is a ring in the shadow rather than a border, so a row of panels of
 * unequal height reads as objects on the page instead of as a broken table, and
 * the edge and the elevation move together.
 *
 * @param {object} props
 * @param {React.ReactNode} [props.title] - heading, or a node when a surface needs its own
 * @param {React.ReactNode} [props.action] - controls that belong to this panel
 * @param {React.ReactNode} props.children
 * @param {boolean} [props.padded=true]
 * @param {string} [props.className]
 * @param {string} [props.bodyClassName]
 */
export default function Card({ title, action, children, padded = true, className, bodyClassName }) {
  return (
    <section className={cn('panel-static overflow-hidden', className)}>
      {(title || action) && (
        <header className="flex items-center gap-3 border-b border-border px-5 py-3">
          {typeof title === 'string' ? (
            <h2 className="shrink-0 text-[13px] font-semibold tracking-tight text-text">{title}</h2>
          ) : (
            title
          )}
          <div className="min-w-2 flex-1" />
          {action}
        </header>
      )}
      <div className={cn(padded && 'p-5', bodyClassName)}>{children}</div>
    </section>
  )
}
