import { OctagonAlert, ShieldCheck, Sparkles, TrendingDown } from 'lucide-react'
import { RISK_RULES } from '../../data/riskRules'
import { cn } from '../../lib/cn'
import { formatCurrency } from '../../lib/format'
import { useJournal } from '../../context/JournalContext'

function StatChip({ icon: Icon, label, value, tone }) {
  return (
    <span
      className={cn(
        'bg-surface-2/60 inline-flex items-center gap-1.5 rounded-control border border-border px-2.5 py-1 text-xs',
        tone === 'warning' && 'border-warning/40 text-warning',
        tone === 'danger' && 'border-danger/50 text-danger'
      )}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      <span className="text-text-faint">{label}</span>
      <span className="font-mono font-semibold tabular-nums text-text">{value}</span>
    </span>
  )
}

/**
 * Live rule-book status. Locked days render as a hard banner with the exact
 * reasons; open days render the running budgets, so the state of the desk is
 * visible before any trade is drafted.
 */
export default function DayStateBanner() {
  const { dayState, equity } = useJournal()

  if (dayState.locked) {
    return (
      <div
        className="border-danger/50 rounded-card border bg-[var(--ds-danger-soft)] p-4"
        role="alert"
      >
        <div className="flex items-center gap-2.5">
          <OctagonAlert className="h-5 w-5 shrink-0 text-danger" aria-hidden="true" />
          <p className="text-sm font-semibold text-text">Desk closed for the day</p>
        </div>
        <ul className="mt-2 space-y-1 pl-8">
          {dayState.lockouts.map((lockout) => (
            <li key={lockout.id} className="text-sm text-text-muted">
              <span className="font-medium text-text">{lockout.label}.</span> {lockout.detail}
            </li>
          ))}
        </ul>
        <p className="mt-2 pl-8 text-xs text-text-faint">
          New entries unlock at the next CT trading day.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-card border border-border bg-surface px-4 py-3 shadow-sm">
      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-text">
        <ShieldCheck className="h-4 w-4 text-positive" aria-hidden="true" />
        Desk open
      </span>
      <span className="text-text-faint">·</span>
      <StatChip
        icon={TrendingDown}
        label="Loss Budget"
        value={`${dayState.dailyLossBudgetLeftPct.toFixed(2)}%`}
        tone={
          dayState.dailyLossBudgetLeftPct < RISK_RULES.dailyLossLimitPct / 2 ? 'warning' : undefined
        }
      />
      <StatChip
        icon={Sparkles}
        label="A+ Left"
        value={`${dayState.aPlusLeft}/${RISK_RULES.maxAPlusSetupsPerDay}`}
        tone={dayState.aPlusCapHit ? 'warning' : undefined}
      />
      <StatChip
        icon={OctagonAlert}
        label="Loss Streak"
        value={`${dayState.consecutiveLosses}/${RISK_RULES.maxConsecutiveLosses}`}
        tone={dayState.consecutiveLosses >= 1 ? 'warning' : undefined}
      />
      {equity != null && (
        <span className="ml-auto font-mono text-xs tabular-nums text-text-faint">
          Equity {formatCurrency(equity)} · 1R at 1% = {formatCurrency(equity / 100)}
        </span>
      )}
    </div>
  )
}
