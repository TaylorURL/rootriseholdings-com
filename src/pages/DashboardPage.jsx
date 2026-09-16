import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Newspaper, NotebookPen, Radio, TrendingUp } from 'lucide-react'
import { SideBadge } from '../components/ui/Badge'
import { Figure, FigureRow, PANEL_TITLE, RuleLabel } from '../components/ui/Figures'
import StandingCalls from '../components/signals/StandingCalls'
import EquityCurveChart from '../components/charts/EquityCurveChart'
import ChartInView from '../components/charts/ChartInView'
import DailyBriefing from '../components/briefing/DailyBriefing'
import DayStateBanner from '../components/journal/DayStateBanner'
import { useJournal } from '../context/JournalContext'
import { useSignals } from '../context/SignalsContext'
import { useBriefing } from '../lib/briefing/useBriefing.js'
import { SETTLED } from '../lib/signals/model.js'
import { INSTRUMENT_META } from '../data/instruments'
import { SETUP_NAMES } from '../data/riskRules'
import { closedTrades, equityCurve, summarize } from '../lib/journal/stats.js'
import { DESK_TIME_ZONE, formatCt, sessionForMoment } from '../lib/time.js'
import { cn } from '../lib/cn'
import {
  formatCurrency,
  formatInstrumentPrice,
  formatR,
  signedColor,
  NO_VALUE,
} from '../lib/format'

/**
 * The four places a session goes from here, as the kit's row of coloured icon
 * tiles. Each is a link with its own name, so the colour is decoration and the
 * destination is still announced.
 */
const SHORTCUTS = [
  { to: '/app/briefing', label: 'Briefing', icon: Newspaper, tile: 'icon-tile-blue' },
  { to: '/app/markets', label: 'Markets', icon: TrendingUp, tile: 'icon-tile-orange' },
  { to: '/app/signals', label: 'Signals', icon: Radio, tile: 'icon-tile-yellow' },
  { to: '/app/journal', label: 'Journal', icon: NotebookPen, tile: '' },
]

/** A column of rows under one heading, ruled rather than boxed. */
function Ledger({ title, action, empty, children }) {
  return (
    <section className="panel-static flex min-h-0 flex-col overflow-hidden">
      <header className="flex items-center gap-3 px-5 pb-2 pt-5">
        <h2 className={PANEL_TITLE}>{title}</h2>
        <div className="min-w-2 flex-1" />
        {action}
      </header>
      {empty ?? <div className="ds-scroll min-h-0 flex-1 overflow-y-auto">{children}</div>}
    </section>
  )
}

export default function DashboardPage() {
  const { trades, equity, settings, dayState, todayPlan } = useJournal()
  const { signals, recordError, deskSweep } = useSignals()
  const { briefing, loading, refreshing, refresh } = useBriefing({ dayState, plan: todayPlan })

  const closed = useMemo(() => closedTrades(trades), [trades])
  const allTime = useMemo(() => summarize(closed), [closed])
  const curve = useMemo(
    () => (settings.startingEquity != null ? equityCurve(trades, settings.startingEquity) : []),
    [trades, settings.startingEquity]
  )
  const recentClosed = useMemo(() => [...closed].reverse().slice(0, 6), [closed])
  const standing = useMemo(
    () =>
      signals
        .filter((signal) => !SETTLED.has(signal.status))
        .sort((a, b) => b.emittedAt - a.emittedAt),
    [signals]
  )

  const today = new Intl.DateTimeFormat('en-US', {
    timeZone: DESK_TIME_ZONE,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date())
  const session = sessionForMoment(new Date())

  return (
    <div className="space-y-6">
      {/* The page opens the way the kit's dashboard does: the day, said large,
          with the ways out of it beside it. */}
      <section className="panel-static flex flex-wrap items-end justify-between gap-x-8 gap-y-5 p-5">
        <div className="min-w-0">
          <h2 className="text-[1.875rem] font-bold leading-[2.375rem] text-text">{today}</h2>
          <p className="mt-2 text-base text-text">
            {session ? `${session} session` : 'Between sessions'}
          </p>
        </div>
        <nav aria-label="Desk Shortcuts" className="flex gap-2">
          {SHORTCUTS.map(({ to, label, icon: Icon, tile }) => (
            <Link
              key={to}
              to={to}
              aria-label={label}
              title={label}
              className={cn('icon-tile press focus-ring h-10 w-10', tile)}
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
            </Link>
          ))}
        </nav>
      </section>

      <DayStateBanner />

      {/* Whether there is a call, on what, and at what price is the only thing
          on this page that is time critical. It opens the page for that reason:
          everything under it is the record of decisions already taken, and none
          of it needs acting on in the next thirty seconds. */}
      <StandingCalls
        signals={standing}
        sweep={deskSweep}
        recordError={recordError}
        compact
        action={
          <Link
            to="/app/signals"
            className="focus-ring inline-flex items-center gap-1 rounded-sm text-sm font-bold text-accent transition-colors duration-200 ease-out [@media(hover:hover)]:hover:text-accent-bright"
          >
            Open Signals
            <ArrowRight className="h-3 w-3" aria-hidden="true" />
          </Link>
        }
      />

      {/* The curve carries the page. The two figures that decide whether today
          is going well sit in its frame rather than in a row of tiles above it,
          so the number and the shape it came from are read together. */}
      <section className="panel-static overflow-hidden">
        <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-5 border-b border-border p-5">
          <div>
            <RuleLabel>Equity</RuleLabel>
            <p className="mt-1.5 text-[1.875rem] font-bold tabular-nums leading-none text-text">
              {equity != null ? formatCurrency(equity) : 'Not set'}
            </p>
            <p className="mt-1.5 text-xs text-text-faint">
              {equity == null ? (
                <Link
                  to="/app/account#equity"
                  className="focus-ring rounded-sm text-accent transition-colors duration-200 ease-out [@media(hover:hover)]:hover:text-accent-bright"
                >
                  Set a starting equity under Account
                </Link>
              ) : (
                'Starting plus realized'
              )}
            </p>
          </div>
          <div>
            <RuleLabel>Today</RuleLabel>
            <p
              className={cn(
                'mt-1.5 text-[1.875rem] font-bold tabular-nums leading-none',
                signedColor(dayState.realizedPnl)
              )}
            >
              {formatCurrency(dayState.realizedPnl, { signed: true })}
            </p>
            <p className="mt-1.5 text-xs text-text-faint">{formatR(dayState.realizedR)} realized</p>
          </div>
          <div className="min-w-2 flex-1" />
          <span className="chip-static">Realized, by CT day</span>
        </div>

        <div className="p-5">
          {curve.length >= 2 ? (
            <ChartInView height={260} label="Equity curve">
              {() => <EquityCurveChart data={curve} height={260} />}
            </ChartInView>
          ) : (
            <p className="py-16 text-center text-[13px] text-text-faint">
              The curve draws once two trading days have closed trades.
            </p>
          )}
        </div>

        {/* The day's two budgets are on the banner at the top of this page, so
            they are not restated here. One fact stated two ways on one screen
            is most of what makes a dense page read as noise. */}
        <FigureRow className="rounded-none border-t border-border" min="12rem">
          <Figure
            label="Open Positions"
            value={dayState.openTrades.length}
            note={`${dayState.openRiskPct.toFixed(2)}% risk on book`}
          />
          <Figure
            label="Expectancy"
            title="Average R booked per closed trade"
            value={closed.length > 0 ? `${allTime.expectancyR.toFixed(2)}R` : NO_VALUE}
            note={closed.length > 0 ? `${closed.length} closed` : 'No closed trades yet'}
            tone={
              closed.length > 0
                ? allTime.expectancyR >= 0
                  ? 'text-positive'
                  : 'text-danger'
                : undefined
            }
          />
        </FigureRow>
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <Ledger
          title="Open Positions"
          action={
            <Link
              to="/app/journal"
              className="focus-ring inline-flex items-center gap-1 rounded-sm text-sm font-bold text-accent transition-colors duration-200 ease-out [@media(hover:hover)]:hover:text-accent-bright"
            >
              Open Journal
              <ArrowRight className="h-3 w-3" aria-hidden="true" />
            </Link>
          }
          empty={
            dayState.openTrades.length === 0 ? (
              <p className="px-4 py-10 text-center text-[13px] text-text-faint">
                Nothing on the book.
              </p>
            ) : null
          }
        >
          <ul>
            {dayState.openTrades.map((trade) => (
              <li
                key={trade.id}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 border-b border-border px-4 py-3 last:border-b-0"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <SideBadge side={trade.side} />
                  <span className="truncate text-[13px] font-medium tabular-nums text-text">
                    {INSTRUMENT_META[trade.symbol]?.displaySymbol ?? trade.symbol}
                  </span>
                  <span
                    title={SETUP_NAMES[trade.setup]}
                    className="truncate text-xs tabular-nums text-text-faint"
                  >
                    {trade.setup}
                  </span>
                </span>
                <span className="text-right text-[13px] tabular-nums text-text">
                  {formatInstrumentPrice(trade.entry, trade.symbol)}
                </span>
                <span className="col-start-1 text-xs tabular-nums text-text-faint">
                  stop {formatInstrumentPrice(trade.stop, trade.symbol)}
                </span>
                <span className="text-right text-xs tabular-nums text-text-faint">
                  target {formatInstrumentPrice(trade.target, trade.symbol)}
                </span>
              </li>
            ))}
          </ul>
        </Ledger>

        <Ledger
          title="Recently Closed"
          action={<span className="text-xs text-text-faint">Last six</span>}
          empty={
            recentClosed.length === 0 ? (
              <p className="px-4 py-10 text-center text-[13px] text-text-faint">
                Closed trades land here.
              </p>
            ) : null
          }
        >
          <ul>
            {recentClosed.map((trade) => (
              <li
                key={trade.id}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 border-b border-border px-4 py-3 last:border-b-0"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <SideBadge side={trade.side} />
                  <span className="truncate text-[13px] font-medium tabular-nums text-text">
                    {INSTRUMENT_META[trade.symbol]?.displaySymbol ?? trade.symbol}
                  </span>
                  <span
                    title={SETUP_NAMES[trade.setup]}
                    className="truncate text-xs tabular-nums text-text-faint"
                  >
                    {trade.setup}
                  </span>
                </span>
                <span
                  className={cn(
                    'text-right text-[13px] font-semibold tabular-nums',
                    signedColor(trade.pnl)
                  )}
                >
                  {formatCurrency(trade.pnl, { signed: true })}
                </span>
                <span className="col-start-1 text-xs text-text-faint">
                  {formatCt(trade.closedAt)}
                </span>
                <span
                  className={cn('text-right text-xs tabular-nums', signedColor(trade.realizedR))}
                >
                  {formatR(trade.realizedR)}
                </span>
              </li>
            ))}
          </ul>
        </Ledger>
      </div>

      <DailyBriefing
        briefing={briefing}
        loading={loading}
        variant="compact"
        refreshing={refreshing}
        onRefresh={refresh}
      />
    </div>
  )
}
