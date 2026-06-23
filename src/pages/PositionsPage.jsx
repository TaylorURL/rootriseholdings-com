import { useMemo } from 'react'
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import {
  TrendingUp,
  Layers,
  Scale,
  Gauge,
  ArrowRight,
  X,
  Sparkles,
  ShieldAlert,
  AlertTriangle,
  Octagon,
} from 'lucide-react'
import { PageContainer, PageSection } from '../components/layout/PageContainer'
import PageHeader from '../components/ui/PageHeader'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Sparkline from '../components/ui/Sparkline'
import { ChartTooltipShell } from '../components/ui/ChartTooltip'
import ChartInView from '../components/charts/ChartInView'
import {
  account,
  openPositions,
  tradeHistory,
  instrumentExposure,
  generateSparkline,
} from '../data/mockData'
import {
  RISK_RULES,
  RISK_RULES_DESCRIPTIONS,
  evaluateRuleStatus,
  computeRewardToRisk,
} from '../data/riskRules'
import { INSTRUMENT_META } from '../data/instruments'
import { cn } from '../lib/cn'
import {
  durationBetween,
  formatCurrency,
  formatInstrumentPrice,
  formatMove,
  signedColor,
} from '../lib/format'

const NOW = '2026-06-14 14:00'

/** Deterministic price sparkline per open-position symbol. */
const POSITION_SPARKLINES = openPositions.reduce((accumulator, position, index) => {
  accumulator[position.id] = generateSparkline(position.currentPrice, 16, 0.004, index + 31)
  return accumulator
}, {})

function SummaryStat({ label, value, icon: Icon, valueClassName, hint }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-surface px-5 py-4 shadow-sm">
      <span className="flex h-10 w-10 items-center justify-center rounded-md bg-surface-2 text-text-muted">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-text-faint">{label}</p>
        <p className={cn('font-mono text-xl font-semibold tabular-nums', valueClassName)}>{value}</p>
        {hint && <p className="text-[11px] text-text-faint">{hint}</p>}
      </div>
    </div>
  )
}

function LevelPill({ label, value, tone }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface-2/60 px-2 py-1 text-xs">
      <span className="text-text-faint">{label}</span>
      <span className={cn('font-mono tabular-nums', tone)}>{value}</span>
    </span>
  )
}

/** Rich card for a single open position, SMC-annotated. */
function PositionCard({ position }) {
  const meta = INSTRUMENT_META[position.symbol]
  const displaySymbol = meta?.displaySymbol ?? position.symbol
  const liveRR = computeRewardToRisk({
    entry: position.entryPrice,
    stop: position.stopLoss,
    target: position.takeProfit,
    side: position.type,
  })

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-5 shadow-sm transition-colors hover:border-border-hover">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="font-mono text-base font-semibold text-text">{displaySymbol}</span>
          <Badge variant={position.type === 'BUY' ? 'buy' : 'sell'}>{position.type}</Badge>
          {position.isAPlus && (
            <span className="inline-flex items-center gap-1 rounded-md bg-[var(--ds-accent-soft)] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-accent-bright">
              <Sparkles className="h-3 w-3" aria-hidden="true" />
              A+
            </span>
          )}
        </div>
        <button
          type="button"
          aria-label={`Close position ${position.id}`}
          className="inline-flex items-center gap-1 rounded-md border border-border bg-surface-2 px-2.5 py-1.5 text-xs font-medium text-text-muted transition-colors hover:border-border-hover hover:text-danger"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
          Close
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
        <span className="rounded-md bg-surface-2 px-1.5 py-0.5 font-mono uppercase tracking-wide text-text-muted">
          {position.setup}
        </span>
        <span className="rounded-md bg-surface-2 px-1.5 py-0.5 font-mono uppercase tracking-wide text-text-muted">
          {position.timeframe}
        </span>
        <span className="rounded-md bg-surface-2 px-1.5 py-0.5 uppercase tracking-wide text-text-faint">
          {position.session}
        </span>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 font-mono text-sm tabular-nums">
          <span className="text-text-muted">{formatInstrumentPrice(position.entryPrice, position.symbol)}</span>
          <ArrowRight className="h-3.5 w-3.5 text-text-faint" aria-hidden="true" />
          <span className="text-text">{formatInstrumentPrice(position.currentPrice, position.symbol)}</span>
        </div>
        <span className="font-mono text-xs tabular-nums text-text-faint">{position.size.toFixed(2)} lots</span>
      </div>

      <div className="flex items-end justify-between gap-3">
        <div>
          <p className={cn('font-mono text-2xl font-semibold tabular-nums', signedColor(position.pnl))}>
            {formatCurrency(position.pnl, { signed: true })}
          </p>
          <p className={cn('font-mono text-xs tabular-nums', signedColor(position.movePts))}>
            {formatMove(position.movePts)} {meta?.moveLabel ?? 'pts'}
          </p>
        </div>
        <div className="h-10 w-28">
          <Sparkline data={POSITION_SPARKLINES[position.id]} positive={position.pnl >= 0} height={40} />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <LevelPill label="SL" value={formatInstrumentPrice(position.stopLoss, position.symbol)} tone="text-danger" />
        <LevelPill label="TP" value={formatInstrumentPrice(position.takeProfit, position.symbol)} tone="text-positive" />
        <LevelPill label="R:R" value={liveRR.toFixed(2)} tone={liveRR >= RISK_RULES.minRewardToRisk ? 'text-positive' : 'text-warning'} />
        <LevelPill label="Risk" value={`${position.riskPct.toFixed(1)}%`} tone={position.riskPct > RISK_RULES.maxRiskPerTradePct ? 'text-danger' : 'text-text'} />
        <span className="ml-auto font-mono text-xs text-text-faint">{durationBetween(position.openTime, NOW)} open</span>
      </div>
    </div>
  )
}

/** Custom tooltip for the instrument exposure bar chart. */
function ExposureTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const { symbol, exposure } = payload[0].payload
  const meta = INSTRUMENT_META[symbol]
  return (
    <ChartTooltipShell>
      <p className="font-mono text-text-faint">{meta?.displaySymbol ?? symbol}</p>
      <p className="font-mono font-semibold tabular-nums text-text">{exposure}% exposure</p>
    </ChartTooltipShell>
  )
}

/** One row in the risk-rule monitor panel. */
function RuleStatusRow({ rule, status, hint, intent }) {
  const Icon = intent === 'danger' ? Octagon : intent === 'warning' ? AlertTriangle : ShieldAlert
  const wrapper =
    intent === 'danger'
      ? 'border-danger/50 bg-[var(--ds-danger-soft)]/40'
      : intent === 'warning'
        ? 'border-warning/40 bg-[var(--ds-warning-soft)]/40'
        : 'border-border bg-surface-2/40'
  const iconClass =
    intent === 'danger' ? 'text-danger' : intent === 'warning' ? 'text-warning' : 'text-positive'
  return (
    <li className={cn('flex items-start gap-3 rounded-md border px-3 py-2.5', wrapper)}>
      <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', iconClass)} aria-hidden="true" />
      <div className="flex-1 leading-tight">
        <p className="text-sm font-medium text-text">{rule}</p>
        {hint && <p className="text-xs text-text-muted">{hint}</p>}
      </div>
      <span className="shrink-0 font-mono text-sm font-semibold tabular-nums text-text">{status}</span>
    </li>
  )
}

export default function PositionsPage() {
  const { totalPnl, totalLots, totalRiskPct, aPlusToday } = useMemo(() => {
    const aPlusCount = openPositions.filter((entry) => entry.isAPlus).length
    return {
      totalPnl: openPositions.reduce((sum, position) => sum + position.pnl, 0),
      totalLots: openPositions.reduce((sum, position) => sum + position.size, 0),
      totalRiskPct: openPositions.reduce((sum, position) => sum + position.riskPct, 0),
      aPlusToday: aPlusCount,
    }
  }, [])

  // Pull a "today" subset from history to drive the rule evaluator. In a real
  // wire-up this would come from the journal service; TODO(data) seam lives in
  // mockData.js.
  const todayClosedTrades = useMemo(
    () => tradeHistory.filter((trade) => trade.closeTime.startsWith('2026-06-14')),
    [],
  )

  const ruleStatus = useMemo(
    () =>
      evaluateRuleStatus({
        todayTrades: todayClosedTrades,
        equity: account.equity,
        aPlusToday,
      }),
    [todayClosedTrades, aPlusToday],
  )

  const riskBucketRows = useMemo(
    () => [
      {
        rule: 'Max 1% risk per trade',
        status: openPositions.every((p) => p.riskPct <= RISK_RULES.maxRiskPerTradePct) ? 'OK' : 'BREACH',
        hint: `Largest open ticket — ${Math.max(...openPositions.map((p) => p.riskPct)).toFixed(1)}%`,
        intent: openPositions.every((p) => p.riskPct <= RISK_RULES.maxRiskPerTradePct) ? 'ok' : 'danger',
      },
      {
        rule: '0.5% daily loss limit',
        status: `${ruleStatus.dailyLossPct.toFixed(2)}%`,
        hint: ruleStatus.dailyLossLimitHit
          ? 'Loss limit hit — stand down for the session.'
          : `Remaining buffer ${ruleStatus.dailyLossPctRemaining.toFixed(2)}%`,
        intent: ruleStatus.dailyLossLimitHit ? 'danger' : 'ok',
      },
      {
        rule: 'Min 1:2 reward-to-risk',
        status: openPositions.every((p) => p.plannedRR >= RISK_RULES.minRewardToRisk) ? 'OK' : 'WARN',
        hint: 'All open tickets carry ≥ 1:2 planned R:R.',
        intent: openPositions.every((p) => p.plannedRR >= RISK_RULES.minRewardToRisk) ? 'ok' : 'warning',
      },
      {
        rule: 'Hard stop after 2 consecutive losses',
        status: `${ruleStatus.consecutiveLosses}/${RISK_RULES.maxConsecutiveLosses}`,
        hint: ruleStatus.consecutiveLossStopHit
          ? 'Two consecutive losses — desk closed.'
          : 'Streak monitor resets at session end.',
        intent: ruleStatus.consecutiveLossStopHit ? 'danger' : ruleStatus.consecutiveLosses === 1 ? 'warning' : 'ok',
      },
      {
        rule: 'A+ setups capped at 2/day',
        status: `${ruleStatus.aPlusToday}/${RISK_RULES.maxAPlusSetupsPerDay}`,
        hint: ruleStatus.aPlusCapHit ? 'A+ cap reached — no more A+ tickets today.' : `${ruleStatus.aPlusRemaining} A+ slot(s) remaining`,
        intent: ruleStatus.aPlusCapHit ? 'warning' : 'ok',
      },
    ],
    [ruleStatus],
  )

  return (
    <PageContainer>
      <PageSection>
        <PageHeader
          title="Positions"
          subtitle={`${openPositions.length} open · ${totalLots.toFixed(2)} lots · ${totalRiskPct.toFixed(1)}% total risk on book`}
        />
      </PageSection>

      <PageSection>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <SummaryStat
            label="Total open P&L"
            value={formatCurrency(totalPnl, { signed: true })}
            icon={TrendingUp}
            valueClassName={signedColor(totalPnl)}
          />
          <SummaryStat label="Positions" value={openPositions.length} icon={Layers} />
          <SummaryStat
            label="Risk on book"
            value={`${totalRiskPct.toFixed(1)}%`}
            icon={Scale}
            hint={`Per-trade cap ${RISK_RULES.maxRiskPerTradePct}%`}
          />
          <SummaryStat
            label="A+ today"
            value={`${aPlusToday}/${RISK_RULES.maxAPlusSetupsPerDay}`}
            icon={Sparkles}
            hint="Hard cap to prevent overtrading"
          />
        </div>
      </PageSection>

      <PageSection>
        <Card
          title="Risk rule monitor"
          action={
            <span className="text-xs text-text-faint">
              Equity {formatCurrency(account.equity)} · 1R ≈ {formatCurrency((account.equity * RISK_RULES.maxRiskPerTradePct) / 100)}
            </span>
          }
        >
          <ul className="space-y-2">
            {riskBucketRows.map((row) => (
              <RuleStatusRow key={row.rule} {...row} />
            ))}
          </ul>
          <p className="mt-3 border-t border-border pt-3 text-xs text-text-faint">
            Rules are enforced visually in the journal UI — Root &amp; Rise never blocks or executes orders.
          </p>
        </Card>
      </PageSection>

      <PageSection>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {openPositions.map((position) => (
            <PositionCard key={position.id} position={position} />
          ))}
        </div>
      </PageSection>

      <PageSection>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card title="Playbook risk rules" action={<span className="text-xs text-text-faint">Non-negotiable</span>}>
            <ul className="space-y-2.5">
              {RISK_RULES_DESCRIPTIONS.map((rule) => (
                <li
                  key={rule.id}
                  className="flex items-start gap-3 rounded-md border border-border bg-surface-2/40 px-3 py-2.5"
                >
                  <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-accent-bright" aria-hidden="true" />
                  <div className="leading-tight">
                    <p className="text-sm font-medium text-text">{rule.label}</p>
                    <p className="text-xs text-text-muted">{rule.detail}</p>
                  </div>
                </li>
              ))}
            </ul>
          </Card>

          <Card title="Exposure by instrument" action={<span className="text-xs text-text-faint">Open book</span>}>
            <ChartInView height={196}>
              {() => (
                <ResponsiveContainer width="100%" height={196}>
                  <BarChart
                    data={instrumentExposure}
                    layout="vertical"
                    margin={{ top: 0, right: 16, bottom: 0, left: 8 }}
                    barCategoryGap="28%"
                  >
                    <defs>
                      <linearGradient id="exposureBar" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="var(--ds-accent)" stopOpacity={0.55} />
                        <stop offset="100%" stopColor="var(--ds-accent-bright)" stopOpacity={1} />
                      </linearGradient>
                    </defs>
                    <XAxis type="number" domain={[0, 100]} hide />
                    <YAxis
                      type="category"
                      dataKey="symbol"
                      tick={{ fill: 'var(--ds-text-muted)', fontSize: 12, fontFamily: 'var(--ds-font-mono)' }}
                      tickLine={false}
                      axisLine={false}
                      width={64}
                    />
                    <Tooltip content={<ExposureTooltip />} cursor={{ fill: 'var(--ds-accent-softer)' }} />
                    <Bar dataKey="exposure" radius={[0, 4, 4, 0]} isAnimationActive animationDuration={700} animationEasing="ease-out">
                      {instrumentExposure.map((entry) => (
                        <Cell key={entry.symbol} fill="url(#exposureBar)" />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartInView>
          </Card>
        </div>
      </PageSection>
    </PageContainer>
  )
}
