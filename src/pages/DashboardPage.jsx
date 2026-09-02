import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import Badge from '../components/ui/Badge'
import { Figure, FigureRow } from '../components/ui/Figures'
import EquityCurveChart from '../components/ui/EquityCurveChart'
import ChartInView from '../components/charts/ChartInView'
import DailyBriefing from '../components/ui/DailyBriefing'
import DayStateBanner from '../components/journal/DayStateBanner'
import { useJournal } from '../context/JournalContext'
import { useBriefing } from '../lib/briefing/useBriefing.js'
import { RISK_RULES } from '../data/riskRules'
import { INSTRUMENT_META } from '../data/instruments'
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

const RULE = 'font-mono text-[10px] uppercase tracking-label text-text-faint'

/** A column of rows under one quiet heading, ruled rather than boxed. */
function Ledger({ title, action, empty, children }) {
  return (
    <section className="panel-static flex min-h-0 flex-col overflow-hidden">
      <header className="flex items-center gap-3 border-b border-border px-4 py-2.5">
        <h2 className={RULE}>{title}</h2>
        <div className="min-w-2 flex-1" />
        {action}
      </header>
      {empty ?? <div className="ds-scroll min-h-0 flex-1 overflow-y-auto">{children}</div>}
    </section>
  )
}

export default function DashboardPage() {
  const { trades, equity, settings, dayState, todayPlan } = useJournal()
  const { briefing, loading, refreshing, refresh } = useBriefing({ dayState, plan: todayPlan })

  const closed = useMemo(() => closedTrades(trades), [trades])
  const allTime = useMemo(() => summarize(closed), [closed])
  const curve = useMemo(
    () => (settings.startingEquity != null ? equityCurve(trades, settings.startingEquity) : []),
    [trades, settings.startingEquity]
  )
  const recentClosed = useMemo(() => [...closed].reverse().slice(0, 6), [closed])

  const today = new Intl.DateTimeFormat('en-US', {
    timeZone: DESK_TIME_ZONE,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date())
  const session = sessionForMoment(new Date())

  return (
    <div className="space-y-5">
      <PageHeader
        title="Dashboard"
        subtitle={`${today}, ${session ? `${session} session` : 'between sessions'}`}
        action={<DayStateBanner />}
      />

      {/* The curve carries the page. The two figures that decide whether today
          is going well sit in its frame rather than in a row of tiles above it,
          so the number and the shape it came from are read together. */}
      <section className="panel-static overflow-hidden">
        <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-5 border-b border-border p-5">
          <div>
            <p className={RULE}>Equity</p>
            <p className="mt-1.5 font-mono text-[2rem] font-semibold tabular-nums leading-none tracking-tighter text-text">
              {equity != null ? formatCurrency(equity) : 'Not set'}
            </p>
            <p className="mt-1.5 text-[11px] text-text-faint">
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
            <p className={RULE}>Today</p>
            <p
              className={cn(
                'mt-1.5 font-mono text-[2rem] font-semibold tabular-nums leading-none tracking-tighter',
                signedColor(dayState.realizedPnl)
              )}
            >
              {formatCurrency(dayState.realizedPnl, { signed: true })}
            </p>
            <p className="mt-1.5 text-[11px] text-text-faint">
              {formatR(dayState.realizedR)} realized
            </p>
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

        <FigureRow className="rounded-none border-t border-border" min="9rem">
          <Figure
            label="Open positions"
            value={dayState.openTrades.length}
            note={`${dayState.openRiskPct.toFixed(2)}% risk on book`}
          />
          <Figure
            label="A+ today"
            value={`${dayState.aPlusUsed} of ${RISK_RULES.maxAPlusSetupsPerDay}`}
            note={
              dayState.aPlusCapHit
                ? 'Cap reached'
                : `${dayState.aPlusLeft} slot${dayState.aPlusLeft === 1 ? '' : 's'} left`
            }
          />
          <Figure
            label="Loss budget"
            value={`${dayState.dailyLossBudgetLeftPct.toFixed(2)}%`}
            note={`Limit ${RISK_RULES.dailyLossLimitPct}%`}
            tone={dayState.dailyLossLimitHit ? 'text-danger' : undefined}
          />
          <Figure
            label="Expectancy"
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

      <div className="grid gap-5 xl:grid-cols-2">
        <Ledger
          title="Open Positions"
          action={
            <Link
              to="/app/journal"
              className="focus-ring inline-flex items-center gap-1 rounded-sm text-[11px] font-medium text-accent transition-colors duration-200 ease-out [@media(hover:hover)]:hover:text-accent-bright"
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
                  <Badge variant={trade.side === 'BUY' ? 'buy' : 'sell'}>{trade.side}</Badge>
                  <span className="truncate font-mono text-[13px] font-medium text-text">
                    {INSTRUMENT_META[trade.symbol]?.displaySymbol ?? trade.symbol}
                  </span>
                  <span className="truncate font-mono text-[10px] uppercase tracking-label text-text-faint">
                    {trade.setup}
                  </span>
                </span>
                <span className="font-mono text-[13px] tabular-nums text-text">
                  {formatInstrumentPrice(trade.entry, trade.symbol)}
                </span>
                <span className="col-start-1 font-mono text-[11px] tabular-nums text-text-faint">
                  stop {formatInstrumentPrice(trade.stop, trade.symbol)}
                </span>
                <span className="font-mono text-[11px] tabular-nums text-text-faint">
                  target {formatInstrumentPrice(trade.target, trade.symbol)}
                </span>
              </li>
            ))}
          </ul>
        </Ledger>

        <Ledger
          title="Recently Closed"
          action={<span className="text-[11px] text-text-faint">Last six</span>}
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
                  <Badge variant={trade.side === 'BUY' ? 'buy' : 'sell'}>{trade.side}</Badge>
                  <span className="truncate font-mono text-[13px] font-medium text-text">
                    {INSTRUMENT_META[trade.symbol]?.displaySymbol ?? trade.symbol}
                  </span>
                  <span className="truncate font-mono text-[10px] uppercase tracking-label text-text-faint">
                    {trade.setup}
                  </span>
                </span>
                <span
                  className={cn(
                    'font-mono text-[13px] font-semibold tabular-nums',
                    signedColor(trade.pnl)
                  )}
                >
                  {formatCurrency(trade.pnl, { signed: true })}
                </span>
                <span className="col-start-1 text-[11px] text-text-faint">
                  {formatCt(trade.closedAt)}
                </span>
                <span
                  className={cn('font-mono text-[11px] tabular-nums', signedColor(trade.realizedR))}
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
