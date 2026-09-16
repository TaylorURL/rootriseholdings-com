import Card from '../ui/Card'
import Badge from '../ui/Badge'
import { RULE_LABEL } from '../ui/Figures'
import { RISK_RULES } from '../../data/riskRules'
import { cn } from '../../lib/cn'
import { formatCurrency } from '../../lib/format'
import { useJournal } from '../../context/JournalContext'

/**
 * One budget as a labelled meter.
 *
 * The bar fills toward the limit, so a reader sees how close the day is to
 * closing before reading a number. It turns amber past half and red at the
 * limit - the same thresholds the rule book acts on - and the figure beside it
 * says the used amount against the whole, never a bare percentage of a
 * percentage.
 */
function Meter({ label, used, limit, format, title }) {
  const share = limit > 0 ? Math.min(1, Math.max(0, used / limit)) : 0
  const tone = share >= 1 ? 'danger' : share >= 0.5 ? 'warning' : 'accent'
  return (
    <div title={title}>
      <div className="flex items-baseline justify-between gap-3">
        <span className={RULE_LABEL}>{label}</span>
        <span className="text-xs tabular-nums text-text-faint">
          <span className="font-semibold text-text">{format(used)}</span> of {format(limit)}
        </span>
      </div>
      <div
        className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-3"
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={limit}
        aria-valuenow={Math.min(used, limit)}
      >
        <div
          className={cn(
            'h-full rounded-full transition-[width] duration-300 ease-out',
            tone === 'danger' && 'bg-danger',
            tone === 'warning' && 'bg-warning',
            tone === 'accent' && 'bg-[var(--ds-accent-fill)]'
          )}
          style={{ width: `${share * 100}%` }}
        />
      </div>
    </div>
  )
}

const pct = (value) => `${value.toFixed(2)}%`
const count = (value) => String(value)

/**
 * The day's rule book as a panel: whether the desk may trade, and how close
 * each budget is to closing it.
 *
 * A locked day lists the exact reasons in place of the meters, because a wall
 * is read differently from a reading.
 */
export default function DayStatusPanel({ className }) {
  const { dayState, equity } = useJournal()
  const lossUsed = Math.abs(Math.min(0, dayState.dailyLossPct))

  return (
    <Card
      title="Day Status"
      subtitle="Today's trading against the risk rules"
      className={className}
      action={
        dayState.locked ? (
          <Badge variant="danger" dot>
            Closed
          </Badge>
        ) : (
          <Badge variant="positive" dot>
            Open
          </Badge>
        )
      }
      bodyClassName="space-y-4"
    >
      {dayState.locked ? (
        <ul className="space-y-2" role="alert">
          {dayState.lockouts.map((lockout) => (
            <li key={lockout.id} className="text-[13px] text-text-muted">
              <span className="font-medium text-text">{lockout.label}.</span> {lockout.detail}
            </li>
          ))}
          <li className="text-xs text-text-faint">
            New entries unlock at the next CT trading day.
          </li>
        </ul>
      ) : null}

      <Meter
        label="Daily Loss Used"
        used={lossUsed}
        limit={RISK_RULES.dailyLossLimitPct}
        format={pct}
        title={`Realized loss today against the ${RISK_RULES.dailyLossLimitPct}% daily stop`}
      />
      <Meter
        label="A+ Setups Taken"
        used={dayState.aPlusUsed}
        limit={RISK_RULES.maxAPlusSetupsPerDay}
        format={count}
      />
      <Meter
        label="Loss Streak"
        used={dayState.consecutiveLosses}
        limit={RISK_RULES.maxConsecutiveLosses}
        format={count}
        title={`Consecutive losses. ${RISK_RULES.maxConsecutiveLosses} in a row closes the day.`}
      />

      <dl className="grid grid-cols-2 gap-3 border-t border-border pt-4">
        <div>
          <dt className={RULE_LABEL}>Open Risk</dt>
          <dd className="mt-0.5 text-sm font-semibold tabular-nums text-text">
            {pct(dayState.openRiskPct)}
          </dd>
        </div>
        <div>
          <dt className={RULE_LABEL}>1R at {RISK_RULES.maxRiskPerTradePct}%</dt>
          <dd className="mt-0.5 text-sm font-semibold tabular-nums text-text">
            {equity != null
              ? formatCurrency((equity * RISK_RULES.maxRiskPerTradePct) / 100)
              : 'Not set'}
          </dd>
        </div>
      </dl>
    </Card>
  )
}
