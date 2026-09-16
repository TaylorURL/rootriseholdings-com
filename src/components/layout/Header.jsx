import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { CalendarDays, Menu } from 'lucide-react'
import { titleForPath } from './navigation'
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

/**
 * The terminal's bar, drawn as the dashboard kit draws it: a panel of its own
 * set into the page, rather than a strip ruled across the top of it. One
 * rhythm on every route: the page title, a flexible gap, the desk's clock, and
 * the controls that are the same everywhere.
 *
 * The clock is the state of the desk rather than the state of the page - which
 * session is open and what the time is in the desk's own zone - and it sits in
 * the slot the kit gives its date, because it answers the same question.
 *
 * @param {object} props
 * @param {() => void} props.onOpenDrawer
 */
export default function Header({ onOpenDrawer }) {
  const { pathname } = useLocation()
  const now = useClock()
  const session = sessionForMoment(now)

  return (
    <header className="flex min-h-[var(--ds-header-height)] shrink-0 items-center gap-3 rounded-card bg-surface px-4 py-4 shadow-[var(--ds-raise)] sm:px-5">
      <button
        type="button"
        onClick={onOpenDrawer}
        aria-label="Open Navigation"
        className="press focus-ring flex h-11 w-11 shrink-0 cursor-pointer touch-manipulation items-center justify-center rounded-control text-text shadow-[inset_0_0_0_1px_var(--ds-border-strong)] transition-colors duration-200 ease-out lg:hidden [@media(hover:hover)]:hover:bg-[var(--ds-neutral-soft)]"
      >
        <Menu className="h-5 w-5" aria-hidden="true" />
      </button>

      <h1 className="min-w-0 truncate text-xl font-bold leading-7 text-text sm:text-2xl">
        {titleForPath(pathname)}
      </h1>

      <div className="min-w-2 flex-1" />

      <div className="hidden h-11 items-center gap-3 rounded-control px-3 text-sm text-text shadow-[inset_0_0_0_1px_var(--ds-border-strong)] md:flex">
        <CalendarDays className="h-5 w-5 shrink-0 text-text-muted" aria-hidden="true" />
        <span className="flex items-center gap-1.5 text-text-muted">
          <span
            className={cn(
              'inline-flex h-2 w-2 rounded-full',
              session ? 'bg-positive' : 'bg-surface-3'
            )}
            aria-hidden="true"
          />
          {session ?? 'Between Sessions'}
        </span>
        <time className="tabular-nums">
          {now.toLocaleTimeString('en-US', { hour12: false, timeZone: DESK_TIME_ZONE })} CT
        </time>
      </div>

      <span className="hidden h-6 w-px bg-border md:block" aria-hidden="true" />

      <ThemeToggle />

      {/* The tile reads as the account, so it goes there: a mark in the bar's
          last slot that answers nothing is a control a reader tries once and
          learns not to trust. */}
      <Link
        to="/app/account"
        aria-label="Account"
        className="accent-face press focus-ring flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold text-on-accent"
      >
        RR
      </Link>
    </header>
  )
}
