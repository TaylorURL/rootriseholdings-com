import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Newspaper, NotebookPen, Radio, TrendingUp } from 'lucide-react'
import { SideBadge } from '../components/ui/Badge'
import { Figure, FigureRow, PANEL_TITLE } from '../components/ui/Figures'
import Card from '../components/ui/Card'
import StandingCalls from '../components/signals/StandingCalls'
import EquityCurveChart from '../components/charts/EquityCurveChart'
import ChartInView from '../components/charts/ChartInView'
import DailyBriefing from '../components/briefing/DailyBriefing'
import DayStatusPanel from '../components/journal/DayStatusPanel'
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
 * The four places a session goes from here. Each is named on the control
 * itself, so a reader does not have to learn what an icon means.
 */
const SHORTCUTS = [
  { to: '/app/briefing', label: 'Briefing', icon: Newspaper },
  { to: '/app/markets', label: 'Markets', icon: TrendingUp },
  { to: '/app/signals', label: 'Signals', icon: Radio },
  { to: '/app/journal', label: 'Journal', icon: NotebookPen },
]

/** A column of rows under one heading, ruled rather than boxed. */
function Ledger({ title, subtitle, action, empty, children }) {
  return (
    <section className="panel-static flex min-h-0 flex-col overflow-hidden">
      <header className="flex items-start gap-3 px-5 pb-3 pt-4">
        <div className="min-w-0">
          <h2 className={PANEL_TITLE}>{title}</h2>
          {subtitle ? <p className="mt-0.5 text-xs text-text-faint">{subtitle}</p> : null}
        </div>
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
    <div className="space-y-5">
      {/* The page opens on the day, with the ways out of it beside it. */}
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
        <div className="min-w-0">
          <h2 className="text-xl font-semibold tracking-tight text-text">{today}</h2>
          <p className="mt-1 text-[13px] text-text-muted">
            {session ? `${session} session` : 'Between sessions'}
          </p>
        </div>
        <nav aria-label="Desk Shortcuts" className="flex flex-wrap gap-2">
          {SHORTCUTS.map(({ to, label, icon: Icon }) => (
            <Link key={to} to={to} className="btn btn-secondary press focus-ring min-h-8 px-3">
              <Icon className="h-3.5 w-3.5 text-text-faint" aria-hidden="true" />
              {label}
            </Link>
          ))}
        </nav>
      </div>

      {/* The headline figures, read left to right in the order a trader asks
          them: what the account is worth, how today is going, what is at
          risk, and whether the method is paying. */}
      <FigureRow min="11rem">
        <Figure
          size="lg"
          label="Equity"
          value={equity != null ? formatCurrency(equity) : 'Not set'}
          note={
            equity == null ? (
              <Link
                to="/app/account#equity"
                className="focus-ring rounded-sm text-accent transition-colors duration-200 ease-out [@media(hover:hover)]:hover:text-accent-bright"
              >
                Set a starting equity under Account
              </Link>
            ) : (
              'Starting plus realized'
            )
          }
        />
        <Figure
          size="lg"
          label="Today"
          value={formatCurrency(dayState.realizedPnl, { signed: true })}
          tone={signedColor(dayState.realizedPnl)}
          note={`${formatR(dayState.realizedR)} realized`}
        />
        <Figure
          size="lg"
          label="Open Positions"
          value={dayState.openTrades.length}
          note={`${dayState.openRiskPct.toFixed(2)}% risk on book`}
        />
        <Figure
          size="lg"
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
        <Figure
          size="lg"
          label="Win Rate"
          value={closed.length > 0 ? `${(allTime.winRate * 100).toFixed(1)}%` : NO_VALUE}
          note={
            closed.length > 0
              ? `${allTime.wins} of ${closed.length} trades`
              : 'No closed trades yet'
          }
        />
      </FigureRow>

      <div className="grid gap-5 xl:grid-cols-3">
        {/* The curve carries the page, with the day's rule book beside it so
            the shape of the account and the room left today are read together. */}
        <Card
          title="Equity Curve"
          subtitle="Account balance in USD, realized, by CT day"
          className="xl:col-span-2"
        >
          {curve.length >= 2 ? (
            <ChartInView height={280} label="Equity curve">
              {() => <EquityCurveChart data={curve} start={settings.startingEquity} height={280} />}
            </ChartInView>
          ) : (
            <p className="py-16 text-center text-[13px] text-text-faint">
              The curve draws once two trading days have closed trades.
            </p>
          )}
        </Card>
        <DayStatusPanel />
      </div>

      {/* Whether there is a call, on what, and at what price is the only thing
          on this page that is time critical, so it follows the headline. */}
      <StandingCalls
        signals={standing}
        sweep={deskSweep}
        recordError={recordError}
        compact
        action={
          <Link
            to="/app/signals"
            className="focus-ring inline-flex items-center gap-1 rounded-sm text-xs font-medium text-accent transition-colors duration-200 ease-out [@media(hover:hover)]:hover:text-accent-bright"
          >
            Open Signals
            <ArrowRight className="h-3 w-3" aria-hidden="true" />
          </Link>
        }
      />

      <div className="grid items-start gap-5 xl:grid-cols-2">
        <Ledger
          title="Open Positions"
          subtitle="Entry, stop and target at the instrument's precision"
          action={
            <Link
              to="/app/journal"
              className="focus-ring inline-flex items-center gap-1 rounded-sm text-xs font-medium text-accent transition-colors duration-200 ease-out [@media(hover:hover)]:hover:text-accent-bright"
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
          subtitle="Last six, result in USD and R"
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
