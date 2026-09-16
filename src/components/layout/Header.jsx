import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Menu } from 'lucide-react'
import { NAV_GROUPS, titleForPath } from './navigation'
import ThemeToggle from '../ui/ThemeToggle'
import { DESK_TIME_ZONE, sessionForMoment } from '../../lib/time.js'
import { cn } from '../../lib/cn'

function useClock() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const intervalId = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(intervalId)
  }, [])
  return now
}

function groupForPath(pathname) {
  return NAV_GROUPS.find((group) =>
    group.items.some((item) => (item.end ? pathname === item.to : pathname.startsWith(item.to)))
  )?.heading
}

/**
 * The terminal's bar: a flat strip ruled off the page, carrying where you are,
 * the desk's clock, and the controls that are the same on every route.
 *
 * The clock is the state of the desk rather than the state of the page - which
 * session is open and what the time is in the desk's own zone.
 *
 * @param {object} props
 * @param {() => void} props.onOpenDrawer
 */
export default function Header({ onOpenDrawer }) {
  const { pathname } = useLocation()
  const now = useClock()
  const session = sessionForMoment(now)
  const group = groupForPath(pathname)

  return (
    <header className="flex h-[var(--ds-header-height)] shrink-0 items-center gap-3 border-b border-border bg-bg-elevated px-4 sm:px-6">
      <button
        type="button"
        onClick={onOpenDrawer}
        aria-label="Open Navigation"
        className="press focus-ring -ml-1 flex h-8 w-8 shrink-0 cursor-pointer touch-manipulation items-center justify-center rounded-control text-text-muted transition-colors duration-200 ease-out lg:hidden [@media(hover:hover)]:hover:bg-[var(--ds-neutral-soft)] [@media(hover:hover)]:hover:text-text"
      >
        <Menu className="h-4 w-4" aria-hidden="true" />
      </button>

      <div className="flex min-w-0 items-center gap-2 text-[13px]">
        {group ? (
          <>
            <span className="hidden text-text-faint sm:inline">{group}</span>
            <span className="hidden text-text-faint sm:inline" aria-hidden="true">
              /
            </span>
          </>
        ) : null}
        <h1 className="truncate font-semibold text-text">{titleForPath(pathname)}</h1>
      </div>

      <div className="min-w-2 flex-1" />

      <div className="hidden h-8 items-center gap-2 rounded-control border border-border px-2.5 text-xs md:flex">
        <span
          className={cn(
            'inline-flex h-1.5 w-1.5 rounded-full',
            session ? 'bg-positive' : 'bg-[var(--ds-neutral)]'
          )}
          aria-hidden="true"
        />
        <span className="text-text-muted">{session ?? 'Between Sessions'}</span>
        <time className="font-medium tabular-nums text-text">
          {now.toLocaleTimeString('en-US', { hour12: false, timeZone: DESK_TIME_ZONE })} CT
        </time>
      </div>

      <ThemeToggle />

      {/* The tile reads as the account, so it goes there: a mark in the bar's
          last slot that answers nothing is a control a reader tries once and
          learns not to trust. */}
      <Link
        to="/app/account"
        aria-label="Account"
        className="press focus-ring flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-3 text-[11px] font-semibold text-text-muted transition-colors duration-200 ease-out [@media(hover:hover)]:hover:text-text"
      >
        RR
      </Link>
    </header>
  )
}
