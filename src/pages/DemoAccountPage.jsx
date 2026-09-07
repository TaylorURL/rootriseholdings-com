import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import { SideBadge } from '../components/ui/Badge'
import { Figure, FigureRow, PANEL_TITLE, RuleLabel } from '../components/ui/Figures'
import EquityCurveChart from '../components/charts/EquityCurveChart'
import ChartInView from '../components/charts/ChartInView'
import { useSignals } from '../context/SignalsContext'
import { buildDemoBook, DEMO_BOOK } from '../lib/demo/book.js'
import { INSTRUMENT_META, decimalsForInstrument } from '../data/instruments'
import { SETUP_NAMES } from '../data/riskRules'
import { formatCt } from '../lib/time.js'
import { cn } from '../lib/cn'
import {
  formatCurrency,
  formatInstrumentPrice,
  formatR,
  signedColor,
  NO_VALUE,
} from '../lib/format'

/**
 * The demo book: the published record, priced as a fifty-thousand-dollar
 * account.
 *
 * Every number on this page is arithmetic over `public.signals`, which the
 * browser cannot write and this page cannot filter. That is the whole claim the
 * page makes, and the note at the foot says it in the words a reader would use,
 * because a track record nobody can check is a marketing asset rather than
 * evidence.
 */

const price = (value, symbol) => formatInstrumentPrice(value, symbol, decimalsForInstrument(symbol))

/** A column of rows under one quiet heading, matching the dashboard's ledgers. */
function Ledger({ title, action, empty, children }) {
  return (
    <section className="panel-static flex min-h-0 flex-col overflow-hidden">
      <header className="flex items-center gap-3 border-b border-border bg-surface-2 px-4 py-2.5">
        <h2 className={PANEL_TITLE}>{title}</h2>
        <div className="min-w-2 flex-1" />
        {action}
      </header>
      {empty ?? <div className="ds-scroll min-h-0 flex-1 overflow-y-auto">{children}</div>}
    </section>
  )
}

/**
 * What the page says before the record has anything in it.
 *
 * An empty book and a broken desk look identical from here, and the reader in
 * front of an empty screen is exactly the one who needs them told apart - so
 * the heartbeat is read out rather than left implied. A sweep that ran a minute
 * ago and published nothing is a desk that looked and found nothing worth
 * calling; no sweep at all is a desk that is not running.
 */
function NoTradesYet({ sweep }) {
  const swept = sweep?.ranAt ? formatCt(sweep.ranAt, { hour: '2-digit', minute: '2-digit' }) : null

  return (
    <div className="flex flex-col items-start gap-3 px-4 py-10 sm:px-6">
      <p className="text-[13px] text-text">The book has not taken a trade yet.</p>
      <p className="max-w-prose text-[13px] text-text-muted">
        The book opens on {formatCurrency(DEMO_BOOK.startingEquity, { decimals: 0 })} and moves only
        when a published call is filled and then answered by the tape. Until the desk publishes one,
        there is nothing to price.
      </p>
      {sweep ? (
        <p className="font-mono text-[11px] text-text-faint">
          Last sweep {swept} · read {sweep.read} of {sweep.instruments} instruments · published{' '}
          {sweep.published}
        </p>
      ) : (
        <p className="font-mono text-[11px] text-danger">
          The desk has not reported a sweep. Nothing is reading the market.
        </p>
      )}
    </div>
  )
}

function TradeRow({ trade }) {
  const meta = INSTRUMENT_META[trade.symbol]
  const won = (trade.realisedR ?? 0) > 0

  return (
    <div className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 border-b border-border px-4 py-3 last:border-b-0 sm:grid-cols-[9rem_1fr_auto_auto]">
      <div className="flex items-center gap-2">
        <SideBadge side={trade.side} />
        <span className="font-mono text-[13px] font-medium text-text">
          {meta?.displaySymbol ?? trade.symbol}
        </span>
      </div>

      <p className="order-last col-span-2 font-mono text-[11px] text-text-faint sm:order-none sm:col-span-1">
        <span title={SETUP_NAMES[trade.setup] ?? trade.setup}>{trade.setup}</span>
        {' · '}
        {price(trade.entry, trade.symbol)} → {price(trade.target, trade.symbol)}
        {' · '}
        {formatCt(trade.resolvedAt, {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })}
      </p>

      <span
        className={cn(
          'text-right font-mono text-[13px] tabular-nums',
          signedColor(trade.realisedR)
        )}
      >
        {formatR(trade.realisedR)}
      </span>
      <span
        className={cn(
          'text-right font-mono text-[13px] font-semibold tabular-nums',
          won ? 'text-positive' : 'text-danger'
        )}
      >
        {formatCurrency(trade.pnl, { signed: true, decimals: 0 })}
      </span>
    </div>
  )
}

function OpenRow({ trade }) {
  const meta = INSTRUMENT_META[trade.symbol]
  return (
    <div className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-b-0">
      <SideBadge side={trade.side} />
      <span className="font-mono text-[13px] font-medium text-text">
        {meta?.displaySymbol ?? trade.symbol}
      </span>
      <span className="truncate font-mono text-[11px] text-text-faint">
        filled {price(trade.entry, trade.symbol)} · stop {price(trade.stop, trade.symbol)} · target{' '}
        {price(trade.target, trade.symbol)}
      </span>
      <div className="min-w-2 flex-1" />
      <span className="shrink-0 text-right font-mono text-[12px] tabular-nums text-text-muted">
        {formatCurrency(trade.risk, { decimals: 0 })} at risk
      </span>
    </div>
  )
}

export default function DemoAccountPage() {
  const { signals, recordError, deskSweep } = useSignals()
  const book = useMemo(() => buildDemoBook(signals), [signals])
  const { stats } = book
  const traded = stats.trades > 0

  return (
    <div className="space-y-5">
      <PageHeader
        title="Demo Account"
        subtitle={`Every published call, sized at ${(DEMO_BOOK.riskPerTrade * 100).toFixed(0)}% risk against a ${formatCurrency(DEMO_BOOK.startingEquity, { decimals: 0 })} book.`}
        action={
          <Link
            to="/app/signals"
            className="flex items-center gap-1 font-mono text-[11px] uppercase tracking-label text-text-muted transition-colors hover:text-text"
          >
            The record <ArrowRight className="h-3 w-3" aria-hidden="true" />
          </Link>
        }
      />

      {recordError ? (
        <p className="panel-static px-4 py-3 text-[13px] text-danger">
          The record could not be read: {recordError}
        </p>
      ) : null}

      <FigureRow min="7.5rem">
        <Figure
          label="Balance"
          value={formatCurrency(book.equity, { decimals: 0 })}
          tone={traded ? signedColor(stats.netPnl) : undefined}
          note={`Opened at ${formatCurrency(DEMO_BOOK.startingEquity, { decimals: 0 })}`}
        />
        <Figure
          label="Net P&L"
          value={traded ? formatCurrency(stats.netPnl, { signed: true, decimals: 0 }) : NO_VALUE}
          tone={signedColor(stats.netPnl)}
          note={traded ? `${stats.returnPct >= 0 ? '+' : ''}${stats.returnPct.toFixed(2)}%` : null}
        />
        <Figure label="Trades" value={stats.trades} note={`${stats.wins}W / ${stats.losses}L`} />
        <Figure
          label="Win Rate"
          value={stats.winRate == null ? NO_VALUE : `${(stats.winRate * 100).toFixed(0)}%`}
        />
        <Figure
          label="Total R"
          value={traded ? formatR(stats.totalR) : NO_VALUE}
          tone={signedColor(stats.totalR)}
          note={stats.averageR == null ? null : `${formatR(stats.averageR)} average`}
        />
        <Figure
          label="Max Drawdown"
          title="The deepest fall from a peak the book reached"
          value={traded ? formatCurrency(-stats.maxDrawdown, { decimals: 0 }) : NO_VALUE}
          tone={stats.maxDrawdown > 0 ? 'text-danger' : undefined}
          note={traded ? `${stats.maxDrawdownPct.toFixed(1)}% of peak` : null}
        />
      </FigureRow>

      <section className="panel-static overflow-hidden">
        <header className="flex items-center gap-3 border-b border-border bg-surface-2 px-4 py-2.5">
          <h2 className={PANEL_TITLE}>Equity Curve</h2>
          <div className="min-w-2 flex-1" />
          <RuleLabel>
            {stats.published} Published · {stats.expired} Expired
          </RuleLabel>
        </header>
        {traded ? (
          <div className="p-4">
            <ChartInView height={300} label="Equity curve">
              {() => <EquityCurveChart data={book.curve} height={300} showYAxis />}
            </ChartInView>
          </div>
        ) : (
          <NoTradesYet sweep={deskSweep} />
        )}
      </section>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Ledger
          title="Closed Trades"
          action={<RuleLabel>{stats.trades}</RuleLabel>}
          empty={
            traded ? null : (
              <p className="px-4 py-8 text-[13px] text-text-muted">Nothing has settled yet.</p>
            )
          }
        >
          {[...book.closed].reverse().map((trade) => (
            <TradeRow key={trade.id} trade={trade} />
          ))}
        </Ledger>

        <Ledger
          title="Open Positions"
          action={<RuleLabel>{stats.openCount}</RuleLabel>}
          empty={
            book.open.length ? null : (
              <p className="px-4 py-8 text-[13px] text-text-muted">
                The book is flat. Nothing is filled and waiting on the tape.
              </p>
            )
          }
        >
          {book.open.map((trade) => (
            <OpenRow key={trade.id} trade={trade} />
          ))}
        </Ledger>
      </div>

      <p className="max-w-prose text-[12px] leading-relaxed text-text-faint">
        Hypothetical performance. No money is at risk in this book and no order was ever placed.
        Every trade on it is a call the desk published to the record before the outcome was known,
        scored against the bars that printed afterwards, and sized at{' '}
        {(DEMO_BOOK.riskPerTrade * 100).toFixed(0)}% of the balance standing when it opened. A bar
        that touched both the stop and the target is booked as the stop. Hypothetical results carry
        none of the slippage, spread, commission or execution risk of a funded account, and nothing
        here is a representation that any account will or is likely to achieve comparable results.
      </p>
    </div>
  )
}
