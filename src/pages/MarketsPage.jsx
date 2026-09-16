import { useMemo, useRef, useState } from 'react'
import { Eye } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import SegmentedTabs from '../components/ui/SegmentedTabs'
import SearchInput from '../components/ui/SearchInput'
import Badge from '../components/ui/Badge'
import { Figure, FigureRow, RuleLabel } from '../components/ui/Figures'
import CandleChart from '../components/charts/CandleChart'
import ChartInView from '../components/charts/ChartInView'
import { Skeleton, SkeletonText, SkeletonRegion } from '../components/ui/Skeleton'
import TradeCallCard from '../components/signals/TradeCallCard'
import {
  INSTRUMENTS,
  INSTRUMENT_CATEGORIES,
  INSTRUMENT_META,
  decimalsForInstrument,
  describeSideConstraint,
} from '../data/instruments'
import { useInstrumentQuotes } from '../lib/marketData/instrumentQuotes.js'
import { useSignals } from '../context/SignalsContext'
import { narrateInstrument } from '../lib/smc/narrate.js'
import { cn } from '../lib/cn'
import { formatInstrumentPrice, signedColor, NO_VALUE } from '../lib/format'

/** The plural each instrument class filters under. */
const CLASS_LABELS = {
  FX: 'FX',
  Commodity: 'Commodities',
  Index: 'Indices',
  Crypto: 'Crypto',
}

const CATEGORY_TABS = [
  'All',
  'Primary',
  ...INSTRUMENT_CATEGORIES.map((entry) => CLASS_LABELS[entry]),
]

const CLASS_FOR_LABEL = Object.fromEntries(
  INSTRUMENT_CATEGORIES.map((entry) => [CLASS_LABELS[entry], entry])
)

const OPENING_SYMBOL = 'XAUUSD'

/**
 * The structure engine's own event names, in words.
 *
 * The engine writes for the engine, and 'BOS Up' sitting in a value slot beside
 * a price is a token rather than a reading. The short code stays alongside for
 * anyone who reads them at speed, and the chart keeps the code on its own,
 * where a reference line has no room for a sentence.
 */
const EVENT_PROSE = {
  'BOS Up': 'Break of structure, up',
  'BOS Down': 'Break of structure, down',
  'CHoCH Up': 'Change of character, up',
  'CHoCH Down': 'Change of character, down',
}

/**
 * The height the two panes run at.
 *
 * The rail scrolls inside itself rather than with the page, so the book stays
 * on screen while a chart is being read - which is the whole reason for a rail
 * rather than a table underneath. It is measured off the viewport less the
 * chrome above it and the page's own padding.
 */
const PANE = 'lg:h-[calc(100dvh-var(--ds-header-height)-9.5rem)]'

/** One row of the book. Dense, single line, and the whole row is the target. */
function BookRow({ entry, selected, onSelect }) {
  const meta = INSTRUMENT_META[entry.symbol]
  return (
    <button
      type="button"
      onClick={() => onSelect(entry.symbol)}
      aria-current={selected ? 'true' : undefined}
      className={cn(
        'focus-ring-inset grid w-full grid-cols-[minmax(0,1fr)_minmax(9ch,auto)] items-center gap-x-3 gap-y-0.5 border-b border-border px-3 py-2 text-left transition-colors duration-200 ease-out',
        selected ? 'bg-[var(--ds-accent-soft)]' : '[@media(hover:hover)]:hover:bg-surface-2'
      )}
    >
      <span className="flex min-w-0 items-center gap-1.5">
        <span
          className={cn(
            'truncate text-[13px] font-medium tabular-nums',
            selected ? 'text-accent' : 'text-text'
          )}
        >
          {entry.displaySymbol}
        </span>
        {meta?.isWatchOnly ? (
          <Eye className="h-3 w-3 shrink-0 text-text-faint" aria-label="Watch only" />
        ) : null}
      </span>
      <span className="text-right text-[13px] tabular-nums text-text">
        {formatInstrumentPrice(entry.price, entry.symbol)}
      </span>
      <span className="truncate text-xs text-text-faint">{entry.name}</span>
      <span className={cn('text-right text-xs tabular-nums', signedColor(entry.change))}>
        {entry.changePct > 0 ? '+' : ''}
        {entry.changePct.toFixed(2)}%
      </span>
    </button>
  )
}

/** The structure read, rendered as ruled rows rather than a stack of tiles. */
function StructureRead({ symbol, read, loading }) {
  const meta = INSTRUMENT_META[symbol]
  const decimals = decimalsForInstrument(symbol)

  if (loading) {
    return (
      <SkeletonRegion label="Reading market structure" className="space-y-3">
        <Skeleton className="h-[96px] rounded-card" />
        <Skeleton className="h-9 rounded-sm" />
        <Skeleton className="h-9 rounded-sm" />
        <SkeletonText lines={3} />
      </SkeletonRegion>
    )
  }

  if (!read) {
    return (
      <p className="text-[13px] text-text-muted">
        No candle series available for this instrument right now.
      </p>
    )
  }

  const analysis = read.execution
  const narration = narrateInstrument({
    label: meta.displaySymbol,
    execution: analysis,
    executionTimeframe: meta.primaryTimeframe,
    htf: read.htf,
    htfTimeframe: read.biasTimeframe,
    decimals,
    sideConstraint: meta.sideConstraint,
  })
  const trend =
    analysis.trend === 'up' ? 'Bullish' : analysis.trend === 'down' ? 'Bearish' : 'Range'
  const zone =
    analysis.oteZone && !analysis.legInvalidated
      ? `${formatInstrumentPrice(Math.min(analysis.oteZone.from, analysis.oteZone.to), symbol, decimals)} to ${formatInstrumentPrice(Math.max(analysis.oteZone.from, analysis.oteZone.to), symbol, decimals)}`
      : null

  return (
    <div className="content-enter space-y-5">
      <TradeCallCard symbol={symbol} call={read.call} standDown={read.standDown} compact />

      <dl className="border-t border-border text-[13px]">
        <div className="flex items-center justify-between gap-4 border-b border-border py-2.5">
          <dt className="text-text-faint">Structure</dt>
          <dd>
            <Badge
              variant={
                analysis.trend === 'up' ? 'buy' : analysis.trend === 'down' ? 'sell' : 'neutral'
              }
            >
              {trend}
            </Badge>
          </dd>
        </div>
        {analysis.lastEvent ? (
          <div className="flex items-center justify-between gap-4 border-b border-border py-2.5">
            <dt className="text-text-faint">Last Event</dt>
            <dd className="flex flex-wrap items-center justify-end gap-2 text-right">
              <span className="text-text">
                {EVENT_PROSE[analysis.lastEvent.type] ?? analysis.lastEvent.type}
              </span>
              <Badge variant="neutral">{analysis.lastEvent.type}</Badge>
              <span className="tabular-nums text-text">
                {formatInstrumentPrice(analysis.lastEvent.level, symbol, decimals)}
              </span>
            </dd>
          </div>
        ) : null}
        {zone ? (
          <div className="flex items-center justify-between gap-4 border-b border-border py-2.5">
            <dt className="text-text-faint" title="Optimal trade entry">
              OTE Zone ({analysis.trend === 'up' ? 'Long' : 'Short'})
            </dt>
            <dd className="tabular-nums text-text">{zone}</dd>
          </div>
        ) : null}
        {analysis.dealingRange ? (
          <div className="flex items-center justify-between gap-4 border-b border-border py-2.5">
            <dt className="text-text-faint">Dealing Range</dt>
            <dd className="tabular-nums text-text">
              {formatInstrumentPrice(analysis.dealingRange.low, symbol, decimals)} to{' '}
              {formatInstrumentPrice(analysis.dealingRange.high, symbol, decimals)}
            </dd>
          </div>
        ) : null}
      </dl>

      <p className="text-[13px] leading-relaxed text-text-muted">{narration.body}</p>
      <p className="text-xs leading-relaxed text-text-faint">{meta.note}</p>
    </div>
  )
}

export default function MarketsPage() {
  const { quotes, bySymbol } = useInstrumentQuotes()
  const { reads, sweeping } = useSignals()
  const [category, setCategory] = useState('All')
  const [query, setQuery] = useState('')
  const [symbol, setSymbol] = useState(OPENING_SYMBOL)
  const detailRef = useRef(null)

  // Below the large breakpoint the detail sits under the whole book, so a row
  // picked at the top of the list would change something a screen or two
  // down with nothing to show for it. The pick brings the detail up.
  const select = (next) => {
    setSymbol(next)
    if (!window.matchMedia('(min-width: 1024px)').matches) {
      detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  const book = useMemo(() => {
    const normalized = query.trim().toUpperCase()
    return quotes.filter((entry) => {
      const meta = INSTRUMENT_META[entry.symbol]
      const matchesCategory =
        category === 'All' ||
        (category === 'Primary' && meta?.isPrimary) ||
        CLASS_FOR_LABEL[category] === meta?.category
      const matchesQuery =
        !normalized ||
        entry.symbol.includes(normalized) ||
        entry.displaySymbol.includes(normalized) ||
        entry.name.toUpperCase().includes(normalized)
      return matchesCategory && matchesQuery
    })
  }, [quotes, category, query])

  const quote = bySymbol[symbol] ?? null
  const meta = INSTRUMENT_META[symbol]
  const read = reads[symbol] ?? null
  const loading = sweeping && !read

  return (
    <div className="space-y-6">
      <PageHeader
        title="Markets"
        subtitle={`${INSTRUMENTS.length} instruments priced from the broker book. Four carry the calls.`}
        action={<span className="chip-static">Decision support, no execution</span>}
      />

      <div className={cn('grid gap-6 lg:grid-cols-[19rem_minmax(0,1fr)]', PANE)}>
        {/* The book. Filters ride on the rail rather than above the page,
            because they narrow this list and nothing else on the screen. */}
        <section
          aria-label="Instrument book"
          className="panel-static flex max-h-[26rem] min-h-0 flex-col overflow-hidden lg:max-h-none"
        >
          <div className="space-y-2.5 border-b border-border p-3">
            <SearchInput
              value={query}
              onChange={setQuery}
              placeholder="Search the book"
              ariaLabel="Search instruments"
            />
            <SegmentedTabs
              options={CATEGORY_TABS}
              value={category}
              onChange={setCategory}
              ariaLabel="Filter by class"
              className="w-full overflow-x-auto"
            />
          </div>

          <div className="ds-scroll min-h-0 flex-1 overflow-y-auto">
            {book.length === 0 ? (
              <p className="px-3 py-10 text-center text-[13px] text-text-faint">
                Nothing in the book matches that.
              </p>
            ) : (
              book.map((entry) => (
                <BookRow
                  key={entry.symbol}
                  entry={entry}
                  selected={entry.symbol === symbol}
                  onSelect={select}
                />
              ))
            )}
          </div>

          <RuleLabel className="border-t border-border px-3 py-2">
            {book.length} of {quotes.length} shown
          </RuleLabel>
        </section>

        {/* The instrument. Its own scroll, so the book beside it stays put. */}
        <section
          ref={detailRef}
          aria-label={`${meta?.displaySymbol ?? symbol} detail`}
          className="ds-scroll panel-static min-h-0 scroll-mt-4 overflow-y-auto"
        >
          <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3 border-b border-border p-5">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold tabular-nums tracking-tight text-text">
                  {meta?.displaySymbol ?? symbol}
                </h2>
                <Badge variant="neutral">{meta?.primaryTimeframe}</Badge>
                {meta?.isWatchOnly ? <Badge variant="neutral">Watch only</Badge> : null}
                {meta?.sideConstraint ? (
                  <Badge variant={meta.sideConstraint === 'SHORT' ? 'sell' : 'buy'}>
                    {describeSideConstraint(meta.sideConstraint)}
                  </Badge>
                ) : null}
              </div>
              <p className="mt-1 text-[13px] text-text-muted">{meta?.name}</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-semibold tabular-nums leading-none tracking-tighter text-text">
                {quote ? formatInstrumentPrice(quote.price, symbol) : NO_VALUE}
              </p>
              <p className={cn('mt-1.5 text-[13px] tabular-nums', signedColor(quote?.change ?? 0))}>
                {quote ? (
                  <>
                    {quote.change > 0 ? '+' : ''}
                    {formatInstrumentPrice(quote.change, symbol)} ({quote.changePct > 0 ? '+' : ''}
                    {quote.changePct.toFixed(2)}%)
                  </>
                ) : (
                  'No feed'
                )}
              </p>
            </div>
          </header>

          <FigureRow className="rounded-none border-b border-border" min="7.5rem">
            <Figure
              label="Session High"
              value={quote?.high != null ? formatInstrumentPrice(quote.high, symbol) : NO_VALUE}
            />
            <Figure
              label="Session Low"
              value={quote?.low != null ? formatInstrumentPrice(quote.low, symbol) : NO_VALUE}
            />
            <Figure label="Class" value={meta?.category ?? NO_VALUE} />
            <Figure label="Venue" value={quote?.exchange ?? 'No feed'} />
          </FigureRow>

          <div className="border-b border-border p-5">
            {read?.candles ? (
              <ChartInView height={300} label={`${meta?.displaySymbol ?? symbol} price`}>
                {() => (
                  <CandleChart
                    candles={read.candles}
                    analysis={read.execution}
                    height={300}
                    decimals={decimalsForInstrument(symbol)}
                  />
                )}
              </ChartInView>
            ) : loading ? (
              <SkeletonRegion label="Loading the candle series">
                <Skeleton className="h-[300px] rounded-card" />
              </SkeletonRegion>
            ) : (
              <div className="flex h-[300px] items-center justify-center rounded-card border border-dashed border-border">
                <p className="text-[13px] text-text-faint">No candle series for this instrument.</p>
              </div>
            )}
          </div>

          <div className="p-5">
            <RuleLabel as="h3" className="mb-4">
              Structure Read
            </RuleLabel>
            <StructureRead symbol={symbol} read={read} loading={loading} />
          </div>
        </section>
      </div>
    </div>
  )
}
