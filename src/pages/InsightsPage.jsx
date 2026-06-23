import { useMemo } from 'react'
import { TrendingUp, TrendingDown, Sparkles, Target, ShieldAlert, Clock, Cpu } from 'lucide-react'
import { PageContainer, PageSection } from '../components/layout/PageContainer'
import PageHeader from '../components/ui/PageHeader'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import KpiCard from '../components/ui/KpiCard'
import Table from '../components/ui/Table'
import DailyBriefing from '../components/ui/DailyBriefing'
import { insights, marketSentiment } from '../data/mockData'
import { RISK_RULES, SETUP_TYPES } from '../data/riskRules'
import { INSTRUMENT_META } from '../data/instruments'
import { cn } from '../lib/cn'
import { formatInstrumentPrice } from '../lib/format'

const SETUP_TO_DETAIL = SETUP_TYPES.reduce((map, setup) => {
  map[setup.id] = setup
  return map
}, {})

/** Inline pill for setup / timeframe / session metadata. */
function MetaChip({ children, icon: Icon }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-surface-2 px-2 py-0.5 text-xs font-medium text-text-muted">
      {Icon && <Icon className="h-3 w-3" aria-hidden="true" />}
      {children}
    </span>
  )
}

/** Card for a single SMC signal. */
function SignalRow({ signal }) {
  const isSell = signal.direction === 'SELL'
  const barClass = signal.isAPlus ? 'bg-accent' : isSell ? 'bg-danger/80' : 'bg-positive/80'
  const setupDetail = SETUP_TO_DETAIL[signal.setup]
  const display = INSTRUMENT_META[signal.symbol]?.displaySymbol ?? signal.symbol

  return (
    <div className="rounded-lg border border-border bg-surface-2/40 p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="font-mono text-base font-bold text-text">{display}</span>
          <Badge variant={isSell ? 'sell' : 'buy'}>{signal.direction}</Badge>
          {signal.isAPlus && (
            <span className="inline-flex items-center gap-1 rounded-md bg-[var(--ds-accent-soft)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-accent-bright">
              <Sparkles className="h-3 w-3" aria-hidden="true" />
              A+
            </span>
          )}
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
        aria-label={`${signal.symbol} confidence`}
      >
        <div
          className={cn('h-full rounded-full transition-[width] duration-500 ease-out', barClass)}
          style={{ width: `${signal.confidence}%` }}
        />
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
        <div className="flex items-center gap-1">
          <span className="text-text-faint">Entry</span>
          <span className="font-mono text-sm text-text">{formatInstrumentPrice(signal.entry, signal.symbol)}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-text-faint">Target</span>
          <span className="font-mono text-sm text-positive">{formatInstrumentPrice(signal.target, signal.symbol)}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-text-faint">Stop</span>
          <span className="font-mono text-sm text-danger">{formatInstrumentPrice(signal.stopLoss, signal.symbol)}</span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <MetaChip icon={Target}>{signal.setup} · {setupDetail?.longLabel}</MetaChip>
        <MetaChip icon={Clock}>{signal.timeframe}</MetaChip>
        <MetaChip>{signal.session}</MetaChip>
        <MetaChip>R:R {signal.rrRatio.toFixed(2)}</MetaChip>
      </div>

      <p className="text-xs leading-relaxed text-text-muted">{signal.rationale}</p>

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

function SentimentGauge({ label, value, tone }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface-2/40 px-4 py-3">
      <span className="text-sm text-text-muted">{label}</span>
      <Badge variant={tone}>{value}</Badge>
    </div>
  )
}

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
  const sortedSignals = useMemo(
    () => [...insights].sort((a, b) => (b.isAPlus - a.isAPlus) || (b.confidence - a.confidence)),
    [],
  )
  const buySignals = useMemo(() => sortedSignals.filter((s) => s.direction === 'BUY'), [sortedSignals])
  const sellSignals = useMemo(() => sortedSignals.filter((s) => s.direction === 'SELL'), [sortedSignals])
  const aPlusSignals = useMemo(() => sortedSignals.filter((s) => s.isAPlus), [sortedSignals])

  const overviewColumns = [
    {
      key: 'symbol',
      header: 'Instrument',
      render: (row) => (
        <span className="flex items-center gap-2">
          <span className="font-mono font-medium text-text">
            {INSTRUMENT_META[row.symbol]?.displaySymbol ?? row.symbol}
          </span>
          {row.isAPlus && (
            <span className="inline-flex items-center gap-1 rounded-md bg-[var(--ds-accent-soft)] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-accent-bright">
              A+
            </span>
          )}
        </span>
      ),
    },
    {
      key: 'direction',
      header: 'Side',
      render: (row) => <Badge variant={row.direction === 'BUY' ? 'buy' : 'sell'}>{row.direction}</Badge>,
    },
    {
      key: 'setup',
      header: 'Setup',
      render: (row) => <span className="font-mono text-text">{row.setup}</span>,
    },
    {
      key: 'session',
      header: 'Session',
      render: (row) => <span className="text-text-muted">{row.session}</span>,
    },
    {
      key: 'timeframe',
      header: 'TF',
      render: (row) => <span className="font-mono text-text-muted">{row.timeframe}</span>,
    },
    {
      key: 'confidence',
      header: 'Conf.',
      align: 'right',
      render: (row) => <span className="font-mono font-semibold tabular-nums text-accent">{row.confidence}%</span>,
    },
    {
      key: 'rrRatio',
      header: 'R:R',
      align: 'right',
      render: (row) => (
        <span
          className={cn(
            'font-mono tabular-nums',
            row.rrRatio >= RISK_RULES.minRewardToRisk ? 'text-text' : 'text-text-faint',
          )}
        >
          {row.rrRatio.toFixed(2)}
        </span>
      ),
    },
    {
      key: 'target',
      header: 'Target',
      align: 'right',
      render: (row) => <span className="font-mono tabular-nums text-positive">{formatInstrumentPrice(row.target, row.symbol)}</span>,
    },
    {
      key: 'stopLoss',
      header: 'Stop',
      align: 'right',
      render: (row) => <span className="font-mono tabular-nums text-danger">{formatInstrumentPrice(row.stopLoss, row.symbol)}</span>,
    },
  ]

  return (
    <PageContainer>
      <PageSection>
        <PageHeader
          title="Insights"
          subtitle="SMC structure engine · BOS / CHoCH / OTE setups across the four traded charts"
          action={
            <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface-2 px-3 py-1.5 text-xs text-text-muted">
              <Cpu className="h-3.5 w-3.5 text-accent-bright" aria-hidden="true" />
              Gemini Market Structure Pro · refreshed 14 Jun 09:30 CT
            </span>
          }
        />
      </PageSection>

      <PageSection>
        <DailyBriefing />
      </PageSection>

      <PageSection>
        <Card title="Market sentiment" action={<span className="text-xs text-text-faint">Composite read</span>}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {marketSentiment.map((entry) => (
              <SentimentGauge key={entry.id} label={entry.label} value={entry.value} tone={entry.tone} />
            ))}
          </div>
        </Card>
      </PageSection>

      <PageSection>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            label="A+ setups"
            value={`${aPlusSignals.length}/${RISK_RULES.maxAPlusSetupsPerDay}`}
            icon={Sparkles}
            changeLabel={`max ${RISK_RULES.maxAPlusSetupsPerDay}/day`}
          />
          <KpiCard label="Active signals" value={insights.length} icon={ShieldAlert} changeLabel="live now" />
          <KpiCard label="Buy bias" value={buySignals.length} icon={TrendingUp} changeLabel="active" />
          <KpiCard label="Sell bias" value={sellSignals.length} icon={TrendingDown} changeLabel="active" />
        </div>
      </PageSection>

      <PageSection>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <SignalColumn
            title="BUY setups"
            signals={buySignals}
            action={<span className="text-xs text-text-faint">{buySignals.length} active</span>}
          />
          <SignalColumn
            title="SELL setups"
            signals={sellSignals}
            action={<span className="text-xs text-text-faint">{sellSignals.length} active</span>}
          />
        </div>
      </PageSection>

      <PageSection>
        <Card title="Signal overview" padded={false}>
          <Table columns={overviewColumns} rows={sortedSignals} empty="No signals available." />
          <p className="border-t border-border px-5 py-3 text-xs text-text-faint">
            Setups are decision-support only — Root &amp; Rise does not execute trades or manage capital.
            A+ tickets are capped at {RISK_RULES.maxAPlusSetupsPerDay} per session to prevent overtrading.
          </p>
        </Card>
      </PageSection>
    </PageContainer>
  )
}
