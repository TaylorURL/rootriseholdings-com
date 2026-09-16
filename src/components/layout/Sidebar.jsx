import { Link, NavLink, useNavigate } from 'react-router-dom'
import { ArrowLeft, LogOut, Plus } from 'lucide-react'
import { cn } from '../../lib/cn'
import { NAV_GROUPS } from './navigation'
import { useAuth } from '../../context/AuthContext'
import { useJournal } from '../../context/JournalContext'
import BrandMark from '../marketing/BrandMark'
import { COMPLIANCE } from '../../lib/copy/brand'
import { RISK_RULES } from '../../data/riskRules'

const ROW =
  'press focus-ring relative flex h-8 items-center gap-2.5 rounded-control px-2.5 text-[13px] font-medium transition-colors duration-150 ease-out'

const QUIET =
  'text-text-muted [@media(hover:hover)]:hover:bg-[var(--ds-neutral-soft)] [@media(hover:hover)]:hover:text-text'

/**
 * The rail: a flat column ruled off the page.
 *
 * Destinations are grouped in the order a session uses them. The active one
 * takes a soft violet tint and a violet icon rather than a solid fill: eight
 * rows where one is a slab of colour reads as a row of buttons, and competes
 * with the one filled control the rail itself has.
 *
 * Under the destinations sits the desk's own figures - the two that decide
 * whether the day is still open - and the way into the journal.
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
      <div className="flex h-[var(--ds-header-height)] shrink-0 items-center border-b border-border px-5">
        <Link
          to="/app"
          onClick={onNavigate}
          className="press focus-ring rounded-control"
          aria-label="Terminal home"
        >
          <BrandMark size="sm" />
        </Link>
      </div>

      <nav className="ds-scroll flex-1 overflow-y-auto px-3 py-4" aria-label="Primary">
        {NAV_GROUPS.map((group) => (
          <div key={group.heading} className="mb-5 last:mb-0">
            <p className="px-2.5 pb-1.5 text-[11px] font-medium text-text-faint">{group.heading}</p>
            <div className="space-y-0.5">
              {group.items.map(({ to, label, icon: Icon, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    cn(ROW, 'group', isActive ? 'bg-[var(--ds-accent-soft)] text-text' : QUIET)
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon
                        className={cn(
                          'h-4 w-4 shrink-0',
                          isActive ? 'text-accent' : 'text-text-faint group-hover:text-text-muted'
                        )}
                        aria-hidden="true"
                      />
                      {label}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="shrink-0 border-t border-border p-3">
        <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-tile border border-border bg-border">
          <div className="bg-surface px-3 py-2">
            <dt className="text-[11px] text-text-faint">Open Trades</dt>
            <dd className="mt-0.5 text-sm font-semibold tabular-nums text-text">
              {dayState.openTrades.length}
            </dd>
          </div>
          <div className="bg-surface px-3 py-2">
            <dt className="text-[11px] text-text-faint">Budget Left</dt>
            <dd
              className={cn(
                'mt-0.5 text-sm font-semibold tabular-nums',
                dayState.dailyLossLimitHit ? 'text-danger' : 'text-text'
              )}
            >
              {dayState.dailyLossBudgetLeftPct.toFixed(2)}%
            </dd>
          </div>
        </dl>
        <p className="mt-2 px-0.5 text-[11px] leading-relaxed text-text-faint">
          The journal is saved to your account, so it follows you to any browser. Keep a copy under
          Account. The daily stop is {RISK_RULES.dailyLossLimitPct}%.
        </p>
        <Link to="/app/journal" onClick={onNavigate} className="btn btn-primary mt-3 w-full">
          <Plus className="h-4 w-4" aria-hidden="true" />
          Log a Trade
        </Link>

        <div className="mt-3 space-y-0.5">
          <Link to="/" onClick={onNavigate} className={cn(ROW, QUIET)}>
            <ArrowLeft className="h-4 w-4 shrink-0 text-text-faint" aria-hidden="true" />
            Back to Site
          </Link>
          <button
            type="button"
            onClick={handleSignOut}
            className={cn(
              ROW,
              'w-full text-text-muted [@media(hover:hover)]:hover:bg-[var(--ds-danger-soft)] [@media(hover:hover)]:hover:text-danger'
            )}
          >
            <LogOut className="h-4 w-4 shrink-0 text-text-faint" aria-hidden="true" />
            Sign Out
          </button>
        </div>
        <p className="mt-2 px-2.5 text-[11px] leading-relaxed text-text-faint">
          {COMPLIANCE.short}
        </p>
      </div>
    </aside>
  )
}
