import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Layers, Trash2, Undo2, Wallet, X } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import Card from '../components/ui/Card'
import Table from '../components/ui/Table'
import { SideBadge } from '../components/ui/Badge'
import { PANEL_TITLE } from '../components/ui/Figures'
import Select from '../components/ui/Select'
import DayStateBanner from '../components/journal/DayStateBanner'
import TradeForm from '../components/journal/TradeForm'
import OpenTradeCard from '../components/journal/OpenTradeCard'
import { useJournal } from '../context/JournalContext'
import { INSTRUMENTS, INSTRUMENT_META } from '../data/instruments'
import { SETUP_TYPES, SETUP_NAMES, SESSIONS } from '../data/riskRules'
import { closedTrades, summarize } from '../lib/journal/stats.js'
import { cn } from '../lib/cn'
import { formatCt } from '../lib/time.js'
import { formatCurrency, formatInstrumentPrice, formatR, signedColor } from '../lib/format'

/** Rows the closed-trade table adds per press of Show More. */
const PAGE_STEP = 50

const INSTRUMENT_OPTIONS = [
  { value: 'ALL', label: 'All Instruments' },
  ...INSTRUMENTS.map((entry) => ({ value: entry.symbol, label: entry.displaySymbol })),
]
const SIDE_OPTIONS = [
  { value: 'ALL', label: 'All Sides' },
  { value: 'BUY', label: 'Long' },
  { value: 'SELL', label: 'Short' },
]
const SETUP_OPTIONS = [
  { value: 'ALL', label: 'All Setups' },
  ...SETUP_TYPES.map((entry) => ({ value: entry.id, label: `${entry.id} (${entry.longLabel})` })),
]
const SESSION_OPTIONS = [
  { value: 'ALL', label: 'All Sessions' },
  ...SESSIONS.map((entry) => ({ value: entry.id, label: entry.label })),
]
const GRADE_OPTIONS = [
  { value: 'ALL', label: 'All Grades' },
  { value: 'A+', label: 'A+' },
  { value: 'A', label: 'A' },
  { value: 'B', label: 'B' },
]

const NO_FILTERS = { instrument: 'ALL', side: 'ALL', setup: 'ALL', session: 'ALL', grade: 'ALL' }

const SMALL_BUTTON =
  'press focus-ring rounded-control border border-border bg-surface-2 px-2 py-1 text-xs font-medium text-text-muted transition-colors hover:text-text'

function describe(trade) {
  const name = INSTRUMENT_META[trade.symbol]?.displaySymbol ?? trade.symbol
  return `${name} ${trade.side === 'BUY' ? 'long' : 'short'}`
}

function EquitySetupCard() {
  return (
    <Card title="Set Up the Account">
      <p className="text-sm leading-relaxed text-text-muted">
        Position risk is sized from account equity, so the journal needs a starting balance before
        the first trade.
      </p>
      <Link
        to="/app/account#equity"
        className="press focus-ring btn-accent mt-4 inline-flex items-center gap-2 rounded-control px-4 py-2 text-sm font-semibold text-on-accent"
      >
        <Wallet className="h-4 w-4" aria-hidden="true" />
        Set Equity
      </Link>
    </Card>
  )
}

/**
 * The delete control on a closed row. Two presses, both in the row: the first
 * asks, the second removes, and the page offers the trade back afterwards.
 * A closed trade with the wrong exit typed into it is otherwise permanent.
 */
function RowDelete({ trade, onDeleted }) {
  const { deleteTrade } = useJournal()
  const [confirming, setConfirming] = useState(false)

  if (confirming) {
    return (
      <span className="inline-flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => {
            deleteTrade(trade.id)
            onDeleted(trade)
          }}
          className="press focus-ring border-danger/50 rounded-control border bg-[var(--ds-danger-soft)] px-2 py-1 text-xs font-medium text-danger transition-colors hover:border-danger"
        >
          Delete
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          aria-label="Keep the trade"
          className="press focus-ring rounded-control border border-border bg-surface-2 p-1 text-text-muted transition-colors hover:text-text"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </span>
    )
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      aria-label={`Delete the ${describe(trade)} closed ${formatCt(trade.closedAt)}`}
      className="press focus-ring rounded-control border border-transparent p-1 text-text-faint transition-colors hover:border-border hover:text-danger"
    >
      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
    </button>
  )
}

export default function JournalPage() {
  const { trades, equity, restoreTrade } = useJournal()
  const [filters, setFilters] = useState(NO_FILTERS)
  const [pageSize, setPageSize] = useState(PAGE_STEP)
  const [removed, setRemoved] = useState(null)

  const setFilter = (key) => (value) => setFilters((previous) => ({ ...previous, [key]: value }))
  const filtering = Object.keys(NO_FILTERS).some((key) => filters[key] !== 'ALL')

  const openTrades = useMemo(() => trades.filter((trade) => trade.status === 'open'), [trades])
  const closed = useMemo(() => closedTrades(trades).reverse(), [trades])

  const visibleTrades = useMemo(
    () =>
      closed.filter(
        (trade) =>
          (filters.instrument === 'ALL' || trade.symbol === filters.instrument) &&
          (filters.side === 'ALL' || trade.side === filters.side) &&
          (filters.setup === 'ALL' || trade.setup === filters.setup) &&
          (filters.session === 'ALL' || trade.session === filters.session) &&
          (filters.grade === 'ALL' || trade.grade === filters.grade)
      ),
    [closed, filters]
  )
  const filteredStats = useMemo(() => summarize(visibleTrades), [visibleTrades])

  // The table renders a page at a time. Every figure above it is computed from
  // the whole filtered set, so what is on screen is a window on the history
  // rather than a different history.
  const pagedTrades = useMemo(() => visibleTrades.slice(0, pageSize), [visibleTrades, pageSize])

  const columns = [
    {
      key: 'symbol',
      header: 'Instrument',
      // Eleven columns scroll sideways on a phone, and the two worth scrolling
      // to are the last two. The column that says which trade the row is has
      // to come with them or the numbers belong to nobody.
      className: 'sticky left-0 z-raised bg-surface group-hover:bg-surface-2',
      headerClassName: 'sticky left-0 z-sticky',
      render: (row) => (
        <span className="flex items-center gap-2">
          <span className="font-mono font-medium text-text">
            {INSTRUMENT_META[row.symbol]?.displaySymbol ?? row.symbol}
          </span>
          {row.grade === 'A+' && (
            <span className="rounded-control bg-[var(--ds-accent-soft)] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-accent-bright">
              A+
            </span>
          )}
          {row.departures?.length > 0 && (
            <span
              className="rounded-control bg-[var(--ds-warning-soft)] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-warning"
              title="Logged outside the rule book"
            >
              Off-Book
            </span>
          )}
        </span>
      ),
    },
    {
      key: 'side',
      header: 'Side',
      render: (row) => <SideBadge side={row.side} />,
    },
    {
      key: 'setup',
      header: 'Setup',
      render: (row) => (
        <span className="font-mono text-text">
          {row.setup}
          {SETUP_NAMES[row.setup] ? (
            <span className="ml-1.5 font-sans text-[11px] text-text-muted">
              {SETUP_NAMES[row.setup]}
            </span>
          ) : null}
        </span>
      ),
    },
    {
      key: 'session',
      header: 'Session',
      render: (row) => <span className="text-text-muted">{row.session}</span>,
    },
    {
      key: 'closedAt',
      header: 'Closed',
      numeric: true,
      render: (row) => (
        <span className="font-mono text-xs tabular-nums text-text-muted">
          {formatCt(row.closedAt)}
        </span>
      ),
    },
    {
      key: 'entry',
      numeric: true,
      header: 'Entry',
      align: 'right',
      render: (row) => (
        <span className="font-mono tabular-nums text-text-muted">
          {formatInstrumentPrice(row.entry, row.symbol)}
        </span>
      ),
    },
    {
      key: 'exitPrice',
      numeric: true,
      header: 'Exit',
      align: 'right',
      render: (row) => (
        <span className="font-mono tabular-nums text-text">
          {formatInstrumentPrice(row.exitPrice, row.symbol)}
        </span>
      ),
    },
    {
      key: 'riskPct',
      numeric: true,
      header: 'Risk',
      align: 'right',
      render: (row) => (
        <span className="font-mono tabular-nums text-text-muted">{row.riskPct.toFixed(2)}%</span>
      ),
    },
    {
      key: 'realizedR',
      numeric: true,
      header: 'R Booked',
      align: 'right',
      render: (row) => (
        <span className={cn('font-mono font-semibold tabular-nums', signedColor(row.realizedR))}>
          {formatR(row.realizedR)}
        </span>
      ),
    },
    {
      key: 'pnl',
      numeric: true,
      header: 'P&L',
      align: 'right',
      render: (row) => (
        <span className={cn('font-mono font-semibold tabular-nums', signedColor(row.pnl))}>
          {formatCurrency(row.pnl, { signed: true })}
        </span>
      ),
    },
    {
      key: 'actions',
      header: <span className="sr-only">Actions</span>,
      align: 'right',
      className: 'w-px',
      render: (row) => <RowDelete trade={row} onDeleted={setRemoved} />,
    },
  ]

  const footer = visibleTrades.length > 0 && (
    <>
      <td colSpan={8} className="px-4 py-3 text-xs uppercase tracking-wide text-text-faint">
        {visibleTrades.length} trades · win rate{' '}
        <span className="font-mono text-text">{Math.round(filteredStats.winRate * 100)}%</span> ·
        expectancy{' '}
        <span className="font-mono text-text">{filteredStats.expectancyR.toFixed(2)}R</span>
      </td>
      <td
        className={cn(
          'px-4 py-3 text-right font-mono font-semibold tabular-nums',
          signedColor(filteredStats.totalR)
        )}
      >
        {formatR(filteredStats.totalR)}
      </td>
      <td
        className={cn(
          'px-4 py-3 text-right font-mono font-semibold tabular-nums',
          signedColor(filteredStats.totalPnl)
        )}
      >
        {formatCurrency(filteredStats.totalPnl, { signed: true })}
      </td>
      <td />
    </>
  )

  return (
    <div className="space-y-5">
      <PageHeader
        title="Journal"
        subtitle={`${openTrades.length} open, ${closed.length} closed. Rules are enforced at entry.`}
        action={<DayStateBanner />}
      />

      {/* A delete is offered back for as long as this stays on screen. The
          journal is only worth what it holds, and a trade removed by a slip
          should cost one press to recover rather than being typed in again. */}
      {removed && (
        <div
          role="status"
          className="bg-surface-2/40 flex flex-wrap items-center justify-between gap-3 rounded-control border border-border px-3 py-2.5 text-sm"
        >
          <span className="text-text-muted">
            Deleted the {describe(removed)}
            {removed.status === 'closed' ? ` closed ${formatCt(removed.closedAt)}` : ''}.
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                restoreTrade(removed)
                setRemoved(null)
              }}
              className={cn(SMALL_BUTTON, 'inline-flex items-center gap-1.5')}
            >
              <Undo2 className="h-3.5 w-3.5" aria-hidden="true" />
              Undo
            </button>
            <button type="button" onClick={() => setRemoved(null)} className={SMALL_BUTTON}>
              Dismiss
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        {equity == null ? <EquitySetupCard /> : <TradeForm />}

        <section
          id="on-the-book"
          className="panel-static flex min-h-0 scroll-mt-4 flex-col overflow-hidden"
        >
          <header className="flex items-center gap-3 border-b border-border bg-surface-2 px-4 py-2.5">
            <h2 className={PANEL_TITLE}>On the Book</h2>
            <div className="min-w-2 flex-1" />
            <span className="inline-flex items-center gap-1.5 text-[11px] text-text-faint">
              <Layers className="h-3.5 w-3.5" aria-hidden="true" />
              {openTrades.length} open
            </span>
          </header>
          <div className="ds-scroll max-h-[34rem] space-y-3 overflow-y-auto p-4">
            {openTrades.length === 0 ? (
              <p className="py-10 text-center text-[13px] text-text-faint">Nothing on the book.</p>
            ) : (
              openTrades.map((trade) => (
                <OpenTradeCard key={trade.id} trade={trade} onDeleted={setRemoved} />
              ))
            )}
          </div>
        </section>
      </div>

      {/* The ledger. Its filters ride on its own head rather than in a card
          above it, so what they narrow is the thing they sit on. */}
      <section className="panel-static overflow-hidden">
        <header className="flex flex-wrap items-center gap-x-4 gap-y-3 border-b border-border bg-surface-2 px-4 py-3">
          <h2 className={PANEL_TITLE}>Closed Trades</h2>
          <div className="min-w-2 flex-1" />
          {closed.length > 0 ? (
            <span className="font-mono text-[11px] tabular-nums text-text-faint">
              {filtering
                ? `${visibleTrades.length} of ${closed.length} shown`
                : `${Math.round(filteredStats.winRate * 100)}% win rate, ${filteredStats.expectancyR.toFixed(2)}R expectancy`}
            </span>
          ) : null}
        </header>

        <div className="flex flex-wrap items-end gap-3 border-b border-border px-4 py-3">
          <div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <Select
              compact
              label="Instrument"
              value={filters.instrument}
              onChange={setFilter('instrument')}
              options={INSTRUMENT_OPTIONS}
            />
            <Select
              compact
              label="Side"
              value={filters.side}
              onChange={setFilter('side')}
              options={SIDE_OPTIONS}
            />
            <Select
              compact
              label="Setup"
              value={filters.setup}
              onChange={setFilter('setup')}
              options={SETUP_OPTIONS}
            />
            <Select
              compact
              label="Session"
              value={filters.session}
              onChange={setFilter('session')}
              options={SESSION_OPTIONS}
            />
            <Select
              compact
              label="Grade"
              value={filters.grade}
              onChange={setFilter('grade')}
              options={GRADE_OPTIONS}
            />
          </div>
          {filtering ? (
            <button
              type="button"
              onClick={() => setFilters(NO_FILTERS)}
              className="press focus-ring inline-flex h-10 items-center gap-1.5 rounded-control bg-surface-2 px-3 text-[13px] font-medium text-text-muted shadow-[var(--ds-edge)] transition-colors duration-200 ease-out [@media(hover:hover)]:hover:text-text"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
              Clear Filters
            </button>
          ) : null}
        </div>

        <Table
          columns={columns}
          rows={pagedTrades}
          footer={footer}
          caption="Closed trades"
          empty={
            filtering
              ? 'No closed trades match these filters.'
              : 'No closed trades yet. The first close lands here.'
          }
        />

        {pagedTrades.length < visibleTrades.length ? (
          <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-3">
            <span className="text-[11px] text-text-faint">
              Showing {pagedTrades.length} of {visibleTrades.length}
            </span>
            <button
              type="button"
              onClick={() => setPageSize((size) => size + PAGE_STEP)}
              className="press focus-ring rounded-control bg-surface-2 px-3 py-1.5 text-[11px] font-medium text-text-muted shadow-[var(--ds-edge)] transition-colors duration-200 ease-out [@media(hover:hover)]:hover:text-text"
            >
              Show More
            </button>
          </div>
        ) : null}
      </section>
    </div>
  )
}
