import { useMemo } from 'react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { PageContainer, PageSection } from '../components/layout/PageContainer'
import Card from '../components/ui/Card'
import ChangeIndicator from '../components/ui/ChangeIndicator'
import { account, generateEquityCurve } from '../data/mockData'
import { cn } from '../lib/cn'
import { formatCurrency, signedColor } from '../lib/format'

const MARGIN_LEVEL_CEILING = 5000
const AXIS_COLOR = 'var(--ds-text-faint)'

/** Labelled monetary metric row in the account overview panel. */
function OverviewMetric({ label, value, valueClassName }) {
  return (
    <div className="flex items-center justify-between border-b border-border py-3 last:border-b-0">
      <span className="text-sm text-text-muted">{label}</span>
      <span className={cn('font-mono text-sm font-semibold tabular-nums', valueClassName)}>{value}</span>
    </div>
  )
}

/** Performance card showing a P&L value and its percentage change. */
function PerformanceCard({ label, value, changePct }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-5 shadow-sm transition-colors hover:border-border-hover">
      <p className="text-xs font-medium uppercase tracking-wide text-text-faint">{label}</p>
      <p className={cn('mt-2 font-mono text-2xl font-semibold tabular-nums', signedColor(value))}>
        {formatCurrency(value, { signed: true })}
      </p>
      <ChangeIndicator value={changePct} size="sm" className="mt-1" />
    </div>
  )
}

/** Key/value row in the account details panel. */
function DetailRow({ label, value }) {
  return (
    <div className="flex items-center justify-between border-b border-border py-3 last:border-b-0">
      <span className="text-sm text-text-muted">{label}</span>
      <span className="font-mono text-sm text-text">{value}</span>
    </div>
  )
}

/** Equity curve tooltip card. */
function EquityTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const { date, equity } = payload[0].payload
  return (
    <div className="rounded-md border border-border-strong bg-bg-elevated/95 px-3 py-2 shadow-lg backdrop-blur">
      <p className="font-mono text-xs text-text-faint">{date}</p>
      <p className="font-mono text-sm font-semibold tabular-nums text-text">{formatCurrency(equity)}</p>
    </div>
  )
}

export default function AccountPage() {
  const equityCurve = useMemo(() => generateEquityCurve(), [])
  const marginGaugePct = Math.min(100, (account.marginLevel / MARGIN_LEVEL_CEILING) * 100)

  return (
    <PageContainer>
      <PageSection>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card title="Account Overview" className="lg:col-span-2">
            <div className="grid grid-cols-1 gap-x-8 sm:grid-cols-2">
              <div>
                <OverviewMetric label="Balance" value={formatCurrency(account.balance)} />
                <OverviewMetric label="Equity" value={formatCurrency(account.equity)} valueClassName="text-positive" />
                <OverviewMetric label="Margin" value={formatCurrency(account.margin)} />
                <OverviewMetric label="Free Margin" value={formatCurrency(account.freeMargin)} />
              </div>
              <div className="flex flex-col justify-center">
                <div className="mb-2 flex items-baseline justify-between">
                  <span className="text-sm text-text-muted">Margin Level</span>
                  <span className="font-mono text-lg font-semibold tabular-nums text-positive">
                    {account.marginLevel.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%
                  </span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-surface-2" role="meter" aria-valuenow={Math.round(account.marginLevel)} aria-valuemin={0} aria-valuemax={MARGIN_LEVEL_CEILING} aria-label="Margin level">
                  <div className="h-full rounded-full bg-[var(--ds-accent-face)]" style={{ width: `${marginGaugePct}%` }} />
                </div>
                <p className="mt-2 text-xs text-text-faint">
                  Well above the 100% maintenance threshold — no margin call risk.
                </p>
              </div>
            </div>
          </Card>

          <Card title="Account Details">
            <DetailRow label="Account Number" value={account.accountNumber} />
            <DetailRow label="Account Type" value={account.accountType} />
            <DetailRow label="Leverage" value={account.leverage} />
            <DetailRow label="Currency" value={account.currency} />
            <DetailRow label="Server" value={account.server} />
          </Card>
        </div>
      </PageSection>

      <PageSection>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <PerformanceCard label="Today's P&L" value={account.todayPnl} changePct={account.todayPnlPct} />
          <PerformanceCard label="This Week" value={account.weekPnl} changePct={account.weekPnlPct} />
          <PerformanceCard label="This Month" value={account.monthPnl} changePct={account.monthPnlPct} />
        </div>
      </PageSection>

      <PageSection>
        <Card title="Equity Curve" action={<span className="text-xs text-text-faint">Last 30 days</span>}>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={equityCurve} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="equityFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--ds-accent-bright)" stopOpacity={0.28} />
                  <stop offset="100%" stopColor="var(--ds-accent-bright)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="var(--ds-border)" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fill: AXIS_COLOR, fontSize: 11, fontFamily: 'var(--ds-font-mono)' }}
                tickLine={false}
                axisLine={false}
                minTickGap={32}
              />
              <YAxis
                orientation="right"
                domain={['dataMin', 'dataMax']}
                tick={{ fill: AXIS_COLOR, fontSize: 11, fontFamily: 'var(--ds-font-mono)' }}
                tickLine={false}
                axisLine={false}
                width={64}
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip content={<EquityTooltip />} cursor={{ stroke: 'var(--ds-border-strong)' }} />
              <Area
                type="monotone"
                dataKey="equity"
                stroke="var(--ds-accent-bright)"
                strokeWidth={2}
                fill="url(#equityFill)"
                isAnimationActive
                animationDuration={700}
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
      </PageSection>
    </PageContainer>
  )
}
