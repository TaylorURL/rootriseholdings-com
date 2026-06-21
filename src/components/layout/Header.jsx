import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Moon, Sun } from 'lucide-react'
import { titleForPath } from './navigation'

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
 * Sticky frosted top bar: dynamic page title, live clock, connection status,
 * theme toggle, and a user avatar placeholder.
 *
 * @param {object} props
 * @param {'dark'|'light'} props.theme
 * @param {() => void} props.onToggleTheme
 */
export default function Header({ theme, onToggleTheme }) {
  const { pathname } = useLocation()
  const now = useClock()
  const isDark = theme === 'dark'

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between gap-4 border-b border-border bg-[var(--ds-backdrop)] px-6 py-3.5 backdrop-blur-xl">
      <h1 className="text-lg font-semibold tracking-tight text-text">{titleForPath(pathname)}</h1>

      <div className="flex items-center gap-3">
        <time className="hidden font-mono text-sm tabular-nums text-text-muted sm:block">
          {now.toLocaleTimeString('en-US', { hour12: false })}
        </time>

        <span className="hidden items-center gap-1.5 rounded-full border border-border bg-surface-2 px-2.5 py-1 text-xs font-medium text-text-muted sm:flex">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-positive opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-positive" />
          </span>
          Live
        </span>

        <button
          type="button"
          onClick={onToggleTheme}
          aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
          className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-surface-2 text-text-muted transition-colors hover:border-border-hover hover:text-text"
        >
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>

        <div
          className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--ds-accent-face)] font-mono text-sm font-semibold text-on-accent"
          aria-label="Account avatar"
          title="Rise & Root Capital"
        >
          RR
        </div>
      </div>
    </header>
  )
}
