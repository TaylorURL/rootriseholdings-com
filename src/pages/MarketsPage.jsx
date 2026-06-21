import { useMemo, useState } from 'react'
import { PageContainer, PageSection } from '../components/layout/PageContainer'
import PageHeader from '../components/ui/PageHeader'
import Card from '../components/ui/Card'
import Table from '../components/ui/Table'
import Sparkline from '../components/ui/Sparkline'
import SegmentedTabs from '../components/ui/SegmentedTabs'
import SearchInput from '../components/ui/SearchInput'
import ChangeIndicator from '../components/ui/ChangeIndicator'
import LivePairChart from '../components/ui/LivePairChart'
import CandlestickChart from '../components/charts/CandlestickChart'
import ChartInView from '../components/charts/ChartInView'
import { generateSparkline, generateCandles, marketStatus } from '../data/mockData'
import { useFxQuotes, FX_PAIRS, decimalsForPair } from '../lib/fxData'
import { cn } from '../lib/cn'
import { formatPrice, signedColor } from '../lib/format'

const CATEGORY_TABS = ['All', 'Majors', 'Minors', 'Exotics']
const CHART_VIEWS = ['Area', 'Candles']
const FEATURED_PAIR = 'EUR/USD'

/** Pre-compute a deterministic 10-point sparkline per pair so the trend column is stable. */
const SPARKLINES = FX_PAIRS.reduce((accumulator, entry, index) => {
  accumulator[entry.pair] = generateSparkline(entry.seed, 10, 0.0045, index + 3)
  return accumulator
}, {})

/** Stacked label/value pair for the featured-pair stat grid. */
function FeaturedStat({ label, value, valueClassName }) {
  return (
    <div className="rounded-md border border-border bg-surface-2/40 px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-wide text-text-faint">{label}</p>
      <p className={cn('mt-1 font-mono text-base font-semibold tabular-nums text-text', valueClassName)}>{value}</p>
    </div>
  )
}

export default function MarketsPage() {
  const { quotes, byPair } = useFxQuotes()
  const [category, setCategory] = useState('All')
  const [query, setQuery] = useState('')
  const [chartView, setChartView] = useState('Area')

  const featured = byPair[FEATURED_PAIR] ?? quotes[0]

  /** Deterministic candle series for the featured pair (terminal-grade view). */
  const featuredCandles = useMemo(
    () => (featured ? generateCandles(featured.bid, 44, featured.pair.includes('JPY') ? 0.0014 : 0.0019, 57) : []),
    [featured?.pair], // eslint-disable-line react-hooks/exhaustive-deps
  )

  const filteredPairs = useMemo(() => {
    const normalizedQuery = query.trim().toUpperCase()
    return quotes.filter((entry) => {
      const matchesCategory = category === 'All' || entry.category === category
      const matchesQuery = !normalizedQuery || entry.pair.includes(normalizedQuery)
      return matchesCategory && matchesQuery
    })
  }, [quotes, category, query])

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
      key: 'change',
      header: 'Change',
      align: 'right',
      render: (row) => (
        <span className={cn('font-mono tabular-nums', signedColor(row.change))}>
          {row.change > 0 ? '+' : ''}
          {formatPrice(row.change, row.pair)}
        </span>
      ),
    },
    {
      key: 'changePct',
      header: 'Change %',
      align: 'right',
      render: (row) => <ChangeIndicator value={row.changePct} size="sm" className="justify-end" />,
    },
    {
      key: 'high',
      header: 'High',
      align: 'right',
      render: (row) => <span className="font-mono tabular-nums text-text-muted">{formatPrice(row.high, row.pair)}</span>,
    },
    {
      key: 'low',
      header: 'Low',
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
      header: 'Trend',
      align: 'center',
      render: (row) => (
        <div className="mx-auto h-8 w-20">
          <Sparkline data={SPARKLINES[row.pair]} positive={row.changePct >= 0} height={32} />
        </div>
      ),
    },
  ]

  return (
    <PageContainer>
      <PageSection>
        <PageHeader title="Markets" subtitle="14 currency pairs · Live spot rates and spreads" />
      </PageSection>

      <PageSection>
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-surface px-5 py-3 shadow-sm">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-positive opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-positive" />
          </span>
          <span className="text-sm font-medium text-text">Markets {marketStatus.state}</span>
          <span className="text-text-faint">·</span>
          <span className="text-sm text-text-muted">{marketStatus.session}</span>
          <span className="text-text-faint">·</span>
          <span className="text-sm text-text-muted">{marketStatus.liquidity}</span>
        </div>
      </PageSection>

      {featured && (
        <PageSection>
          <Card
            title={`${featured.pair} — Featured`}
            action={
              <SegmentedTabs
                options={CHART_VIEWS}
                value={chartView}
                onChange={setChartView}
                ariaLabel="Featured chart view"
              />
            }
          >
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[260px_1fr]">
              <div className="flex flex-col gap-4">
                <div>
                  <p className="font-mono text-4xl font-semibold tabular-nums text-text">
                    {formatPrice(featured.bid, featured.pair)}
                  </p>
                  <ChangeIndicator value={featured.changePct} className="mt-1.5" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <FeaturedStat label="Bid" value={formatPrice(featured.bid, featured.pair)} />
                  <FeaturedStat label="Ask" value={formatPrice(featured.ask, featured.pair)} />
                  <FeaturedStat label="Spread" value={`${featured.spread.toFixed(1)} pips`} />
                  <FeaturedStat label="Volume" value={featured.volume} />
                </div>
              </div>
              <div className="border-t border-border pt-4 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
                {chartView === 'Candles' ? (
                  <ChartInView height={280}>
                    {() => (
                      <CandlestickChart
                        data={featuredCandles}
                        height={280}
                        decimals={decimalsForPair(featured.pair)}
                      />
                    )}
                  </ChartInView>
                ) : (
                  <LivePairChart pair={featured.pair} height={280} compact />
                )}
              </div>
            </div>
          </Card>
        </PageSection>
      )}

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
          action={<span className="text-xs text-text-faint">{filteredPairs.length} markets</span>}
        >
          <Table
            columns={columns}
            rows={filteredPairs}
            rowKey={(row) => row.pair}
            animate={false}
            empty="No pairs match your filters."
          />
        </Card>
      </PageSection>
    </PageContainer>
  )
}
