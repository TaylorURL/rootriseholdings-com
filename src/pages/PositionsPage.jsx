import { useMemo } from 'react'
import { Layers, TrendingUp, X } from 'lucide-react'
import { PageContainer, PageSection } from '../components/layout/PageContainer'
import Card from '../components/ui/Card'
import Table from '../components/ui/Table'
import Badge from '../components/ui/Badge'
import { openPositions } from '../data/mockData'
import { cn } from '../lib/cn'
import { formatCurrency, formatPips, formatPrice, signedColor } from '../lib/format'

/** Compact stat tile for the positions summary bar. */
function SummaryStat({ label, value, icon: Icon, valueClassName }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-surface px-5 py-4 shadow-sm">
      <span className="flex h-10 w-10 items-center justify-center rounded-md bg-surface-2 text-text-muted">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-text-faint">{label}</p>
        <p className={cn('font-mono text-xl font-semibold tabular-nums', valueClassName)}>{value}</p>
      </div>
    </div>
  )
}

export default function PositionsPage() {
  const totalPnl = useMemo(() => openPositions.reduce((sum, position) => sum + position.pnl, 0), [])

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
      key: 'currentPrice',
      header: 'Current',
      align: 'right',
      render: (row) => <span className="font-mono tabular-nums text-text">{formatPrice(row.currentPrice, row.pair)}</span>,
    },
    {
      key: 'sl',
      header: 'S/L',
      align: 'right',
      render: (row) => <span className="font-mono tabular-nums text-danger">{formatPrice(row.sl, row.pair)}</span>,
    },
    {
      key: 'tp',
      header: 'T/P',
      align: 'right',
      render: (row) => <span className="font-mono tabular-nums text-positive">{formatPrice(row.tp, row.pair)}</span>,
    },
    { key: 'openTime', header: 'Open Time', align: 'right', render: (row) => <span className="font-mono text-xs text-text-faint">{row.openTime}</span> },
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
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: () => (
        <button
          type="button"
          aria-label="Close position"
          className="inline-flex items-center gap-1 rounded-md border border-border bg-surface-2 px-2.5 py-1.5 text-xs font-medium text-text-muted transition-colors hover:border-[var(--ds-border-hover)] hover:text-danger"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
          Close
        </button>
      ),
    },
  ]

  return (
    <PageContainer>
      <PageSection>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <SummaryStat
            label="Total Open P&L"
            value={formatCurrency(totalPnl, { signed: true })}
            icon={TrendingUp}
            valueClassName={signedColor(totalPnl)}
          />
          <SummaryStat label="Open Positions" value={openPositions.length} icon={Layers} />
        </div>
      </PageSection>

      <PageSection>
        <Card title="Open Positions" padded={false}>
          <Table columns={columns} rows={openPositions} empty="You have no open positions." />
        </Card>
      </PageSection>
    </PageContainer>
  )
}
