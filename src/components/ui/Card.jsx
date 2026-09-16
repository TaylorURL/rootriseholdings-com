import { PANEL_TITLE } from './Figures'
import { cn } from '../../lib/cn'

/**
 * The panel everything in the terminal sits in.
 *
 * The edge is a ring in the shadow rather than a border, so a row of panels of
 * unequal height reads as objects on the page instead of as a broken table, and
 * the edge and the elevation move together.
 *
 * The head is neither banded nor ruled. The panel is already an object - a
 * tone off the page, sixteen-pixel corners, one soft shadow - so its title is
 * set at a size that names it and the body follows on the same ground, which
 * is how the dashboard kit draws every panel it has.
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
        <header className="flex min-h-[4.25rem] items-center gap-3 px-5 pb-1 pt-5">
          {typeof title === 'string' ? (
            <h2 className={cn(PANEL_TITLE, 'shrink-0')}>{title}</h2>
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
