import { Check, ShieldCheck, Target, TrendingDown, Scale, CalendarClock, Award } from 'lucide-react'
import { PageContainer, PageSection } from '../components/layout/PageContainer'
import PageHeader from '../components/ui/PageHeader'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import ChangeIndicator from '../components/ui/ChangeIndicator'
import EquityCurveChart from '../components/ui/EquityCurveChart'
import ChartInView from '../components/charts/ChartInView'
import { account, activityFeed, propFirm, generateEquityCurve } from '../data/mockData'
import { cn } from '../lib/cn'
import { formatCurrency, signedColor } from '../lib/format'

const equityCurve = generateEquityCurve()

const TIER_FEATURES = [
  'Daily 9-section briefing — morning + PM editions',
  'Full SMC structure engine (BOS / CHoCH / OTE)',
  'Live read on XAUUSD, NAS100, US30, SP500',
  'Watch-only feed for USDJPY, NZDUSD, NZDJPY',
  'Journal with R:R, expectancy, and prop-firm view',
]

function DetailRow({ label, value, valueClassName }) {
  return (
    <div className="flex items-center justify-between border-b border-border py-3 last:border-b-0">
      <span className="text-sm text-text-muted">{label}</span>
      <span className={cn('font-mono text-sm tabular-nums text-text', valueClassName)}>{value}</span>
    </div>
  )
}

function PerformanceMetric({ label, value, changePct }) {
  return (
    <div className="rounded-lg border border-border bg-surface-2/40 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-text-faint">{label}</p>
      <p className={cn('mt-2 font-mono text-xl font-semibold tabular-nums', signedColor(value))}>
        {formatCurrency(value, { signed: true })}
      </p>
      <ChangeIndicator value={changePct} size="sm" className="mt-1" />
    </div>
  )
}

/** Generic progress bar tile used by the prop-firm panel. */
function ProgressTile({ label, icon: Icon, current, target, currency = true, formatter, intent = 'accent', sub }) {
  const pct = Math.max(0, Math.min(100, (current / target) * 100))
  const formatValue = formatter ?? ((value) => formatCurrency(Math.abs(value), { signed: false }))
  const barClass =
    intent === 'danger'
      ? 'bg-danger'
      : intent === 'warning'
        ? 'bg-warning'
        : 'bg-[var(--ds-accent-face)]'
  return (
    <div className="rounded-lg border border-border bg-surface-2/40 p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-text-faint">
          <Icon className="h-3.5 w-3.5" aria-hidden="true" />
          {label}
        </span>
        <span className="font-mono text-xs tabular-nums text-text-muted">{pct.toFixed(0)}%</span>
      </div>
      <p className="mt-2 font-mono text-xl font-semibold tabular-nums text-text">
        {currency ? formatValue(current) : current}
        <span className="ml-1.5 text-sm font-medium text-text-faint">
          / {currency ? formatValue(target) : target}
        </span>
      </p>
      <div
        className="mt-3 h-2 overflow-hidden rounded-full bg-surface-2"
        role="meter"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        <div className={cn('h-full rounded-full transition-all duration-500 ease-out', barClass)} style={{ width: `${pct}%` }} />
      </div>
      {sub && <p className="mt-2 text-xs text-text-faint">{sub}</p>}
    </div>
  )
}

/**
 * Prop-firm tracking panel — trailing + static drawdown, profit-target
 * progress, the consistency rule (no single day > 30% of total profit), and
 * the trading-day minimum.
 */
function PropFirmCard() {
  const profitTargetPct = (propFirm.profitMade / propFirm.profitTarget) * 100
  const consistencyShare = propFirm.profitMade > 0 ? (propFirm.bestDayPnl / propFirm.profitMade) * 100 : 0
  const consistencyExceeded = consistencyShare > propFirm.consistencyRulePct
  const trailingBuffer = propFirm.currentBalance - propFirm.trailingDrawdownLevel
  const staticBuffer = propFirm.currentBalance - propFirm.staticDrawdownLevel
  const trailingUsed = Math.max(0, propFirm.trailingHighWaterMark - propFirm.currentBalance)

  return (
    <Card
      title="Prop firm evaluation"
      action={
        <div className="flex items-center gap-2">
          <Badge variant="accent">{propFirm.programName}</Badge>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs text-text-faint">Firm</p>
            <p className="font-medium text-text">{propFirm.firmName}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-text-faint">Evaluation deadline</p>
            <p className="font-mono text-text">{propFirm.evaluationDeadline}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <ProgressTile
            label="Profit target"
            icon={Target}
            current={propFirm.profitMade}
            target={propFirm.profitTarget}
            sub={`${profitTargetPct.toFixed(0)}% complete · ${formatCurrency(propFirm.profitTarget - propFirm.profitMade)} to go`}
          />
          <ProgressTile
            label="Days traded"
            icon={CalendarClock}
            current={propFirm.daysTraded}
            target={propFirm.minDaysRequired}
            currency={false}
            formatter={(value) => `${value} days`}
            intent={propFirm.daysTraded >= propFirm.minDaysRequired ? 'accent' : 'warning'}
            sub={propFirm.daysTraded >= propFirm.minDaysRequired ? 'Minimum met.' : `${propFirm.minDaysRequired - propFirm.daysTraded} more required`}
          />
          <ProgressTile
            label="Trailing drawdown used"
            icon={TrendingDown}
            current={trailingUsed}
            target={propFirm.trailingDrawdown}
            intent={trailingUsed / propFirm.trailingDrawdown > 0.6 ? 'danger' : 'accent'}
            sub={`Floor at ${formatCurrency(propFirm.trailingDrawdownLevel)} · buffer ${formatCurrency(trailingBuffer)}`}
          />
          <ProgressTile
            label="Static drawdown buffer"
            icon={Scale}
            current={Math.max(0, propFirm.staticDrawdown - staticBuffer)}
            target={propFirm.staticDrawdown}
            intent={staticBuffer < propFirm.staticDrawdown * 0.4 ? 'warning' : 'accent'}
            sub={`Hard floor at ${formatCurrency(propFirm.staticDrawdownLevel)} · buffer ${formatCurrency(staticBuffer)}`}
          />
        </div>

        <div
          className={cn(
            'flex items-start gap-3 rounded-lg border px-4 py-3',
            consistencyExceeded
              ? 'border-warning/40 bg-[var(--ds-warning-soft)]/40'
              : 'border-border bg-surface-2/40',
          )}
        >
          <Award
            className={cn('mt-0.5 h-4 w-4 shrink-0', consistencyExceeded ? 'text-warning' : 'text-accent-bright')}
            aria-hidden="true"
          />
          <div className="flex-1 leading-tight">
            <p className="text-sm font-medium text-text">Consistency rule</p>
            <p className="text-xs text-text-muted">
              No single trading day may contribute more than <span className="font-mono">{propFirm.consistencyRulePct}%</span> of total profit.
              Best day so far — <span className="font-mono">{formatCurrency(propFirm.bestDayPnl)}</span> ({consistencyShare.toFixed(1)}% of total).
            </p>
          </div>
          <Badge variant={consistencyExceeded ? 'warning' : 'positive'}>
            {consistencyExceeded ? 'Review' : 'On track'}
          </Badge>
        </div>
      </div>
    </Card>
  )
}

export default function AccountPage() {
  return (
    <PageContainer>
      <PageSection>
        <PageHeader title="Account" subtitle={`${account.holder} · ${account.server}`} />
      </PageSection>

      <PageSection>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card title="Account summary" className="lg:col-span-2">
            <div className="grid grid-cols-1 gap-x-8 sm:grid-cols-2">
              <div>
                <DetailRow label="Account number" value={account.accountNumber} />
                <DetailRow label="Holder name" value={account.holder} />
                <DetailRow label="Server" value={account.server} />
              </div>
              <div>
                <DetailRow label="Account type" value={account.accountType} />
                <DetailRow label="Leverage" value={account.leverage} />
                <DetailRow label="Currency" value={account.currency} />
              </div>
            </div>
          </Card>

          <Card title="Subscription">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-md bg-[var(--ds-accent-soft)] text-accent-bright">
                <ShieldCheck className="h-5 w-5" aria-hidden="true" />
              </span>
              <Badge variant="accent">Root &amp; Rise · $99/mo</Badge>
            </div>
            <ul className="mt-4 space-y-2.5">
              {TIER_FEATURES.map((feature) => (
                <li key={feature} className="flex items-start gap-2.5 text-sm text-text-muted">
                  <Check className="h-4 w-4 shrink-0 text-accent-bright" aria-hidden="true" />
                  {feature}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </PageSection>

      <PageSection>
        <PropFirmCard />
      </PageSection>

      <PageSection>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card title="Balance & equity">
            <DetailRow label="Balance" value={formatCurrency(account.balance)} />
            <DetailRow label="Equity" value={formatCurrency(account.equity)} valueClassName="text-positive" />
            <DetailRow label="Margin" value={formatCurrency(account.margin)} />
            <DetailRow label="Free margin" value={formatCurrency(account.freeMargin)} />
            <DetailRow
              label="Margin level"
              value={`${account.marginLevel.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`}
              valueClassName="text-positive"
            />
          </Card>

          <Card title="Performance">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <PerformanceMetric label="Today" value={account.todayPnl} changePct={account.todayPnlPct} />
              <PerformanceMetric label="This week" value={account.weekPnl} changePct={account.weekPnlPct} />
              <PerformanceMetric label="This month" value={account.monthPnl} changePct={account.monthPnlPct} />
            </div>
          </Card>
        </div>
      </PageSection>

      <PageSection>
        <Card title="Equity curve" action={<span className="text-xs text-text-faint">Last 30 days</span>}>
          <ChartInView height={300}>
            {() => <EquityCurveChart data={equityCurve} height={300} showYAxis />}
          </ChartInView>
        </Card>
      </PageSection>

      <PageSection>
        <Card title="Recent activity" action={<span className="text-xs text-text-faint">Last 5 events</span>}>
          <ul className="space-y-1">
            {activityFeed.map((entry) => (
              <li
                key={entry.id}
                className="flex items-center justify-between gap-4 rounded-md px-2.5 py-2.5 transition-colors hover:bg-surface-2"
              >
                <div className="flex items-center gap-3">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent-bright" aria-hidden="true" />
                  <span className="text-sm text-text">{entry.message}</span>
                </div>
                <time className="shrink-0 font-mono text-xs text-text-faint">{entry.time}</time>
              </li>
            ))}
          </ul>
        </Card>
      </PageSection>
    </PageContainer>
  )
}
