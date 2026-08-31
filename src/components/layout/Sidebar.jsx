import { Link, NavLink, useNavigate } from 'react-router-dom'
import { ArrowLeft, LogOut } from 'lucide-react'
import { cn } from '../../lib/cn'
import { NAV_GROUPS } from './navigation'
import { useAuth } from '../../context/AuthContext'
import { useJournal } from '../../context/JournalContext'
import BrandMark from '../marketing/BrandMark'
import { RISK_RULES } from '../../data/riskRules'

const ROW =
  'press focus-ring relative flex items-center gap-2.5 rounded-control px-3 py-[7px] text-[13px] font-medium transition-colors duration-200 ease-out'

const QUIET =
  'text-text-muted [@media(hover:hover)]:hover:bg-surface-2 [@media(hover:hover)]:hover:text-text'

/**
 * The rail.
 *
 * Destinations are grouped in the order a session uses them, and the active one
 * is marked with an accent rule against its leading edge rather than a filled
 * pill: a rail of seven rows where one is filled reads as a row of buttons and
 * competes with the one filled control the page itself has.
 *
 * The foot carries the two figures that decide whether the desk is still open,
 * so the rail reports state rather than only listing pages.
 *
 * @param {object} props
 * @param {() => void} [props.onNavigate] - called after a nav action (closes the mobile drawer)
 */
export default function Sidebar({ onNavigate }) {
  const navigate = useNavigate()
  const { signOut } = useAuth()
  const { dayState } = useJournal()

  const handleSignOut = () => {
    signOut()
    onNavigate?.()
    navigate('/')
  }

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r border-border bg-bg-elevated">
      <div className="flex h-[var(--ds-header-height)] items-center justify-between gap-2 border-b border-border px-4">
        <Link
          to="/app"
          onClick={onNavigate}
          className="press focus-ring rounded-sm"
          aria-label="Terminal home"
        >
          <BrandMark size="sm" />
        </Link>
        <span className="chip-static chip-accent shrink-0">Terminal</span>
      </div>

      <nav className="ds-scroll flex-1 overflow-y-auto px-3 py-4" aria-label="Primary">
        {NAV_GROUPS.map((group) => (
          <div key={group.heading} className="mb-5 last:mb-0">
            <p className="px-3 pb-1.5 font-mono text-[10px] uppercase tracking-label text-text-faint">
              {group.heading}
            </p>
            <div className="space-y-px">
              {group.items.map(({ to, label, icon: Icon, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    cn(
                      ROW,
                      isActive
                        ? 'bg-[var(--ds-accent-soft)] text-accent before:absolute before:inset-y-1 before:left-0 before:w-0.5 before:rounded-full before:bg-[var(--ds-accent-fill)] before:content-[""]'
                        : QUIET
                    )
                  }
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  {label}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <dl className="grid grid-cols-2 gap-px border-t border-border bg-border">
        <div className="bg-bg-elevated px-3 py-2.5">
          <dt className="font-mono text-[10px] uppercase tracking-label text-text-faint">Open</dt>
          <dd className="mt-0.5 font-mono text-[13px] font-semibold tabular-nums text-text">
            {dayState.openTrades.length}
          </dd>
        </div>
        <div className="bg-bg-elevated px-3 py-2.5">
          <dt className="font-mono text-[10px] uppercase tracking-label text-text-faint">Budget</dt>
          <dd
            className={cn(
              'mt-0.5 font-mono text-[13px] font-semibold tabular-nums',
              dayState.dailyLossLimitHit ? 'text-danger' : 'text-text'
            )}
          >
            {dayState.dailyLossBudgetLeftPct.toFixed(2)}%
          </dd>
        </div>
      </dl>

      <div className="space-y-px border-t border-border p-3">
        <p className="px-3 pb-2 text-[11px] leading-relaxed text-text-faint">
          Journal data stays in this browser&rsquo;s storage. The daily stop is{' '}
          {RISK_RULES.dailyLossLimitPct}%.
        </p>
        <Link to="/" onClick={onNavigate} className={cn(ROW, QUIET)}>
          <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden="true" />
          Back to Site
        </Link>
        <button
          type="button"
          onClick={handleSignOut}
          className={cn(
            ROW,
            'w-full text-text-muted [@media(hover:hover)]:hover:bg-surface-2 [@media(hover:hover)]:hover:text-danger'
          )}
        >
          <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
          Sign Out
        </button>
      </div>
    </aside>
  )
}
