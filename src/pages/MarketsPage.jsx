import { useMemo, useState } from 'react'
import { PageContainer, PageSection } from '../components/layout/PageContainer'
import Card from '../components/ui/Card'
import Table from '../components/ui/Table'
import MiniChart from '../components/ui/MiniChart'
import SegmentedTabs from '../components/ui/SegmentedTabs'
import SearchInput from '../components/ui/SearchInput'
import ChangeIndicator from '../components/ui/ChangeIndicator'
import { currencyPairs, generateSparkline } from '../data/mockData'
import { cn } from '../lib/cn'
import { formatPrice, signedColor } from '../lib/format'

const CATEGORY_TABS = ['All', 'Majors', 'Minors', 'Exotics']

/** Pre-compute a deterministic sparkline per pair so charts stay stable. */
const SPARKLINES = currencyPairs.reduce((accumulator, pair, index) => {
  accumulator[pair.pair] = generateSparkline(pair.bid, 24, 0.0045, index + 3)
  return accumulator
}, {})

export default function MarketsPage() {
  const [category, setCategory] = useState('All')
  const [query, setQuery] = useState('')

  const filteredPairs = useMemo(() => {
    const normalizedQuery = query.trim().toUpperCase()
    return currencyPairs.filter((entry) => {
      const matchesCategory = category === 'All' || entry.category === category
      const matchesQuery = !normalizedQuery || entry.pair.includes(normalizedQuery)
      return matchesCategory && matchesQuery
    })
  }, [category, query])

  const columns = [
    {
      key: 'pair',
      header: 'Pair',
      render: (row) => <span className="font-mono font-medium text-text">{row.pair}</span>,
    },
    {
      key: 'bid',
      header: 'Bid',
      align: 'right',
      render: (row) => <span className="font-mono tabular-nums text-text">{formatPrice(row.bid, row.pair)}</span>,
    },
    {
      key: 'ask',
      header: 'Ask',
      align: 'right',
      render: (row) => <span className="font-mono tabular-nums text-text-muted">{formatPrice(row.ask, row.pair)}</span>,
    },
    {
      key: 'spread',
      header: 'Spread',
      align: 'right',
      render: (row) => <span className="font-mono tabular-nums text-text-faint">{row.spread.toFixed(1)}</span>,
    },
    {
      key: 'changePct',
      header: 'Change',
      align: 'right',
      render: (row) => <ChangeIndicator value={row.changePct} size="sm" className="justify-end" />,
    },
    {
      key: 'high',
      header: '24h High',
      align: 'right',
      render: (row) => <span className="font-mono tabular-nums text-text-muted">{formatPrice(row.high, row.pair)}</span>,
    },
    {
      key: 'low',
      header: '24h Low',
      align: 'right',
      render: (row) => <span className="font-mono tabular-nums text-text-muted">{formatPrice(row.low, row.pair)}</span>,
    },
    {
      key: 'volume',
      header: 'Volume',
      align: 'right',
      render: (row) => <span className="font-mono tabular-nums text-text-muted">{row.volume}</span>,
    },
    {
      key: 'sparkline',
      header: '7d Trend',
      align: 'center',
      render: (row) => (
        <div className="mx-auto h-9 w-28">
          <MiniChart data={SPARKLINES[row.pair]} trend={row.changePct >= 0 ? 'positive' : 'negative'} height={36} />
        </div>
      ),
    },
    {
      key: 'action',
      header: '',
      align: 'right',
      render: () => (
        <button
          type="button"
          className="rounded-md border border-border-hover bg-[var(--ds-accent-soft)] px-3 py-1.5 text-xs font-semibold text-accent-bright transition-colors hover:bg-[var(--ds-accent-face)] hover:text-on-accent"
        >
          Trade
        </button>
      ),
    },
  ]

  return (
    <PageContainer>
      <PageSection>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SegmentedTabs options={CATEGORY_TABS} value={category} onChange={setCategory} ariaLabel="Market category" />
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Search pairs…"
            ariaLabel="Search currency pairs"
            className="w-full max-w-xs"
          />
        </div>
      </PageSection>

      <PageSection>
        <Card
          title="Currency Pairs"
          padded={false}
          action={<span className={cn('text-xs', signedColor(1))}>{filteredPairs.length} markets</span>}
        >
          <Table
            columns={columns}
            rows={filteredPairs}
            rowKey={(row) => row.pair}
            empty="No pairs match your filters."
          />
        </Card>
      </PageSection>
    </PageContainer>
  )
}
