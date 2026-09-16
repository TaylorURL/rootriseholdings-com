import { Link, NavLink, useNavigate } from 'react-router-dom'
import { ArrowLeft, LogOut, Plus } from 'lucide-react'
import { cn } from '../../lib/cn'
import { NAV_GROUPS } from './navigation'
import { useAuth } from '../../context/AuthContext'
import { useJournal } from '../../context/JournalContext'
import BrandMark from '../marketing/BrandMark'
import { RuleLabel, RULE_LABEL } from '../ui/Figures'
import { COMPLIANCE } from '../../lib/copy/brand'
import { RISK_RULES } from '../../data/riskRules'

const ROW =
  'press focus-ring relative flex min-h-11 items-center gap-3 rounded-card px-5 py-2.5 text-sm transition-colors duration-200 ease-out'

const QUIET =
  'font-medium text-text-muted [@media(hover:hover)]:hover:bg-[var(--ds-neutral-soft)] [@media(hover:hover)]:hover:text-text'

/**
 * The rail.
 *
 * Destinations are grouped in the order a session uses them. The active one is
 * a filled mint row, the way the dashboard kit marks where you are: the rail is
 * the one place a filled row cannot be mistaken for a button, because every
 * other row in it is a destination too.
 *
 * Under the destinations sits the desk's own tile - the two figures that decide
 * whether the day is still open, and the way into the journal - drawn as the
 * kit's dashed call-to-action block so it reads as the thing to do next.
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
    <aside className="ds-scroll flex h-full w-60 shrink-0 flex-col overflow-y-auto rounded-r-feature bg-bg-elevated shadow-[var(--ds-raise)]">
      <div className="flex items-center justify-between gap-2 px-6 pb-5 pt-7">
        <Link
          to="/app"
          onClick={onNavigate}
          className="press focus-ring rounded-control"
          aria-label="Terminal home"
        >
          <BrandMark size="xl" />
        </Link>
      </div>

      <nav className="flex-1 px-6 pb-4" aria-label="Primary">
        {NAV_GROUPS.map((group) => (
          <div key={group.heading} className="mb-4 last:mb-0">
            <RuleLabel className="px-5 pb-1.5 text-text-faint">{group.heading}</RuleLabel>
            <div className="space-y-0.5">
              {group.items.map(({ to, label, icon: Icon, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    cn(
                      ROW,
                      isActive ? 'bg-[var(--ds-accent-fill)] font-bold text-on-accent' : QUIET
                    )
                  }
                >
                  <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                  {label}
                </NavLink>
              ))}
            </div>
          </div>
        ))}

        <div className="mt-5 rounded-card border border-dashed border-[var(--ds-accent)] bg-[var(--ds-accent-softer)] p-4">
          <dl className="grid grid-cols-2 gap-3">
            <div>
              <dt className={RULE_LABEL}>Open</dt>
              <dd className="mt-0.5 text-base font-medium tabular-nums text-text">
                {dayState.openTrades.length}
              </dd>
            </div>
            <div>
              <dt className={RULE_LABEL}>Budget</dt>
              <dd
                className={cn(
                  'mt-0.5 text-base font-medium tabular-nums',
                  dayState.dailyLossLimitHit ? 'text-danger' : 'text-text'
                )}
              >
                {dayState.dailyLossBudgetLeftPct.toFixed(2)}%
              </dd>
            </div>
          </dl>
          <Link
            to="/app/journal"
            onClick={onNavigate}
            className="press focus-ring mt-4 flex flex-col items-center gap-2 rounded-control py-2 text-sm font-medium text-accent"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-[var(--ds-accent)]">
              <Plus className="h-5 w-5" aria-hidden="true" />
            </span>
            Log a Trade
          </Link>
          <p className="mt-3 text-xs leading-relaxed text-text-faint">
            The journal is saved to your account, so it follows you to any browser. Keep a copy
            under Account. The daily stop is {RISK_RULES.dailyLossLimitPct}%.
          </p>
        </div>
      </nav>

      <div className="space-y-0.5 px-6 pb-5 pt-2">
        <Link to="/" onClick={onNavigate} className={cn(ROW, QUIET)}>
          <ArrowLeft className="h-5 w-5 shrink-0" aria-hidden="true" />
          Back to Site
        </Link>
        <button
          type="button"
          onClick={handleSignOut}
          className={cn(
            ROW,
            'w-full font-medium text-text-muted [@media(hover:hover)]:hover:bg-[var(--ds-neutral-soft)] [@media(hover:hover)]:hover:text-danger'
          )}
        >
          <LogOut className="h-5 w-5 shrink-0" aria-hidden="true" />
          Sign Out
        </button>
        <p className="px-5 pt-2 text-xs leading-relaxed text-text-faint">{COMPLIANCE.short}</p>
      </div>
    </aside>
  )
}
