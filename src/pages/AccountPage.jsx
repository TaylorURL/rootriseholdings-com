import { Check, ShieldCheck } from 'lucide-react'
import { PageContainer, PageSection } from '../components/layout/PageContainer'
import PageHeader from '../components/ui/PageHeader'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import ChangeIndicator from '../components/ui/ChangeIndicator'
import EquityCurveChart from '../components/ui/EquityCurveChart'
import { account, activityFeed, generateEquityCurve } from '../data/mockData'
import { cn } from '../lib/cn'
import { formatCurrency, signedColor } from '../lib/format'

const equityCurve = generateEquityCurve()

const TIER_FEATURES = [
  'Raw spreads from 0.0 pips',
  'Dedicated account manager',
  'Priority execution',
  'Access to all 14 pairs',
]

/** Key/value row used across the account detail panels. */
function DetailRow({ label, value, valueClassName }) {
  return (
    <div className="flex items-center justify-between border-b border-border py-3 last:border-b-0">
      <span className="text-sm text-text-muted">{label}</span>
      <span className={cn('font-mono text-sm tabular-nums text-text', valueClassName)}>{value}</span>
    </div>
  )
}

/** Performance metric tile with amount and percentage badge. */
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

export default function AccountPage() {
  return (
    <PageContainer>
      <PageSection>
        <PageHeader title="Account" subtitle={`${account.holder} · ${account.server}`} />
      </PageSection>

      <PageSection>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card title="Account Summary" className="lg:col-span-2">
            <div className="grid grid-cols-1 gap-x-8 sm:grid-cols-2">
              <div>
                <DetailRow label="Account Number" value={account.accountNumber} />
                <DetailRow label="Holder Name" value={account.holder} />
                <DetailRow label="Server" value={account.server} />
              </div>
              <div>
                <DetailRow label="Account Type" value={account.accountType} />
                <DetailRow label="Leverage" value={account.leverage} />
                <DetailRow label="Currency" value={account.currency} />
              </div>
            </div>
          </Card>

          <Card title="Account Tier">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-md bg-[var(--ds-accent-soft)] text-accent-bright">
                <ShieldCheck className="h-5 w-5" aria-hidden="true" />
              </span>
              <Badge variant="accent">{account.accountType}</Badge>
            </div>
            <ul className="mt-4 space-y-2.5">
              {TIER_FEATURES.map((feature) => (
                <li key={feature} className="flex items-center gap-2.5 text-sm text-text-muted">
                  <Check className="h-4 w-4 shrink-0 text-accent-bright" aria-hidden="true" />
                  {feature}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </PageSection>

      <PageSection>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card title="Balance & Equity">
            <DetailRow label="Balance" value={formatCurrency(account.balance)} />
            <DetailRow label="Equity" value={formatCurrency(account.equity)} valueClassName="text-positive" />
            <DetailRow label="Margin" value={formatCurrency(account.margin)} />
            <DetailRow label="Free Margin" value={formatCurrency(account.freeMargin)} />
            <DetailRow
              label="Margin Level"
              value={`${account.marginLevel.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`}
              valueClassName="text-positive"
            />
          </Card>

          <Card title="Performance">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <PerformanceMetric label="Today" value={account.todayPnl} changePct={account.todayPnlPct} />
              <PerformanceMetric label="This Week" value={account.weekPnl} changePct={account.weekPnlPct} />
              <PerformanceMetric label="This Month" value={account.monthPnl} changePct={account.monthPnlPct} />
            </div>
          </Card>
        </div>
      </PageSection>

      <PageSection>
        <Card title="Equity Curve" action={<span className="text-xs text-text-faint">Last 30 days</span>}>
          <EquityCurveChart data={equityCurve} height={300} showYAxis />
        </Card>
      </PageSection>

      <PageSection>
        <Card title="Recent Activity" action={<span className="text-xs text-text-faint">Last 5 events</span>}>
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
