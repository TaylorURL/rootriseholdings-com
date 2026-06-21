import { useMemo, useState } from 'react'
import { Clock, Layers, AlertTriangle, Eye } from 'lucide-react'
import { PageContainer, PageSection } from '../components/layout/PageContainer'
import PageHeader from '../components/ui/PageHeader'
import Card from '../components/ui/Card'
import Table from '../components/ui/Table'
import Sparkline from '../components/ui/Sparkline'
import SegmentedTabs from '../components/ui/SegmentedTabs'
import SearchInput from '../components/ui/SearchInput'
import Badge from '../components/ui/Badge'
import ChangeIndicator from '../components/ui/ChangeIndicator'
import CandlestickChart from '../components/charts/CandlestickChart'
import ChartInView from '../components/charts/ChartInView'
import { generateSparkline, generateCandles, marketStatus } from '../data/mockData'
import {
  INSTRUMENTS,
  INSTRUMENT_META,
  useInstrumentQuotes,
  decimalsForInstrument,
} from '../data/instruments'
import { cn } from '../lib/cn'
import { formatInstrumentPrice, signedColor } from '../lib/format'

const CATEGORY_TABS = ['All', 'Traded', 'Watch-only']
const FEATURED_SYMBOL = 'XAUUSD'

/** Deterministic 10-point trend sparkline per instrument. */
const SPARKLINES = INSTRUMENTS.reduce((accumulator, entry, index) => {
  accumulator[entry.symbol] = generateSparkline(entry.seed, 10, 0.0048, index + 3)
  return accumulator
}, {})

/** Compact stacked label/value for the featured-instrument stat grid. */
function FeaturedStat({ label, value, valueClassName }) {
  return (
    <div className="rounded-md border border-border bg-surface-2/40 px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-wide text-text-faint">{label}</p>
      <p className={cn('mt-1 font-mono text-base font-semibold tabular-nums text-text', valueClassName)}>{value}</p>
    </div>
  )
}

/** SMC analysis sidebar — structure bias, BOS/CHoCH/OTE levels for the featured chart. */
function SmcAnalysisCard({ symbol, price }) {
  // Anchor SMC zones to the current price so the sidebar stays believable as
  // the simulated ticker drifts. TODO(data): replace with real structure-engine
  // output keyed to the actual chart timeframes.
  const meta = INSTRUMENT_META[symbol]
  const bias = symbol === 'NAS100' || symbol === 'SP500' ? 'Bearish' : 'Bullish'
  const direction = bias === 'Bearish' ? 'SELL' : 'BUY'
  const oteLow = bias === 'Bullish' ? price * 0.9985 : price * 1.0008
  const oteHigh = bias === 'Bullish' ? price * 1.0008 : price * 1.0028
  const target = bias === 'Bullish' ? price * 1.0098 : price * 0.9905
  const stop = bias === 'Bullish' ? price * 0.9962 : price * 1.0042
  const decimals = decimalsForInstrument(symbol)

  return (
    <Card title="SMC analysis" action={<span className="text-xs text-text-faint">{meta.primaryTimeframe} · {meta.biasTimeframes.join('/')} bias</span>}>
      <div className="space-y-4 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-text-faint">Structure bias</span>
          <Badge variant={bias === 'Bullish' ? 'buy' : 'sell'}>{bias}</Badge>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-text-faint">Most recent</span>
          <span className="font-mono text-text">
            {bias === 'Bullish' ? 'BOS' : 'CHoCH'} · {meta.primaryTimeframe}
          </span>
        </div>
        <div className="border-t border-border pt-3 space-y-2">
          <p className="text-xs uppercase tracking-wide text-text-faint">OTE zone ({direction})</p>
          <p className="font-mono text-text">
            {formatInstrumentPrice(oteLow, symbol, decimals)} – {formatInstrumentPrice(oteHigh, symbol, decimals)}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-md border border-border bg-surface-2/40 px-3 py-2">
            <p className="text-xs text-text-faint">Invalidation</p>
            <p className="font-mono text-sm text-danger">{formatInstrumentPrice(stop, symbol, decimals)}</p>
          </div>
          <div className="rounded-md border border-border bg-surface-2/40 px-3 py-2">
            <p className="text-xs text-text-faint">First target</p>
            <p className="font-mono text-sm text-positive">{formatInstrumentPrice(target, symbol, decimals)}</p>
          </div>
        </div>
        <p className="text-xs text-text-muted leading-relaxed">{meta.note}</p>
      </div>
    </Card>
  )
}

export default function MarketsPage() {
  const { quotes, bySymbol } = useInstrumentQuotes()
  const [category, setCategory] = useState('All')
  const [query, setQuery] = useState('')

  const featured = bySymbol[FEATURED_SYMBOL] ?? quotes[0]

  const featuredCandles = useMemo(
    () => (featured ? generateCandles(featured.bid, 44, featured.category === 'FX' ? 0.0014 : 0.0022, 57) : []),
    [featured?.symbol], // eslint-disable-line react-hooks/exhaustive-deps
  )

  const filteredInstruments = useMemo(() => {
    const normalizedQuery = query.trim().toUpperCase()
    return quotes.filter((entry) => {
      const matchesCategory =
        category === 'All' ||
        (category === 'Traded' && !entry.isWatchOnly) ||
        (category === 'Watch-only' && entry.isWatchOnly)
      const matchesQuery = !normalizedQuery || entry.symbol.includes(normalizedQuery) || entry.displaySymbol.includes(normalizedQuery)
      return matchesCategory && matchesQuery
    })
  }, [quotes, category, query])

  const columns = [
    {
      key: 'symbol',
      header: 'Instrument',
      render: (row) => (
        <div className="flex items-center gap-2">
          <span className="font-mono font-medium text-text">{row.displaySymbol}</span>
          {row.isWatchOnly && (
            <span className="inline-flex items-center gap-1 rounded-md bg-surface-2 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-text-faint">
              <Eye className="h-3 w-3" aria-hidden="true" />
              Watch
            </span>
          )}
          {row.sideConstraint === 'SHORT' && (
            <span className="rounded-md bg-danger/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-danger">
              Shorts only
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'name',
      header: 'Class',
      render: (row) => <span className="text-text-muted">{row.category}</span>,
    },
    {
      key: 'timeframe',
      header: 'TF',
      render: (row) => <span className="font-mono text-text-muted">{row.primaryTimeframe}</span>,
    },
    {
      key: 'bid',
      header: 'Bid',
      align: 'right',
      render: (row) => <span className="font-mono tabular-nums text-text">{formatInstrumentPrice(row.bid, row.symbol)}</span>,
    },
    {
      key: 'ask',
      header: 'Ask',
      align: 'right',
      render: (row) => <span className="font-mono tabular-nums text-text-muted">{formatInstrumentPrice(row.ask, row.symbol)}</span>,
    },
    {
      key: 'change',
      header: 'Change',
      align: 'right',
      render: (row) => (
        <span className={cn('font-mono tabular-nums', signedColor(row.change))}>
          {row.change > 0 ? '+' : ''}
          {formatInstrumentPrice(row.change, row.symbol)}
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
      render: (row) => <span className="font-mono tabular-nums text-text-muted">{formatInstrumentPrice(row.high, row.symbol)}</span>,
    },
    {
      key: 'low',
      header: 'Low',
      align: 'right',
      render: (row) => <span className="font-mono tabular-nums text-text-muted">{formatInstrumentPrice(row.low, row.symbol)}</span>,
    },
    {
      key: 'sparkline',
      header: 'Trend',
      align: 'center',
      render: (row) => (
        <div className="mx-auto h-8 w-20">
          <Sparkline data={SPARKLINES[row.symbol]} positive={row.changePct >= 0} height={32} />
        </div>
      ),
    },
  ]

  const tradedCount = INSTRUMENTS.filter((entry) => entry.tradeable).length
  const watchCount = INSTRUMENTS.filter((entry) => entry.isWatchOnly).length

  return (
    <PageContainer>
      <PageSection>
        <PageHeader
          title="Markets"
          subtitle={`${tradedCount} traded · ${watchCount} watch-only · SMC playbook`}
        />
      </PageSection>

      <PageSection>
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-surface px-5 py-3 shadow-sm">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-positive opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-positive" />
          </span>
          <span className="text-sm font-medium text-text">Markets {marketStatus.state}</span>
          <span className="text-text-faint">·</span>
          <span className="inline-flex items-center gap-1.5 text-sm text-text-muted">
            <Clock className="h-3.5 w-3.5" aria-hidden="true" />
            {marketStatus.session}
          </span>
          <span className="text-text-faint">·</span>
          <span className="text-sm text-text-muted">{marketStatus.liquidity}</span>
          <span className="ml-auto inline-flex items-center gap-1.5 text-xs text-text-faint">
            <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
            Decision-support · no execution
          </span>
        </div>
      </PageSection>

      {featured && (
        <PageSection>
          <Card
            title={`${featured.displaySymbol} — Featured`}
            action={
              <span className="inline-flex items-center gap-2 text-xs text-text-faint">
                <Layers className="h-3.5 w-3.5" aria-hidden="true" />
                {INSTRUMENT_META[featured.symbol]?.name}
              </span>
            }
          >
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[260px_1fr_280px]">
              <div className="flex flex-col gap-4">
                <div>
                  <p className="font-mono text-4xl font-semibold tabular-nums text-text">
                    {formatInstrumentPrice(featured.bid, featured.symbol)}
                  </p>
                  <ChangeIndicator value={featured.changePct} className="mt-1.5" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <FeaturedStat label="Bid" value={formatInstrumentPrice(featured.bid, featured.symbol)} />
                  <FeaturedStat label="Ask" value={formatInstrumentPrice(featured.ask, featured.symbol)} />
                  <FeaturedStat label="High" value={formatInstrumentPrice(featured.high, featured.symbol)} />
                  <FeaturedStat label="Low" value={formatInstrumentPrice(featured.low, featured.symbol)} />
                </div>
              </div>
              <div className="border-t border-border pt-4 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
                <ChartInView height={280}>
                  {() => (
                    <CandlestickChart
                      data={featuredCandles}
                      height={280}
                      decimals={decimalsForInstrument(featured.symbol)}
                    />
                  )}
                </ChartInView>
              </div>
              <div className="border-t border-border pt-4 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
                <SmcAnalysisCard symbol={featured.symbol} price={featured.bid} />
              </div>
            </div>
          </Card>
        </PageSection>
      )}

      <PageSection>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SegmentedTabs options={CATEGORY_TABS} value={category} onChange={setCategory} ariaLabel="Instrument category" />
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Search instruments…"
            ariaLabel="Search instruments"
            className="w-full max-w-xs"
          />
        </div>
      </PageSection>

      <PageSection>
        <Card
          title="Instrument universe"
          padded={false}
          action={<span className="text-xs text-text-faint">{filteredInstruments.length} instruments</span>}
        >
          <Table
            columns={columns}
            rows={filteredInstruments}
            rowKey={(row) => row.symbol}
            animate={false}
            empty="No instruments match your filters."
          />
        </Card>
      </PageSection>
    </PageContainer>
  )
}
