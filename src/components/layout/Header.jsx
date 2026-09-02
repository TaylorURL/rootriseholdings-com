import { Link, useLocation } from 'react-router-dom'
import { Menu } from 'lucide-react'
import { titleForPath } from './navigation'
import ThemeToggle from '../ui/ThemeToggle'

/**
 * The terminal's bar. One rhythm, the same on every route: the page title, a
 * flexible gap, then the controls that are the same everywhere. What the desk
 * is doing rather than what the page is showing lives on the rail above it.
 *
 * @param {object} props
 * @param {() => void} props.onOpenDrawer
 */
export default function Header({ onOpenDrawer }) {
  const { pathname } = useLocation()

  return (
    <header className="sticky top-0 z-sticky flex h-[var(--ds-header-height)] shrink-0 items-center gap-3 border-b border-border bg-bg-elevated px-4 sm:px-6">
      <button
        type="button"
        onClick={onOpenDrawer}
        aria-label="Open Navigation"
        className="press focus-ring flex h-9 w-9 shrink-0 cursor-pointer touch-manipulation items-center justify-center rounded-control bg-surface-2 text-text-muted shadow-[var(--ds-edge)] transition-colors duration-200 ease-out lg:hidden [@media(hover:hover)]:hover:text-text"
      >
        <Menu className="h-4 w-4" aria-hidden="true" />
      </button>

      <h1 className="shrink-0 text-base font-semibold tracking-tighter text-text">
        {titleForPath(pathname)}
      </h1>

      <div className="min-w-2 flex-1" />

      <ThemeToggle />

      {/* The tile reads as the account, so it goes there: a mark in the bar's
          last slot that answers nothing is a control a reader tries once and
          learns not to trust. */}
      <Link
        to="/app/account"
        aria-label="Account"
        className="accent-face press focus-ring flex h-8 w-8 shrink-0 items-center justify-center rounded-control font-mono text-xs font-semibold text-on-accent"
      >
        RR
      </Link>
    </header>
  )
}
