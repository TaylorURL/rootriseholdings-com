import { Link, NavLink, useNavigate } from 'react-router-dom'
import { ArrowLeft, LogOut } from 'lucide-react'
import { cn } from '../../lib/cn'
import { NAV_ITEMS } from './navigation'
import { useAuth } from '../../context/AuthContext'
import BrandMark from '../marketing/BrandMark'

/**
 * Gated-terminal navigation. Renders the brand lockup, primary nav, and a
 * footer with the demo-mode notice plus sign-out / back-to-site actions.
 *
 * @param {object} props
 * @param {() => void} [props.onNavigate] - called after a nav action (closes the mobile drawer)
 */
export default function Sidebar({ onNavigate }) {
  const navigate = useNavigate()
  const { signOut } = useAuth()

  const handleSignOut = () => {
    signOut()
    onNavigate?.()
    navigate('/')
  }

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-border bg-bg-elevated">
      <div className="flex items-center justify-between px-5 py-5">
        <Link to="/app" onClick={onNavigate} aria-label="Terminal home">
          <BrandMark />
        </Link>
        <span className="rounded-full border border-[var(--ds-accent-soft)] bg-[var(--ds-accent-softer)] px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.16em] text-accent-bright">
          Terminal
        </span>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-2" aria-label="Primary">
        {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'border border-border-hover bg-[var(--ds-accent-soft)] text-accent-bright'
                  : 'border border-transparent text-text-muted hover:bg-surface-2 hover:text-text',
              )
            }
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="space-y-3 border-t border-border px-3 py-4">
        <p className="px-2 font-mono text-[11px] leading-relaxed text-text-faint">
          Demo session · signals are illustrative, not financial advice.
        </p>
        <Link
          to="/"
          onClick={onNavigate}
          className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium text-text-muted transition-colors hover:bg-surface-2 hover:text-text"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to site
        </Link>
        <button
          type="button"
          onClick={handleSignOut}
          className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium text-text-muted transition-colors hover:bg-surface-2 hover:text-danger"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          Sign out
        </button>
      </div>
    </aside>
  )
}
