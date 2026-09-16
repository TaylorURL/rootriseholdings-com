import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  Hash,
  Trophy,
  Percent,
  Wallet,
  Calculator,
  Scale,
  Target,
  TrendingDown,
  CalendarClock,
  Award,
  ArrowRight,
  OctagonAlert,
} from 'lucide-react'
import ChartInView from '../components/charts/ChartInView'
import { AXIS_TICK, GRID_STROKE } from '../components/charts/chartTheme'
import PageHeader from '../components/ui/PageHeader'
import Card from '../components/ui/Card'
import { Figure, FigureRow, RuleLabel, RULE_LABEL } from '../components/ui/Figures'
import Badge from '../components/ui/Badge'
import { ChartTooltipShell } from '../components/charts/ChartTooltip'
import { useJournal } from '../context/JournalContext'
import { SETUP_TYPES, SESSIONS } from '../data/riskRules'
import { INSTRUMENT_META, INSTRUMENTS } from '../data/instruments'
import { closedTrades, summarize, breakdownBy, dailyPnl, streaks } from '../lib/journal/stats.js'
import { evaluatePropFirm } from '../lib/journal/propFirm.js'
import { cn } from '../lib/cn'
import { formatCt } from '../lib/time.js'
import { formatCurrency, formatR, signedColor, NO_VALUE } from '../lib/format'

function DailyTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const { date, pnl, r } = payload[0].payload
  return (
    <ChartTooltipShell>
      <p className="tabular-nums text-text-faint">{date}</p>
      <p className={cn('font-semibold tabular-nums', signedColor(pnl))}>
        {formatCurrency(pnl, { signed: true })} · {formatR(r)}
      </p>
    </ChartTooltipShell>
  )
}

function BreakdownCard({ title, rows, hint }) {
  return (
    <section className="bg-surface p-5">
      <header className="mb-4 flex items-center gap-3">
        <RuleLabel as="h2">{title}</RuleLabel>
        <div className="min-w-2 flex-1" />
        {hint ? <span className="text-xs text-text-faint">{hint}</span> : null}
      </header>
      {rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-text-faint">
          No closed trades in this cut yet.
        </p>
      ) : (
        <ul className="space-y-2">
          {rows.map((row) => (
            <li
              key={row.key}
              className="bg-surface-2/40 flex items-center justify-between gap-3 rounded-control border border-border px-3 py-2.5"
            >
              {/* The count is pinned to its own width so everything after it
                  starts in the same place, which is what lets a column of win
                  rates be read down rather than one row at a time. */}
              <div className="min-w-0 leading-tight">
                <p className="truncate text-sm font-medium text-text">{row.label}</p>
                <p className="text-xs text-text-faint">
                  <span className="inline-block w-[3ch] text-right tabular-nums">{row.trades}</span>{' '}
                  trades · win rate{' '}
                  <span className="inline-block w-[4ch] text-right tabular-nums">
                    {Math.round(row.winRate * 100)}%
                  </span>
                </p>
              </div>
              <div className="text-right">
                <p
                  className={cn('text-sm font-semibold tabular-nums', signedColor(row.expectancyR))}
                >
                  {row.expectancyR.toFixed(2)}R
                </p>
                <p className={cn('text-xs tabular-nums', signedColor(row.totalPnl))}>
                  {formatCurrency(row.totalPnl, { signed: true })}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function ProgressTile({ label, icon: Icon, current, target, formatter, intent = 'accent', sub }) {
  const pct = target > 0 ? Math.max(0, Math.min(100, (current / target) * 100)) : 0
  const formatValue = formatter ?? ((value) => formatCurrency(Math.abs(value)))
  const barClass =
    intent === 'danger' ? 'bg-danger' : intent === 'warning' ? 'bg-warning' : 'accent-face'
  // Gaps live on the stack rather than on each child, so the optional caption
  // does not leave its margin behind when a firm omits it.
  return (
    <div className="bg-surface-2/40 flex flex-col gap-2 rounded-card border border-border p-4">
      <div className="flex items-center justify-between gap-3">
        <span className={cn('inline-flex items-center gap-2', RULE_LABEL)}>
          <Icon className="h-3.5 w-3.5" aria-hidden="true" />
          {label}
        </span>
        <span className="text-xs tabular-nums text-text-muted">{pct.toFixed(0)}%</span>
      </div>
      <p className="text-xl font-semibold tabular-nums text-text">
        {formatValue(current)}
        <span className="ml-1.5 text-sm font-medium text-text-faint">/ {formatValue(target)}</span>
      </p>
      <div
        className="h-2 overflow-hidden rounded-full bg-surface-2"
        role="meter"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        <div
          className={cn('h-full rounded-full transition-[width] duration-200 ease-out', barClass)}
          style={{ width: `${pct}%` }}
        />
      </div>
      {sub && <p className="text-xs text-text-faint">{sub}</p>}
    </div>
  )
}

function PropFirmCard({ firm, trades }) {
  const snapshot = evaluatePropFirm(firm, trades)
  return (
    <Card
      title="Prop Firm Tracking"
      action={firm.programName ? <Badge variant="accent">{firm.programName}</Badge> : null}
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <RuleLabel>Firm</RuleLabel>
            <p className="mt-1 font-medium text-text">{firm.firmName}</p>
            {firm.startedAt ? (
              <p className="text-xs text-text-faint">
                Since {formatCt(`${firm.startedAt}T12:00:00-05:00`, { dateStyle: 'medium' })}
              </p>
            ) : null}
          </div>
          <div className="text-right">
            <RuleLabel>Balance</RuleLabel>
            <p
              className={cn(
                'mt-1 tabular-nums',
                snapshot.drawdownBusted ? 'text-danger' : 'text-text'
              )}
            >
              {formatCurrency(snapshot.balance)}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <ProgressTile
            label="Profit Target"
            icon={Target}
            current={Math.max(0, snapshot.profitMade)}
            target={snapshot.profitTarget}
            sub={
              snapshot.targetReached
                ? 'Target reached.'
                : `${formatCurrency(snapshot.targetRemaining)} to go`
            }
          />
          <ProgressTile
            label={`${firm.drawdownType === 'trailing' ? 'Trailing' : 'Static'} Drawdown Used`}
            icon={TrendingDown}
            current={snapshot.drawdownUsed}
            target={firm.maxDrawdown}
            intent={snapshot.drawdownUsed / firm.maxDrawdown > 0.6 ? 'danger' : 'accent'}
            sub={`Floor ${formatCurrency(snapshot.drawdownFloor)} · buffer ${formatCurrency(snapshot.drawdownBuffer)}`}
          />
          {firm.dailyLossLimit != null && (
            <ProgressTile
              label="Daily Loss Used"
              icon={OctagonAlert}
              current={snapshot.dailyLossUsed}
              target={firm.dailyLossLimit}
              intent={
                snapshot.dailyLossBreached
                  ? 'danger'
                  : snapshot.dailyLossUsed / firm.dailyLossLimit > 0.6
                    ? 'warning'
                    : 'accent'
              }
              sub={
                snapshot.worstDayBreached
                  ? `Worst day ${formatCurrency(snapshot.worstDay, { signed: true })} broke the limit.`
                  : `Today, against the firm's limit. Worst day ${formatCurrency(snapshot.worstDay, { signed: true })}.`
              }
            />
          )}
          {firm.minTradingDays != null && (
            <ProgressTile
              label="Days Traded"
              icon={CalendarClock}
              current={snapshot.daysTraded}
              target={firm.minTradingDays}
              formatter={(value) => `${value} days`}
              intent={snapshot.minDaysMet ? 'accent' : 'warning'}
              sub={
                snapshot.minDaysMet
                  ? 'Minimum met.'
                  : `${firm.minTradingDays - snapshot.daysTraded} more required`
              }
            />
          )}
          {firm.consistencyCapPct != null && (
            <div
              className={cn(
                'rounded-card border p-4',
                snapshot.consistencyBreached
                  ? 'border-warning/40 bg-[var(--ds-warning-soft)]/40'
                  : 'bg-surface-2/40 border-border'
              )}
            >
              <span className={cn('inline-flex items-center gap-2', RULE_LABEL)}>
                <Award className="h-3.5 w-3.5" aria-hidden="true" />
                Consistency Rule
              </span>
              <p className="mt-2 text-xl font-semibold tabular-nums text-text">
                {snapshot.consistencyShare.toFixed(1)}%
                <span className="ml-1.5 text-sm font-medium text-text-faint">
                  / {firm.consistencyCapPct}% cap
                </span>
              </p>
              <p className="mt-2 text-xs text-text-faint">
                Best day {formatCurrency(snapshot.bestDayPnl)} of{' '}
                {formatCurrency(Math.max(0, snapshot.profitMade))} total profit.
              </p>
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}

export default function InsightsPage() {
  const { trades, settings } = useJournal()
  const closed = useMemo(() => closedTrades(trades), [trades])
  const stats = useMemo(() => summarize(closed), [closed])
  const byDay = useMemo(() => dailyPnl(trades), [trades])
  const streak = useMemo(() => streaks(closed), [closed])

  const setupRows = useMemo(
    () =>
      breakdownBy(
        closed,
        (trade) => trade.setup,
        SETUP_TYPES.map((entry) => ({ id: entry.id, label: `${entry.id} (${entry.longLabel})` }))
      ),
    [closed]
  )
  const sessionRows = useMemo(
    () =>
      breakdownBy(
        closed,
        (trade) => trade.session,
        SESSIONS.map((entry) => ({ id: entry.id, label: entry.label }))
      ),
    [closed]
  )
  const instrumentRows = useMemo(
    () =>
      breakdownBy(
        closed,
        (trade) => trade.symbol,
        INSTRUMENTS.map((entry) => ({ id: entry.symbol, label: entry.displaySymbol }))
      ),
    [closed]
  )
  const gradeRows = useMemo(
    () =>
      breakdownBy(
        closed,
        (trade) => trade.grade,
        ['A+', 'A', 'B'].map((grade) => ({ id: grade, label: grade }))
      ),
    [closed]
  )

  const activeFirm = settings.firms.find((firm) => firm.id === settings.activeFirmId) ?? null

  return (
    <div className="space-y-6">
      <PageHeader
        title="Insights"
        subtitle="Performance by instrument, setup, session, and grade. All of it realized."
      />

      {/* One strip of figures rather than six tiles: they are one reading of
          the same record, and six borders between them says otherwise. */}
      <FigureRow min="10rem">
        <Figure label="Closed Trades" value={stats.trades} note={`${stats.wins} won`} />
        <Figure
          label="Win Rate"
          value={stats.trades > 0 ? `${Math.round(stats.winRate * 100)}%` : NO_VALUE}
        />
        <Figure
          label="Expectancy"
          value={stats.trades > 0 ? `${stats.expectancyR.toFixed(2)}R` : NO_VALUE}
          note="Average R per trade"
          tone={stats.expectancyR >= 0 ? 'text-positive' : 'text-danger'}
        />
        <Figure
          label="Avg Win / Loss"
          value={
            stats.trades > 0
              ? `${formatR(stats.avgWinR)} / -${stats.avgLossR.toFixed(1)}R`
              : NO_VALUE
          }
        />
        <Figure
          label="Total P&L"
          value={formatCurrency(stats.totalPnl, { signed: true })}
          note={`${formatR(stats.totalR)}, best streak ${streak.bestWin}W`}
          tone={signedColor(stats.totalPnl)}
        />
      </FigureRow>

      <Card
        title="Daily P&L"
        action={<span className="text-xs text-text-faint">Realized · CT days</span>}
      >
        {byDay.length === 0 ? (
          <p className="py-12 text-center text-sm text-text-faint">
            Charts draw as closed trades accumulate.
          </p>
        ) : (
          <ChartInView height={240}>
            {() => (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={byDay} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                  <CartesianGrid stroke={GRID_STROKE} strokeDasharray="3 3" vertical={false} />
                  <defs>
                    <linearGradient id="dayUp" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--ds-accent-bright)" stopOpacity={1} />
                      <stop offset="100%" stopColor="var(--ds-accent)" stopOpacity={0.55} />
                    </linearGradient>
                    <linearGradient id="dayDown" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--ds-danger)" stopOpacity={0.95} />
                      <stop offset="100%" stopColor="var(--ds-danger)" stopOpacity={0.45} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="date"
                    tick={AXIS_TICK}
                    tickLine={false}
                    axisLine={false}
                    minTickGap={40}
                  />
                  <YAxis
                    tick={AXIS_TICK}
                    tickLine={false}
                    axisLine={false}
                    width={56}
                    tickFormatter={(value) =>
                      Math.abs(value) >= 1000 ? `$${(value / 1000).toFixed(1)}k` : `$${value}`
                    }
                  />
                  {/* Break-even. Without it a column of losses reads as a column
                      of bars and the sign has to be taken off the axis. */}
                  <ReferenceLine y={0} stroke="var(--ds-border-strong)" strokeWidth={1} />
                  <Tooltip
                    content={<DailyTooltip />}
                    cursor={{ fill: 'var(--ds-accent-softer)' }}
                  />
                  {/* Capped so a first day of trading reads as one bar rather than a full-width slab. */}
                  <Bar
                    dataKey="pnl"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={72}
                    isAnimationActive
                    animationDuration={700}
                    animationEasing="ease-out"
                  >
                    {byDay.map((entry) => (
                      <Cell
                        key={entry.date}
                        fill={entry.pnl >= 0 ? 'url(#dayUp)' : 'url(#dayDown)'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartInView>
        )}
      </Card>

      {activeFirm ? (
        <PropFirmCard firm={activeFirm} trades={trades} />
      ) : (
        <Card title="Prop Firm Tracking">
          <p className="text-sm text-text-muted">
            Add a firm's drawdown, target, and consistency parameters to track an evaluation here.
          </p>
          <Link
            to="/app/account"
            className="focus-ring mt-3 inline-flex items-center gap-1 rounded-sm text-sm font-medium text-accent-bright transition-colors hover:text-accent"
          >
            Configure Under Account
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </Card>
      )}

      <div className="grid gap-px overflow-hidden rounded-card bg-border lg:grid-cols-2">
        <BreakdownCard title="By Instrument" rows={instrumentRows} hint="Expectancy in R" />
        <BreakdownCard title="By Setup" rows={setupRows} hint="Expectancy in R" />
        <BreakdownCard title="By Session" rows={sessionRows} hint="Best and worst windows" />
        <BreakdownCard title="By Grade" rows={gradeRows} hint="A+ discipline check" />
      </div>
    </div>
  )
}
