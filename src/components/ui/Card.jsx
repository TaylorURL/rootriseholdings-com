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
 * tone off the page, a hairline, ten-pixel corners - so its title is set at a
 * size that names it, with a quiet line under it saying what the panel
 * measures and in what unit, and the body follows on the same ground.
 *
 * @param {object} props
 * @param {React.ReactNode} [props.title] - heading, or a node when a surface needs its own
 * @param {React.ReactNode} [props.subtitle] - what the panel measures, and in what unit
 * @param {React.ReactNode} [props.action] - controls that belong to this panel
 * @param {React.ReactNode} props.children
 * @param {boolean} [props.padded=true]
 * @param {string} [props.className]
 * @param {string} [props.bodyClassName]
 */
export default function Card({
  title,
  subtitle,
  action,
  children,
  padded = true,
  className,
  bodyClassName,
}) {
  return (
    <section className={cn('panel-static overflow-hidden', className)}>
      {(title || action) && (
        <header className="flex min-h-12 items-start gap-3 px-5 pb-0 pt-4">
          <div className="min-w-0">
            {typeof title === 'string' ? (
              <h2 className={cn(PANEL_TITLE, 'truncate')}>{title}</h2>
            ) : (
              title
            )}
            {subtitle ? <p className="mt-0.5 text-xs text-text-faint">{subtitle}</p> : null}
          </div>
          <div className="min-w-2 flex-1" />
          {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
        </header>
      )}
      <div className={cn(padded && 'p-5', bodyClassName)}>{children}</div>
    </section>
  )
}
