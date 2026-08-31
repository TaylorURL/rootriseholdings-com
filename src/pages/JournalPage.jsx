import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Layers, Wallet } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import Card from '../components/ui/Card'
import Table from '../components/ui/Table'
import Badge from '../components/ui/Badge'
import Select from '../components/ui/Select'
import DayStateBanner from '../components/journal/DayStateBanner'
import TradeForm from '../components/journal/TradeForm'
import OpenTradeCard from '../components/journal/OpenTradeCard'
import { useJournal } from '../context/JournalContext'
import { INSTRUMENTS, INSTRUMENT_META } from '../data/instruments'
import { SETUP_TYPES, SESSIONS } from '../data/riskRules'
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
  ...SETUP_TYPES.map((entry) => ({ value: entry.id, label: `${entry.id} — ${entry.longLabel}` })),
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

function EquitySetupCard() {
  return (
    <Card title="Set Up the Account">
      <p className="text-sm leading-relaxed text-text-muted">
        Position risk is sized from account equity, so the journal needs a starting balance before
        the first trade.
      </p>
      <Link
        to="/app/account"
        className="press focus-ring btn-accent mt-4 inline-flex items-center gap-2 rounded-control px-4 py-2 text-sm font-semibold text-on-accent"
      >
        <Wallet className="h-4 w-4" aria-hidden="true" />
        Set Equity
      </Link>
    </Card>
  )
}

export default function JournalPage() {
  const { trades, equity } = useJournal()
  const [instrument, setInstrument] = useState('ALL')
  const [side, setSide] = useState('ALL')
  const [setup, setSetup] = useState('ALL')
  const [session, setSession] = useState('ALL')
  const [grade, setGrade] = useState('ALL')
  const [pageSize, setPageSize] = useState(PAGE_STEP)

  const openTrades = useMemo(() => trades.filter((trade) => trade.status === 'open'), [trades])
  const closed = useMemo(() => closedTrades(trades).reverse(), [trades])

  const visibleTrades = useMemo(
    () =>
      closed.filter(
        (trade) =>
          (instrument === 'ALL' || trade.symbol === instrument) &&
          (side === 'ALL' || trade.side === side) &&
          (setup === 'ALL' || trade.setup === setup) &&
          (session === 'ALL' || trade.session === session) &&
          (grade === 'ALL' || trade.grade === grade)
      ),
    [closed, instrument, side, setup, session, grade]
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
      render: (row) => <Badge variant={row.side === 'BUY' ? 'buy' : 'sell'}>{row.side}</Badge>,
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
      key: 'closedAt',
      header: 'Closed',
      render: (row) => (
        <span className="font-mono text-xs tabular-nums text-text-muted">
          {formatCt(row.closedAt)}
        </span>
      ),
    },
    {
      key: 'entry',
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
      header: 'Risk',
      align: 'right',
      render: (row) => (
        <span className="font-mono tabular-nums text-text-muted">{row.riskPct.toFixed(2)}%</span>
      ),
    },
    {
      key: 'realizedR',
      header: 'R',
      align: 'right',
      render: (row) => (
        <span className={cn('font-mono font-semibold tabular-nums', signedColor(row.realizedR))}>
          {formatR(row.realizedR)}
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
    </>
  )

  return (
    <div className="space-y-5">
      <PageHeader
        title="Journal"
        subtitle={`${openTrades.length} open, ${closed.length} closed. Rules are enforced at entry.`}
        action={<DayStateBanner />}
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        {equity == null ? <EquitySetupCard /> : <TradeForm />}

        <section className="panel-static flex min-h-0 flex-col overflow-hidden">
          <header className="flex items-center gap-3 border-b border-border px-4 py-2.5">
            <h2 className="font-mono text-[10px] uppercase tracking-label text-text-faint">
              On The Book
            </h2>
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
              openTrades.map((trade) => <OpenTradeCard key={trade.id} trade={trade} />)
            )}
          </div>
        </section>
      </div>

      {/* The ledger. Its filters ride on its own head rather than in a card
          above it, so what they narrow is the thing they sit on. */}
      <section className="panel-static overflow-hidden">
        <header className="flex flex-wrap items-center gap-x-4 gap-y-3 border-b border-border px-4 py-3">
          <h2 className="font-mono text-[10px] uppercase tracking-label text-text-faint">
            Closed Trades
          </h2>
          <div className="min-w-2 flex-1" />
          {closed.length > 0 ? (
            <span className="font-mono text-[11px] tabular-nums text-text-faint">
              {Math.round(filteredStats.winRate * 100)}% win rate,{' '}
              {filteredStats.expectancyR.toFixed(2)}R expectancy
            </span>
          ) : null}
        </header>

        <div className="grid gap-3 border-b border-border px-4 py-3 sm:grid-cols-3 lg:grid-cols-5">
          <Select
            label="Instrument"
            value={instrument}
            onChange={setInstrument}
            options={INSTRUMENT_OPTIONS}
          />
          <Select label="Side" value={side} onChange={setSide} options={SIDE_OPTIONS} />
          <Select label="Setup" value={setup} onChange={setSetup} options={SETUP_OPTIONS} />
          <Select label="Session" value={session} onChange={setSession} options={SESSION_OPTIONS} />
          <Select label="Grade" value={grade} onChange={setGrade} options={GRADE_OPTIONS} />
        </div>

        <Table
          columns={columns}
          rows={pagedTrades}
          footer={footer}
          caption="Closed trades"
          empty="No closed trades yet. The first close lands here."
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
