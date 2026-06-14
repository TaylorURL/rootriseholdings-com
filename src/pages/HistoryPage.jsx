import { useMemo, useState } from 'react'
import { PageContainer, PageSection } from '../components/layout/PageContainer'
import Card from '../components/ui/Card'
import Table from '../components/ui/Table'
import Badge from '../components/ui/Badge'
import Select from '../components/ui/Select'
import { tradeHistory } from '../data/mockData'
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
    { key: 'openTime', header: 'Open Time', align: 'right', render: (row) => <span className="font-mono text-xs text-text-faint">{row.openTime}</span> },
    { key: 'closeTime', header: 'Close Time', align: 'right', render: (row) => <span className="font-mono text-xs text-text-faint">{row.closeTime}</span> },
    {
      key: 'duration',
      header: 'Duration',
      align: 'right',
      render: (row) => <span className="font-mono tabular-nums text-text-muted">{durationBetween(row.openTime, row.closeTime)}</span>,
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
      key: 'pips',
      header: 'Pips',
      align: 'right',
      render: (row) => <span className={cn('font-mono tabular-nums', signedColor(row.pips))}>{formatPips(row.pips)}</span>,
    },
  ]

  const footer = (
    <>
      <td colSpan={5} className="px-4 py-3 text-xs uppercase tracking-wide text-text-faint">
        {visibleTrades.length} trades · Win rate{' '}
        <span className="font-mono text-text">{winRate.toFixed(0)}%</span>
      </td>
      <td colSpan={4} className="px-4 py-3 text-right text-xs uppercase tracking-wide text-text-faint">
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
