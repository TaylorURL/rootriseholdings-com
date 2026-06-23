import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Menu } from 'lucide-react'
import { titleForPath } from './navigation'
import ThemeToggle from '../ui/ThemeToggle'

/** Live wall clock that re-renders every second. */
function useClock() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const intervalId = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(intervalId)
  }, [])
  return now
}

/**
 * Sticky frosted top bar: mobile drawer trigger, dynamic page title, live clock,
 * data-feed status, theme toggle, and a user avatar placeholder.
 *
 * @param {object} props
 * @param {() => void} props.onOpenDrawer
 */
export default function Header({ onOpenDrawer }) {
  const { pathname } = useLocation()
  const now = useClock()

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between gap-4 border-b border-border bg-[var(--ds-backdrop)] px-4 py-3.5 backdrop-blur-xl sm:px-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenDrawer}
          aria-label="Open navigation"
          className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-surface-2 text-text-muted transition-colors hover:text-text lg:hidden"
        >
          <Menu className="h-4 w-4" />
        </button>
        <h1 className="text-lg font-semibold tracking-tight text-text">{titleForPath(pathname)}</h1>
      </div>

      <div className="flex items-center gap-3">
        <time className="hidden font-mono text-sm tabular-nums text-text-muted sm:block">
          {now.toLocaleTimeString('en-US', { hour12: false })}
        </time>

        <span className="hidden items-center gap-1.5 rounded-full border border-border bg-surface-2 px-2.5 py-1 text-xs font-medium text-text-muted sm:flex">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-positive opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-positive" />
          </span>
          Simulated feed
        </span>

        <ThemeToggle />

        <div
          className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--ds-accent-face)] font-mono text-sm font-semibold text-on-accent"
          aria-label="Account avatar"
          title="Root & Rise"
        >
          RR
        </div>
      </div>
    </header>
  )
}
