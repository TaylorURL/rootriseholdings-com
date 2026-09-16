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
import {
  AXIS_TICK,
  GAIN,
  GRID_DASH,
  GRID_STROKE,
  LOSS,
  ZERO_STROKE,
  formatDayTick,
  formatUsdTick,
  niceTicks,
} from '../components/charts/chartTheme'
import PageHeader from '../components/ui/PageHeader'
import Card from '../components/ui/Card'
import { Figure, FigureRow, RuleLabel, RULE_LABEL } from '../components/ui/Figures'
import Badge from '../components/ui/Badge'
import { ChartTooltipShell, TooltipRow } from '../components/charts/ChartTooltip'
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
  const { date, pnl, r, trades } = payload[0].payload
  return (
    <ChartTooltipShell>
      <p className="font-medium tabular-nums text-text-faint">{formatDayTick(date)}</p>
      <TooltipRow
        label="Net P&L"
        value={formatCurrency(pnl, { signed: true })}
        tone={signedColor(pnl)}
      />
      <TooltipRow label="Result" value={formatR(r)} tone={signedColor(r)} />
      <TooltipRow label="Trades" value={trades} />
    </ChartTooltipShell>
  )
}

/**
 * Expectancy as a bar either side of zero.
 *
 * A column of signed numbers has to be read one row at a time; a bar that runs
 * right for a paying cut and left for a losing one is read down the column in
 * a glance, and the figure at its tip keeps the exact value. Every bar in a
 * card shares one scale, so their lengths compare.
 */
function ExpectancyBar({ value, scale }) {
  const share = scale > 0 ? Math.min(1, Math.abs(value) / scale) : 0
  const up = value >= 0
  return (
    <div className="relative h-5 w-full" aria-hidden="true">
      <span className="absolute inset-y-0 left-1/2 w-px bg-border-strong" />
      <span
        className={cn(
          'absolute top-1/2 h-2 -translate-y-1/2 rounded-sm',
          up ? 'left-1/2 bg-positive' : 'right-1/2 bg-danger'
        )}
        style={{ width: `${Math.max(share * 50, 0.75)}%` }}
      />
    </div>
  )
}

function BreakdownCard({ title, subtitle, rows }) {
  const scale = rows.reduce((max, row) => Math.max(max, Math.abs(row.expectancyR)), 0)
  return (
    <Card title={title} subtitle={subtitle} padded={false}>
      {rows.length === 0 ? (
        <p className="px-5 py-10 text-center text-[13px] text-text-faint">
          No closed trades in this cut yet.
        </p>
      ) : (
        <div className="overflow-x-auto px-5 pb-3 pt-3">
          <table className="w-full min-w-[26rem] text-[13px]">
            <thead>
              <tr className={cn('whitespace-nowrap text-left', RULE_LABEL)}>
                <th scope="col" className="pb-2 pr-3 font-normal">
                  Name
                </th>
                <th scope="col" className="w-[38%] pb-2 text-center font-normal">
                  Expectancy (R)
                </th>
                <th scope="col" className="pb-2 pl-3 text-right font-normal">
                  Trades
                </th>
                <th scope="col" className="pb-2 pl-3 text-right font-normal">
                  Win Rate
                </th>
                <th scope="col" className="pb-2 pl-3 text-right font-normal">
                  P&L
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.key} className="border-t border-border">
                  <th scope="row" className="py-2.5 pr-3 text-left font-medium text-text">
                    {row.label}
                  </th>
                  <td className="py-2.5">
                    <div className="flex items-center gap-2">
                      <ExpectancyBar value={row.expectancyR} scale={scale} />
                      <span
                        className={cn(
                          'w-12 shrink-0 text-right text-xs font-semibold tabular-nums',
                          signedColor(row.expectancyR)
                        )}
                      >
                        {row.expectancyR >= 0 ? '+' : ''}
                        {row.expectancyR.toFixed(2)}R
                      </span>
                    </div>
                  </td>
                  <td className="py-2.5 pl-3 text-right tabular-nums text-text-muted">
                    {row.trades}
                  </td>
                  <td className="py-2.5 pl-3 text-right tabular-nums text-text-muted">
                    {Math.round(row.winRate * 100)}%
                  </td>
                  <td
                    className={cn(
                      'py-2.5 pl-3 text-right font-medium tabular-nums',
                      signedColor(row.totalPnl)
                    )}
                  >
                    {formatCurrency(row.totalPnl, { signed: true })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}

function ProgressTile({ label, icon: Icon, current, target, formatter, intent = 'accent', sub }) {
  const pct = target > 0 ? Math.max(0, Math.min(100, (current / target) * 100)) : 0
  const formatValue = formatter ?? ((value) => formatCurrency(Math.abs(value)))
  const barClass =
    intent === 'danger'
      ? 'bg-danger'
      : intent === 'warning'
        ? 'bg-warning'
        : 'bg-[var(--ds-accent-fill)]'
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
        className="h-1.5 overflow-hidden rounded-full bg-surface-3"
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
  const dailyAxis = useMemo(
    () =>
      niceTicks(
        Math.min(0, ...byDay.map((day) => day.pnl)),
        Math.max(0, ...byDay.map((day) => day.pnl))
      ),
    [byDay]
  )

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
    <div className="space-y-5">
      <PageHeader
        title="Insights"
        subtitle="Performance by instrument, setup, session, and grade. All of it realized."
      />

      {/* One strip of figures rather than six tiles: they are one reading of
          the same record, and six borders between them says otherwise. */}
      <FigureRow min="11rem">
        <Figure size="lg" label="Closed Trades" value={stats.trades} note={`${stats.wins} won`} />
        <Figure
          size="lg"
          label="Win Rate"
          value={stats.trades > 0 ? `${Math.round(stats.winRate * 100)}%` : NO_VALUE}
        />
        <Figure
          size="lg"
          label="Expectancy"
          value={stats.trades > 0 ? `${stats.expectancyR.toFixed(2)}R` : NO_VALUE}
          note="Average R per trade"
          tone={stats.expectancyR >= 0 ? 'text-positive' : 'text-danger'}
        />
        <Figure
          size="lg"
          label="Avg Win / Loss"
          value={
            stats.trades > 0
              ? `${formatR(stats.avgWinR)} / -${stats.avgLossR.toFixed(1)}R`
              : NO_VALUE
          }
        />
        <Figure
          size="lg"
          label="Total P&L"
          value={formatCurrency(stats.totalPnl, { signed: true })}
          note={`${formatR(stats.totalR)}, best streak ${streak.bestWin}W`}
          tone={signedColor(stats.totalPnl)}
        />
      </FigureRow>

      <Card
        title="Daily P&L"
        subtitle="Net realized result per CT day, in USD"
        action={
          byDay.length > 0 ? (
            <span className="flex items-center gap-3 text-[11px] font-medium text-text-muted">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-[2px] bg-positive" aria-hidden="true" />
                Gain Day
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-[2px] bg-danger" aria-hidden="true" />
                Loss Day
              </span>
            </span>
          ) : null
        }
      >
        {byDay.length === 0 ? (
          <p className="py-12 text-center text-sm text-text-faint">
            Charts draw as closed trades accumulate.
          </p>
        ) : (
          <ChartInView height={260}>
            {() => (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={byDay} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                  <CartesianGrid
                    stroke={GRID_STROKE}
                    strokeDasharray={GRID_DASH}
                    vertical={false}
                  />
                  <XAxis
                    dataKey="date"
                    tick={AXIS_TICK}
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tickFormatter={formatDayTick}
                    minTickGap={40}
                  />
                  <YAxis
                    orientation="right"
                    domain={dailyAxis.domain}
                    ticks={dailyAxis.ticks}
                    tick={AXIS_TICK}
                    tickLine={false}
                    axisLine={false}
                    width={56}
                    tickMargin={6}
                    tickFormatter={(value) => formatUsdTick(value, { signed: true })}
                  />
                  {/* Break-even. Without it a column of losses reads as a column
                      of bars and the sign has to be taken off the axis. */}
                  <ReferenceLine y={0} stroke={ZERO_STROKE} strokeWidth={1} />
                  <Tooltip content={<DailyTooltip />} cursor={{ fill: 'var(--ds-neutral-soft)' }} />
                  {/* Capped so a first day of trading reads as one bar rather than a full-width slab. */}
                  <Bar
                    dataKey="pnl"
                    radius={2}
                    maxBarSize={40}
                    isAnimationActive
                    animationDuration={700}
                    animationEasing="ease-out"
                  >
                    {byDay.map((entry) => (
                      <Cell key={entry.date} fill={entry.pnl >= 0 ? GAIN : LOSS} />
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

      <div className="grid gap-5 xl:grid-cols-2">
        <BreakdownCard
          title="By Instrument"
          subtitle="Average R per trade, and total P&L"
          rows={instrumentRows}
        />
        <BreakdownCard
          title="By Setup"
          subtitle="Average R per trade, and total P&L"
          rows={setupRows}
        />
        <BreakdownCard
          title="By Session"
          subtitle="Average result per trade, by trading window"
          rows={sessionRows}
        />
        <BreakdownCard
          title="By Grade"
          subtitle="Average result per trade, by setup grade"
          rows={gradeRows}
        />
      </div>
    </div>
  )
}
