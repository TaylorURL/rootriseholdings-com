import { useLocation } from 'react-router-dom'
import { titleForPath } from '../layout/navigation'
import { cn } from '../../lib/cn'

/**
 * The block a page opens with.
 *
 * The bar above already names the route, so a title repeating it is the same
 * word twice on one screen: the heading is drawn only when the page calls
 * itself something the bar does not. What is left is the line that says what
 * this page is showing right now, and whatever acts on it.
 */
export default function PageHeader({ title, subtitle, action, className }) {
  const { pathname } = useLocation()
  const barTitle = titleForPath(pathname)
  const ownTitle = typeof title === 'string' && title.trim() === barTitle ? null : title

  return (
    <div className={cn('flex flex-wrap items-end justify-between gap-x-6 gap-y-2', className)}>
      <div className="flex min-w-0 flex-col gap-1">
        {ownTitle ? (
          <h2 className="text-lg font-semibold tracking-tight text-text">{ownTitle}</h2>
        ) : null}
        {subtitle ? <p className="text-[13px] text-text-muted">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  )
}
