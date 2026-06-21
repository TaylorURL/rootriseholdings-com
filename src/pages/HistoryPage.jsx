import { useMemo, useState } from 'react'
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Hash, Trophy, Percent, Wallet, ArrowUpRight, ArrowDownRight } from 'lucide-react'
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
import { cn } from '../lib/cn'
import { durationBetween, formatCurrency, formatPips, formatPrice, signedColor } from '../lib/format'

const DATE_RANGE_OPTIONS = [
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: 'ytd', label: 'Year to date' },
]

const TYPE_OPTIONS = [
  { value: 'ALL', label: 'All types' },
  { value: 'BUY', label: 'Buy' },
  { value: 'SELL', label: 'Sell' },
]

const PAIR_OPTIONS = [
  { value: 'ALL', label: 'All pairs' },
  ...[...new Set(tradeHistory.map((trade) => trade.pair))].map((pair) => ({ value: pair, label: pair })),
]

/** Aggregate realised trades by pair for the performance breakdown. */
function buildPairBreakdown(trades) {
  const byPair = new Map()
  for (const trade of trades) {
    const entry = byPair.get(trade.pair) ?? { pair: trade.pair, trades: 0, pips: 0, pnl: 0 }
    entry.trades += 1
    entry.pips += trade.pips
    entry.pnl += trade.pnl
    byPair.set(trade.pair, entry)
  }
  return [...byPair.values()].sort((a, b) => b.pnl - a.pnl)
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
  const total = tradeHistory.reduce((sum, trade) => sum + trade.pnl, 0)
  const winners = tradeHistory.filter((trade) => trade.pnl > 0).length
  const best = Math.max(...tradeHistory.map((trade) => trade.pnl))
  const worst = Math.min(...tradeHistory.map((trade) => trade.pnl))
  return {
    total,
    winners,
    winRate: Math.round((winners / tradeHistory.length) * 100),
    best,
    worst,
  }
})()

const PAIR_BREAKDOWN = buildPairBreakdown(tradeHistory)

export default function HistoryPage() {
  const [dateRange, setDateRange] = useState('7d')
  const [pair, setPair] = useState('ALL')
  const [type, setType] = useState('ALL')

  const visibleTrades = useMemo(
    () =>
      tradeHistory.filter(
        (trade) => (pair === 'ALL' || trade.pair === pair) && (type === 'ALL' || trade.type === type),
      ),
    [pair, type],
  )

  const { totalPnl, winRate } = useMemo(() => {
    if (visibleTrades.length === 0) return { totalPnl: 0, winRate: 0 }
    const total = visibleTrades.reduce((sum, trade) => sum + trade.pnl, 0)
    const wins = visibleTrades.filter((trade) => trade.pnl > 0).length
    return { totalPnl: total, winRate: (wins / visibleTrades.length) * 100 }
  }, [visibleTrades])

  const columns = [
    { key: 'id', header: 'ID', render: (row) => <span className="font-mono text-text-faint">{row.id}</span> },
    { key: 'pair', header: 'Pair', render: (row) => <span className="font-mono font-medium text-text">{row.pair}</span> },
    {
      key: 'type',
      header: 'Type',
      render: (row) => <Badge variant={row.type === 'BUY' ? 'buy' : 'sell'}>{row.type}</Badge>,
    },
    { key: 'lots', header: 'Lots', align: 'right', render: (row) => <span className="font-mono tabular-nums">{row.lots.toFixed(2)}</span> },
    {
      key: 'entryPrice',
      header: 'Entry',
      align: 'right',
      render: (row) => <span className="font-mono tabular-nums text-text-muted">{formatPrice(row.entryPrice, row.pair)}</span>,
    },
    {
      key: 'exitPrice',
      header: 'Exit',
      align: 'right',
      render: (row) => <span className="font-mono tabular-nums text-text">{formatPrice(row.exitPrice, row.pair)}</span>,
    },
    {
      key: 'duration',
      header: 'Duration',
      align: 'right',
      render: (row) => <span className="font-mono tabular-nums text-text-muted">{durationBetween(row.openTime, row.closeTime)}</span>,
    },
    {
      key: 'pips',
      header: 'Pips',
      align: 'right',
      render: (row) => <span className={cn('font-mono tabular-nums', signedColor(row.pips))}>{formatPips(row.pips)}</span>,
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
    {
      key: 'outcome',
      header: 'Outcome',
      align: 'right',
      render: (row) => (
        <Badge variant={row.pnl >= 0 ? 'positive' : 'danger'}>{row.pnl >= 0 ? 'Win' : 'Loss'}</Badge>
      ),
    },
  ]

  const footer = (
    <>
      <td colSpan={6} className="px-4 py-3 text-xs uppercase tracking-wide text-text-faint">
        {visibleTrades.length} trades · Win rate{' '}
        <span className="font-mono text-text">{winRate.toFixed(0)}%</span>
      </td>
      <td colSpan={2} className="px-4 py-3 text-right text-xs uppercase tracking-wide text-text-faint">
        Total P&amp;L
      </td>
      <td className={cn('px-4 py-3 text-right font-mono font-semibold tabular-nums', signedColor(totalPnl))}>
        {formatCurrency(totalPnl, { signed: true })}
      </td>
      <td className="px-4 py-3" />
    </>
  )

  return (
    <PageContainer>
      <PageSection>
        <PageHeader title="History" subtitle="Closed trades, realised P&L, and performance breakdown" />
      </PageSection>

      <PageSection>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
          <KpiCard label="Total Trades" value={tradeHistory.length} icon={Hash} />
          <KpiCard label="Winners" value={STATS.winners} icon={Trophy} valueClassName="text-positive" />
          <KpiCard label="Win Rate" value={`${STATS.winRate}%`} icon={Percent} valueClassName="text-positive" />
          <KpiCard
            label="Total P&L"
            value={formatCurrency(STATS.total, { signed: true })}
            icon={Wallet}
            valueClassName={signedColor(STATS.total)}
          />
          <KpiCard
            label="Best Trade"
            value={formatCurrency(STATS.best, { signed: true })}
            icon={ArrowUpRight}
            valueClassName="text-positive"
          />
          <KpiCard
            label="Worst Trade"
            value={formatCurrency(STATS.worst, { signed: true })}
            icon={ArrowDownRight}
            valueClassName="text-danger"
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

          <Card title="Pair Performance" action={<span className="text-xs text-text-faint">By realised pips</span>}>
            <ul className="space-y-2">
              {PAIR_BREAKDOWN.map((entry) => (
                <li
                  key={entry.pair}
                  className="flex items-center justify-between gap-3 rounded-md border border-border bg-surface-2/40 px-3 py-2.5"
                >
                  <div className="leading-tight">
                    <p className="font-mono text-sm font-medium text-text">{entry.pair}</p>
                    <p className="text-xs text-text-faint">{entry.trades} trades</p>
                  </div>
                  <div className="text-right">
                    <p className={cn('font-mono text-sm font-semibold tabular-nums', signedColor(entry.pnl))}>
                      {formatCurrency(entry.pnl, { signed: true })}
                    </p>
                    <p className={cn('font-mono text-xs tabular-nums', signedColor(entry.pips))}>{formatPips(entry.pips)} pips</p>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </PageSection>

      <PageSection>
        <Card padded>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Select label="Date range" value={dateRange} onChange={setDateRange} options={DATE_RANGE_OPTIONS} />
            <Select label="Pair" value={pair} onChange={setPair} options={PAIR_OPTIONS} />
            <Select label="Type" value={type} onChange={setType} options={TYPE_OPTIONS} />
          </div>
        </Card>
      </PageSection>

      <PageSection>
        <Card title="Trade History" padded={false} action={<span className="text-xs text-text-faint">{winRate.toFixed(0)}% win rate</span>}>
          <Table columns={columns} rows={visibleTrades} footer={footer} empty="No trades match your filters." />
        </Card>
      </PageSection>
    </PageContainer>
  )
}
