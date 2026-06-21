import { useMemo, useState } from 'react'
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Hash, Trophy, Percent, Wallet, ArrowUpRight, ArrowDownRight, Calculator, Sparkles } from 'lucide-react'
import ChartInView from '../components/charts/ChartInView'
import { AXIS_TICK } from '../components/charts/chartTheme'
import { PageContainer, PageSection } from '../components/layout/PageContainer'
import PageHeader from '../components/ui/PageHeader'
import Card from '../components/ui/Card'
import Table from '../components/ui/Table'
import Badge from '../components/ui/Badge'
import KpiCard from '../components/ui/KpiCard'
import Select from '../components/ui/Select'
import { ChartTooltipShell } from '../components/ui/ChartTooltip'
import { tradeHistory, monthlyPnl } from '../data/mockData'
import { SETUP_TYPES, SESSIONS, expectancyInR } from '../data/riskRules'
import { INSTRUMENT_META, INSTRUMENTS } from '../data/instruments'
import { cn } from '../lib/cn'
import {
  durationBetween,
  formatCurrency,
  formatInstrumentPrice,
  formatMove,
  formatR,
  signedColor,
} from '../lib/format'

const DATE_RANGE_OPTIONS = [
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: 'ytd', label: 'Year to date' },
]

const TYPE_OPTIONS = [
  { value: 'ALL', label: 'All sides' },
  { value: 'BUY', label: 'Long' },
  { value: 'SELL', label: 'Short' },
]

const INSTRUMENT_OPTIONS = [
  { value: 'ALL', label: 'All instruments' },
  ...INSTRUMENTS.map((entry) => ({ value: entry.symbol, label: entry.displaySymbol })),
]

const SETUP_OPTIONS = [
  { value: 'ALL', label: 'All setups' },
  ...SETUP_TYPES.map((entry) => ({ value: entry.id, label: `${entry.id} — ${entry.longLabel}` })),
]

const SESSION_OPTIONS = [
  { value: 'ALL', label: 'All sessions' },
  ...SESSIONS.map((entry) => ({ value: entry.id, label: entry.label })),
]

/** Aggregate realised trades by instrument for the performance breakdown. */
function buildInstrumentBreakdown(trades) {
  const bySymbol = new Map()
  for (const trade of trades) {
    const entry = bySymbol.get(trade.symbol) ?? { symbol: trade.symbol, trades: 0, pnl: 0, totalR: 0 }
    entry.trades += 1
    entry.pnl += trade.pnl
    entry.totalR += trade.realisedR
    bySymbol.set(trade.symbol, entry)
  }
  return [...bySymbol.values()]
    .map((entry) => ({ ...entry, avgR: entry.totalR / entry.trades }))
    .sort((a, b) => b.pnl - a.pnl)
}

/** Aggregate trades by setup type for the per-setup expectancy panel. */
function buildSetupBreakdown(trades) {
  return SETUP_TYPES.map((setup) => {
    const subset = trades.filter((trade) => trade.setup === setup.id)
    const stats = expectancyInR(subset)
    const pnl = subset.reduce((sum, trade) => sum + trade.pnl, 0)
    return {
      id: setup.id,
      label: setup.label,
      longLabel: setup.longLabel,
      trades: subset.length,
      pnl,
      winRate: stats.winRate,
      expectancy: stats.expectancy,
    }
  }).filter((entry) => entry.trades > 0)
}

/** Aggregate trades by session for the per-session expectancy panel. */
function buildSessionBreakdown(trades) {
  return SESSIONS.map((session) => {
    const subset = trades.filter((trade) => trade.session === session.id)
    const stats = expectancyInR(subset)
    const pnl = subset.reduce((sum, trade) => sum + trade.pnl, 0)
    return {
      id: session.id,
      label: session.label,
      trades: subset.length,
      pnl,
      winRate: stats.winRate,
      expectancy: stats.expectancy,
    }
  }).filter((entry) => entry.trades > 0)
}

/** Custom tooltip for the monthly P&L bar chart. */
function MonthlyTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const { month, pnl } = payload[0].payload
  return (
    <ChartTooltipShell>
      <p className="font-mono text-text-faint">{month} 2026</p>
      <p className={cn('font-mono font-semibold tabular-nums', signedColor(pnl))}>
        {formatCurrency(pnl, { signed: true })}
      </p>
    </ChartTooltipShell>
  )
}

const STATS = (() => {
  const totalPnl = tradeHistory.reduce((sum, trade) => sum + trade.pnl, 0)
  const winners = tradeHistory.filter((trade) => trade.pnl > 0).length
  const best = Math.max(...tradeHistory.map((trade) => trade.pnl))
  const worst = Math.min(...tradeHistory.map((trade) => trade.pnl))
  const aPlusCount = tradeHistory.filter((trade) => trade.isAPlus).length
  const expectancyStats = expectancyInR(tradeHistory)
  return {
    totalPnl,
    winners,
    winRate: Math.round((winners / tradeHistory.length) * 100),
    best,
    worst,
    aPlusCount,
    expectancy: expectancyStats.expectancy,
    avgWin: expectancyStats.avgWin,
    avgLoss: expectancyStats.avgLoss,
  }
})()

export default function HistoryPage() {
  const [dateRange, setDateRange] = useState('30d')
  const [instrument, setInstrument] = useState('ALL')
  const [type, setType] = useState('ALL')
  const [setup, setSetup] = useState('ALL')
  const [session, setSession] = useState('ALL')

  const visibleTrades = useMemo(
    () =>
      tradeHistory.filter(
        (trade) =>
          (instrument === 'ALL' || trade.symbol === instrument) &&
          (type === 'ALL' || trade.type === type) &&
          (setup === 'ALL' || trade.setup === setup) &&
          (session === 'ALL' || trade.session === session),
      ),
    [instrument, type, setup, session],
  )

  const filteredStats = useMemo(() => {
    if (visibleTrades.length === 0) {
      return { totalPnl: 0, winRate: 0, expectancy: 0, totalR: 0 }
    }
    const totalPnl = visibleTrades.reduce((sum, trade) => sum + trade.pnl, 0)
    const wins = visibleTrades.filter((trade) => trade.pnl > 0).length
    const totalR = visibleTrades.reduce((sum, trade) => sum + trade.realisedR, 0)
    const stats = expectancyInR(visibleTrades)
    return { totalPnl, winRate: (wins / visibleTrades.length) * 100, expectancy: stats.expectancy, totalR }
  }, [visibleTrades])

  const setupBreakdown = useMemo(() => buildSetupBreakdown(tradeHistory), [])
  const sessionBreakdown = useMemo(() => buildSessionBreakdown(tradeHistory), [])
  const instrumentBreakdown = useMemo(() => buildInstrumentBreakdown(tradeHistory), [])

  const columns = [
    { key: 'id', header: 'ID', render: (row) => <span className="font-mono text-text-faint">{row.id}</span> },
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
      key: 'type',
      header: 'Side',
      render: (row) => <Badge variant={row.type === 'BUY' ? 'buy' : 'sell'}>{row.type}</Badge>,
    },
    { key: 'setup', header: 'Setup', render: (row) => <span className="font-mono text-text">{row.setup}</span> },
    { key: 'session', header: 'Session', render: (row) => <span className="text-text-muted">{row.session}</span> },
    {
      key: 'entryPrice',
      header: 'Entry',
      align: 'right',
      render: (row) => <span className="font-mono tabular-nums text-text-muted">{formatInstrumentPrice(row.entryPrice, row.symbol)}</span>,
    },
    {
      key: 'exitPrice',
      header: 'Exit',
      align: 'right',
      render: (row) => <span className="font-mono tabular-nums text-text">{formatInstrumentPrice(row.exitPrice, row.symbol)}</span>,
    },
    {
      key: 'duration',
      header: 'Duration',
      align: 'right',
      render: (row) => <span className="font-mono tabular-nums text-text-muted">{durationBetween(row.openTime, row.closeTime)}</span>,
    },
    {
      key: 'movePts',
      header: 'Move',
      align: 'right',
      render: (row) => {
        const label = INSTRUMENT_META[row.symbol]?.moveLabel ?? 'pts'
        return (
          <span className={cn('font-mono tabular-nums', signedColor(row.movePts))}>
            {formatMove(row.movePts)} {label}
          </span>
        )
      },
    },
    {
      key: 'realisedR',
      header: 'R',
      align: 'right',
      render: (row) => (
        <span className={cn('font-mono font-semibold tabular-nums', signedColor(row.realisedR))}>
          {formatR(row.realisedR)}
        </span>
      ),
    },
    {
      key: 'pnl',
      header: 'P&L',
      align: 'right',
      render: (row) => (
        <span className={cn('font-mono font-semibold tabular-nums', signedColor(row.pnl))}>
          {formatCurrency(row.pnl, { signed: true })}
        </span>
      ),
    },
  ]

  const footer = (
    <>
      <td colSpan={6} className="px-4 py-3 text-xs uppercase tracking-wide text-text-faint">
        {visibleTrades.length} trades · win rate{' '}
        <span className="font-mono text-text">{filteredStats.winRate.toFixed(0)}%</span> · expectancy{' '}
        <span className="font-mono text-text">{filteredStats.expectancy.toFixed(2)}R</span>
      </td>
      <td className="px-4 py-3 text-right text-xs uppercase tracking-wide text-text-faint">Total move</td>
      <td className="px-4 py-3" />
      <td className={cn('px-4 py-3 text-right font-mono font-semibold tabular-nums', signedColor(filteredStats.totalR))}>
        {formatR(filteredStats.totalR)}
      </td>
      <td className={cn('px-4 py-3 text-right font-mono font-semibold tabular-nums', signedColor(filteredStats.totalPnl))}>
        {formatCurrency(filteredStats.totalPnl, { signed: true })}
      </td>
    </>
  )

  return (
    <PageContainer>
      <PageSection>
        <PageHeader
          title="History"
          subtitle="Journal · realised P&L, R-multiples, expectancy by setup and session"
        />
      </PageSection>

      <PageSection>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
          <KpiCard label="Total trades" value={tradeHistory.length} icon={Hash} />
          <KpiCard label="Winners" value={STATS.winners} icon={Trophy} valueClassName="text-positive" />
          <KpiCard label="Win rate" value={`${STATS.winRate}%`} icon={Percent} valueClassName="text-positive" />
          <KpiCard
            label="Expectancy"
            value={`${STATS.expectancy.toFixed(2)}R`}
            icon={Calculator}
            valueClassName={STATS.expectancy >= 0 ? 'text-positive' : 'text-danger'}
            changeLabel="per trade"
          />
          <KpiCard
            label="A+ trades"
            value={STATS.aPlusCount}
            icon={Sparkles}
            changeLabel="of total"
          />
          <KpiCard
            label="Total P&L"
            value={formatCurrency(STATS.totalPnl, { signed: true })}
            icon={Wallet}
            valueClassName={signedColor(STATS.totalPnl)}
          />
        </div>
      </PageSection>

      <PageSection>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.6fr_1fr]">
          <Card title="Monthly P&L" action={<span className="text-xs text-text-faint">Jan – Jun 2026</span>}>
            <ChartInView height={240}>
              {() => (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={monthlyPnl} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                    <defs>
                      <linearGradient id="pnlUp" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--ds-accent-bright)" stopOpacity={1} />
                        <stop offset="100%" stopColor="var(--ds-accent)" stopOpacity={0.55} />
                      </linearGradient>
                      <linearGradient id="pnlDown" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--ds-danger)" stopOpacity={0.95} />
                        <stop offset="100%" stopColor="var(--ds-danger)" stopOpacity={0.45} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="month" tick={AXIS_TICK} tickLine={false} axisLine={false} />
                    <YAxis
                      tick={AXIS_TICK}
                      tickLine={false}
                      axisLine={false}
                      width={44}
                      tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                    />
                    <Tooltip content={<MonthlyTooltip />} cursor={{ fill: 'var(--ds-accent-softer)' }} />
                    <Bar dataKey="pnl" radius={[4, 4, 0, 0]} isAnimationActive animationDuration={700} animationEasing="ease-out">
                      {monthlyPnl.map((entry) => (
                        <Cell key={entry.month} fill={entry.pnl >= 0 ? 'url(#pnlUp)' : 'url(#pnlDown)'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartInView>
          </Card>

          <Card title="Performance by instrument" action={<span className="text-xs text-text-faint">All-time</span>}>
            <ul className="space-y-2">
              {instrumentBreakdown.map((entry) => (
                <li
                  key={entry.symbol}
                  className="flex items-center justify-between gap-3 rounded-md border border-border bg-surface-2/40 px-3 py-2.5"
                >
                  <div className="leading-tight">
                    <p className="font-mono text-sm font-medium text-text">
                      {INSTRUMENT_META[entry.symbol]?.displaySymbol ?? entry.symbol}
                    </p>
                    <p className="text-xs text-text-faint">
                      {entry.trades} trades · avg {formatR(entry.avgR)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={cn('font-mono text-sm font-semibold tabular-nums', signedColor(entry.pnl))}>
                      {formatCurrency(entry.pnl, { signed: true })}
                    </p>
                    <p className={cn('font-mono text-xs tabular-nums', signedColor(entry.totalR))}>
                      {formatR(entry.totalR)} total
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </PageSection>

      <PageSection>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card title="By setup" action={<span className="text-xs text-text-faint">Expectancy in R</span>}>
            <ul className="space-y-2">
              {setupBreakdown.map((entry) => (
                <li
                  key={entry.id}
                  className="flex items-center justify-between gap-3 rounded-md border border-border bg-surface-2/40 px-3 py-2.5"
                >
                  <div className="leading-tight">
                    <p className="text-sm font-medium text-text">
                      <span className="font-mono">{entry.label}</span>
                      <span className="ml-2 text-text-faint text-xs">{entry.longLabel}</span>
                    </p>
                    <p className="text-xs text-text-faint">
                      {entry.trades} trades · win rate {(entry.winRate * 100).toFixed(0)}%
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={cn('font-mono text-sm font-semibold tabular-nums', signedColor(entry.expectancy))}>
                      {entry.expectancy.toFixed(2)}R
                    </p>
                    <p className={cn('font-mono text-xs tabular-nums', signedColor(entry.pnl))}>
                      {formatCurrency(entry.pnl, { signed: true })}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </Card>

          <Card title="By session" action={<span className="text-xs text-text-faint">ICT-style</span>}>
            <ul className="space-y-2">
              {sessionBreakdown.map((entry) => (
                <li
                  key={entry.id}
                  className="flex items-center justify-between gap-3 rounded-md border border-border bg-surface-2/40 px-3 py-2.5"
                >
                  <div className="leading-tight">
                    <p className="text-sm font-medium text-text">{entry.label}</p>
                    <p className="text-xs text-text-faint">
                      {entry.trades} trades · win rate {(entry.winRate * 100).toFixed(0)}%
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={cn('font-mono text-sm font-semibold tabular-nums', signedColor(entry.expectancy))}>
                      {entry.expectancy.toFixed(2)}R
                    </p>
                    <p className={cn('font-mono text-xs tabular-nums', signedColor(entry.pnl))}>
                      {formatCurrency(entry.pnl, { signed: true })}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </PageSection>

      <PageSection>
        <Card padded>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            <Select label="Date range" value={dateRange} onChange={setDateRange} options={DATE_RANGE_OPTIONS} />
            <Select label="Instrument" value={instrument} onChange={setInstrument} options={INSTRUMENT_OPTIONS} />
            <Select label="Side" value={type} onChange={setType} options={TYPE_OPTIONS} />
            <Select label="Setup" value={setup} onChange={setSetup} options={SETUP_OPTIONS} />
            <Select label="Session" value={session} onChange={setSession} options={SESSION_OPTIONS} />
          </div>
        </Card>
      </PageSection>

      <PageSection>
        <Card
          title="Trade journal"
          padded={false}
          action={
            <span className="text-xs text-text-faint">
              {filteredStats.winRate.toFixed(0)}% win rate · {filteredStats.expectancy.toFixed(2)}R expectancy
            </span>
          }
        >
          <Table columns={columns} rows={visibleTrades} footer={footer} empty="No trades match your filters." />
        </Card>
      </PageSection>
    </PageContainer>
  )
}
