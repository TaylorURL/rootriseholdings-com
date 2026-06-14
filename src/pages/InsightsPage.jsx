import { useMemo } from 'react'
import { TrendingUp, TrendingDown, Zap, Target, ShieldAlert, Clock } from 'lucide-react'
import { PageContainer, PageSection } from '../components/layout/PageContainer'
import PageHeader from '../components/ui/PageHeader'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import KpiCard from '../components/ui/KpiCard'
import Table from '../components/ui/Table'
import { insights, marketSentiment } from '../data/mockData'
import { cn } from '../lib/cn'
import { formatPrice } from '../lib/format'

const STRENGTH_ORDER = { strong: 0, moderate: 1, weak: 2 }

const STRENGTH_BAR_CLASS = {
  strong: 'bg-accent',
  moderate: 'bg-[var(--ds-warning,#f59e0b)]',
  weak: 'bg-[var(--ds-text-subtle)]',
}

function sortByStrength(signals) {
  return [...signals].sort((a, b) => STRENGTH_ORDER[a.strength] - STRENGTH_ORDER[b.strength])
}

/** Inline pill for static metadata (R/R, timeframe). */
function MetaChip({ children, icon: Icon }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-surface-2 px-2 py-0.5 text-xs font-medium text-text-muted">
      {Icon && <Icon className="h-3 w-3" aria-hidden="true" />}
      {children}
    </span>
  )
}

/** Single trading signal rendered inside a column card. */
function SignalRow({ signal }) {
  const isSell = signal.direction === 'SELL'
  const barClass = isSell ? 'bg-danger' : STRENGTH_BAR_CLASS[signal.strength]

  return (
    <div className="rounded-lg border border-border bg-surface-2/40 p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="font-mono text-base font-bold text-text">{signal.pair}</span>
          <Badge variant={isSell ? 'sell' : 'buy'}>{signal.direction}</Badge>
        </div>
        <div className="text-right">
          <p className="text-accent font-bold text-lg leading-none">{signal.confidence}%</p>
          <p className="mt-1 text-text-faint text-xs">confidence</p>
        </div>
      </div>

      <div
        className="h-1.5 overflow-hidden rounded-full bg-surface-2"
        role="meter"
        aria-valuenow={signal.confidence}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${signal.pair} confidence`}
      >
        <div
          className={cn('h-full rounded-full transition-[width] duration-500 ease-out', barClass)}
          style={{ width: `${signal.confidence}%` }}
        />
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
        <div className="flex items-center gap-1">
          <span className="text-text-faint">Entry</span>
          <span className="font-mono text-sm text-text">{formatPrice(signal.entry, signal.pair)}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-text-faint">Target</span>
          <span className="font-mono text-sm text-positive">{formatPrice(signal.target, signal.pair)}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-text-faint">SL</span>
          <span className="font-mono text-sm text-danger">{formatPrice(signal.stopLoss, signal.pair)}</span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <MetaChip icon={Target}>RR {signal.rrRatio.toFixed(2)}</MetaChip>
        <MetaChip icon={Clock}>{signal.timeframe}</MetaChip>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {signal.catalysts.map((catalyst) => (
          <span
            key={catalyst}
            className="rounded-full bg-surface-2 px-2 py-0.5 text-xs text-text-muted"
          >
            {catalyst}
          </span>
        ))}
      </div>
    </div>
  )
}

/** Single sentiment read rendered as a label plus a colored verdict pill. */
function SentimentGauge({ label, value, tone }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface-2/40 px-4 py-3">
      <span className="text-sm text-text-muted">{label}</span>
      <Badge variant={tone}>{value}</Badge>
    </div>
  )
}

/** Column card grouping signals of a single direction. */
function SignalColumn({ title, signals, action }) {
  return (
    <Card title={title} action={action}>
      {signals.length === 0 ? (
        <p className="py-6 text-center text-sm text-text-faint">No signals in this direction right now.</p>
      ) : (
        <div className="space-y-3">
          {signals.map((signal) => (
            <SignalRow key={signal.id} signal={signal} />
          ))}
        </div>
      )}
    </Card>
  )
}

export default function InsightsPage() {
  const buySignals = useMemo(() => sortByStrength(insights.filter((s) => s.direction === 'BUY')), [])
  const sellSignals = useMemo(() => sortByStrength(insights.filter((s) => s.direction === 'SELL')), [])
  const strongCount = useMemo(() => insights.filter((s) => s.strength === 'strong').length, [])

  const overviewColumns = [
    { key: 'pair', header: 'Pair', render: (row) => <span className="font-mono font-medium text-text">{row.pair}</span> },
    {
      key: 'direction',
      header: 'Direction',
      render: (row) => <Badge variant={row.direction === 'BUY' ? 'buy' : 'sell'}>{row.direction}</Badge>,
    },
    {
      key: 'timeframe',
      header: 'Timeframe',
      render: (row) => <span className="font-mono text-text-muted">{row.timeframe}</span>,
    },
    {
      key: 'confidence',
      header: 'Confidence',
      align: 'right',
      render: (row) => <span className="font-mono font-semibold tabular-nums text-accent">{row.confidence}%</span>,
    },
    {
      key: 'rrRatio',
      header: 'R/R',
      align: 'right',
      render: (row) => <span className="font-mono tabular-nums text-text">{row.rrRatio.toFixed(2)}</span>,
    },
    {
      key: 'target',
      header: 'Target',
      align: 'right',
      render: (row) => <span className="font-mono tabular-nums text-positive">{formatPrice(row.target, row.pair)}</span>,
    },
    {
      key: 'stopLoss',
      header: 'SL',
      align: 'right',
      render: (row) => <span className="font-mono tabular-nums text-danger">{formatPrice(row.stopLoss, row.pair)}</span>,
    },
    {
      key: 'catalysts',
      header: 'Catalysts',
      render: (row) => {
        const [first, ...rest] = row.catalysts
        return (
          <span className="text-text-muted">
            <span className="text-text">{first}</span>
            {rest.length > 0 && <span className="text-text-faint"> +{rest.length} more</span>}
          </span>
        )
      },
    },
  ]

  return (
    <PageContainer>
      <PageSection>
        <PageHeader
          title="Insights"
          subtitle="Model-generated trade signals across 14 pairs"
          action={
            <span className="rounded-md border border-border bg-surface-2 px-3 py-1.5 text-xs text-text-muted">
              Signals refreshed · 14 Jun 2026, 09:30 UTC
            </span>
          }
        />
      </PageSection>

      <PageSection>
        <Card title="Market Sentiment" action={<span className="text-xs text-text-faint">Aggregate read</span>}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {marketSentiment.map((entry) => (
              <SentimentGauge key={entry.id} label={entry.label} value={entry.value} tone={entry.tone} />
            ))}
          </div>
        </Card>
      </PageSection>

      <PageSection>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard label="Total Signals" value={insights.length} icon={Zap} changeLabel="active now" />
          <KpiCard label="Strong Signals" value={strongCount} icon={ShieldAlert} changeLabel="high conviction" />
          <KpiCard label="Buy Signals" value={buySignals.length} icon={TrendingUp} changeLabel="active now" />
          <KpiCard label="Sell Signals" value={sellSignals.length} icon={TrendingDown} changeLabel="active now" />
        </div>
      </PageSection>

      <PageSection>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <SignalColumn
            title="BUY Signals"
            signals={buySignals}
            action={<span className="text-xs text-text-faint">{buySignals.length} active</span>}
          />
          <SignalColumn
            title="SELL Signals"
            signals={sellSignals}
            action={<span className="text-xs text-text-faint">{sellSignals.length} active</span>}
          />
        </div>
      </PageSection>

      <PageSection>
        <Card title="Signal Overview" padded={false}>
          <Table columns={overviewColumns} rows={insights} empty="No signals available." />
          <p className="border-t border-border px-5 py-3 text-xs text-text-faint">
            Signals are model-generated for demonstration purposes only and do not constitute financial advice.
          </p>
        </Card>
      </PageSection>
    </PageContainer>
  )
}
