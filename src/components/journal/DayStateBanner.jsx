import { OctagonAlert, ShieldCheck } from 'lucide-react'
import { RULE_LABEL } from '../ui/Figures'
import { RISK_RULES } from '../../data/riskRules'
import { cn } from '../../lib/cn'
import { formatCurrency } from '../../lib/format'
import { useJournal } from '../../context/JournalContext'

/**
 * One gate, as a label and the figure that decides it. The figure is set in
 * tabular monospace at reading size and the label under the rule treatment, so
 * the number outweighs the word naming it rather than the other way round.
 */
function Gate({ label, value, title, tone }) {
  return (
    <span className="inline-flex items-baseline gap-1.5" title={title}>
      <span className={RULE_LABEL}>{label}</span>
      <span className={cn('font-mono text-sm font-semibold tabular-nums text-text', tone)}>
        {value}
      </span>
    </span>
  )
}

/**
 * Live rule-book status.
 *
 * It answers a yes-or-no question - may the desk trade today - so on an open
 * day it takes one line to do it: the state, then the running budgets that
 * would close it. A locked day keeps the full banner with the exact reasons,
 * because that one is a wall rather than a reading.
 *
 * The equity line carries what a unit of risk is worth as a title rather than
 * as an expression on the line. It is arithmetic a reader is told once, and
 * spelling it out on every screen is what makes a status bar read as a formula.
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
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-card border border-border bg-surface px-4 py-2.5 shadow-sm">
      <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-text">
        <ShieldCheck className="h-4 w-4 text-positive" aria-hidden="true" />
        Desk open
      </span>
      <span className="h-4 w-px shrink-0 bg-border" aria-hidden="true" />
      <Gate
        label="Loss Budget"
        value={`${dayState.dailyLossBudgetLeftPct.toFixed(2)}%`}
        title={`Realized loss left before the ${RISK_RULES.dailyLossLimitPct}% daily stop closes the desk`}
        tone={
          dayState.dailyLossBudgetLeftPct < RISK_RULES.dailyLossLimitPct / 2
            ? 'text-warning'
            : undefined
        }
      />
      <Gate
        label="A+ Left"
        value={`${dayState.aPlusLeft}/${RISK_RULES.maxAPlusSetupsPerDay}`}
        title={`A+ setups still allowed today, of ${RISK_RULES.maxAPlusSetupsPerDay}`}
        tone={dayState.aPlusCapHit ? 'text-warning' : undefined}
      />
      <Gate
        label="Loss Streak"
        value={`${dayState.consecutiveLosses}/${RISK_RULES.maxConsecutiveLosses}`}
        title={`Consecutive losses, of the ${RISK_RULES.maxConsecutiveLosses} that close the day`}
        tone={dayState.consecutiveLosses >= 1 ? 'text-warning' : undefined}
      />
      {/* What one R is worth in money is the figure every other number on this
          banner is denominated in, and it is the one a reader has to have to
          size an order. It is set on the line rather than in a `title`: a hover
          is not a place to keep a fact, because a phone has no hover, and a
          phone is where this is read. The percentage and the money are taken
          from the same rule, so the sentence cannot go on saying one per cent
          after the rule book says something else. */}
      {equity != null && (
        <span className="ml-auto inline-flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
          <span className={RULE_LABEL}>Equity</span>
          <span className="font-mono text-sm tabular-nums text-text-muted">
            {formatCurrency(equity)}
          </span>
          <span className="text-[11px] text-text-muted">
            1R at {RISK_RULES.maxRiskPerTradePct}% is{' '}
            {formatCurrency((equity * RISK_RULES.maxRiskPerTradePct) / 100)}
          </span>
        </span>
      )}
    </div>
  )
}
