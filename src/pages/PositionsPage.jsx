import { useMemo } from 'react'
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { TrendingUp, Layers, Scale, Gauge, ArrowRight, X } from 'lucide-react'
import { PageContainer, PageSection } from '../components/layout/PageContainer'
import PageHeader from '../components/ui/PageHeader'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Sparkline from '../components/ui/Sparkline'
import { ChartTooltipShell } from '../components/ui/ChartTooltip'
import ChartInView from '../components/charts/ChartInView'
import { account, openPositions, currencyExposure, generateSparkline } from '../data/mockData'
import { cn } from '../lib/cn'
import { durationBetween, formatCurrency, formatPips, formatPrice, signedColor } from '../lib/format'

const NOW = '2026-06-14 14:00'
const MARGIN_BUFFER = 8000

/** Deterministic price sparkline per open-position pair. */
const POSITION_SPARKLINES = openPositions.reduce((accumulator, position, index) => {
  accumulator[position.id] = generateSparkline(position.currentPrice, 16, 0.004, index + 31)
  return accumulator
}, {})

/** Compact stat tile for the positions summary bar. */
function SummaryStat({ label, value, icon: Icon, valueClassName }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-surface px-5 py-4 shadow-sm">
      <span className="flex h-10 w-10 items-center justify-center rounded-md bg-surface-2 text-text-muted">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-text-faint">{label}</p>
        <p className={cn('font-mono text-xl font-semibold tabular-nums', valueClassName)}>{value}</p>
      </div>
    </div>
  )
}

/** Outlined pill showing a stop-loss or take-profit price. */
function LevelPill({ label, value, tone }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface-2/60 px-2 py-1 text-xs">
      <span className="text-text-faint">{label}</span>
      <span className={cn('font-mono tabular-nums', tone)}>{value}</span>
    </span>
  )
}

/** Rich card for a single open position. */
function PositionCard({ position }) {
  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-5 shadow-sm transition-colors hover:border-border-hover">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="font-mono text-base font-semibold text-text">{position.pair}</span>
          <Badge variant={position.type === 'BUY' ? 'buy' : 'sell'}>{position.type}</Badge>
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

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 font-mono text-sm tabular-nums">
          <span className="text-text-muted">{formatPrice(position.entryPrice, position.pair)}</span>
          <ArrowRight className="h-3.5 w-3.5 text-text-faint" aria-hidden="true" />
          <span className="text-text">{formatPrice(position.currentPrice, position.pair)}</span>
        </div>
        <span className="font-mono text-xs tabular-nums text-text-faint">{position.lots.toFixed(2)} lots</span>
      </div>

      <div className="flex items-end justify-between gap-3">
        <div>
          <p className={cn('font-mono text-2xl font-semibold tabular-nums', signedColor(position.pnl))}>
            {formatCurrency(position.pnl, { signed: true })}
          </p>
          <p className={cn('font-mono text-xs tabular-nums', signedColor(position.pips))}>{formatPips(position.pips)} pips</p>
        </div>
        <div className="h-10 w-28">
          <Sparkline data={POSITION_SPARKLINES[position.id]} positive={position.pnl >= 0} height={40} />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <LevelPill label="SL" value={formatPrice(position.sl, position.pair)} tone="text-danger" />
        <LevelPill label="TP" value={formatPrice(position.tp, position.pair)} tone="text-positive" />
        <span className="ml-auto font-mono text-xs text-text-faint">{durationBetween(position.openTime, NOW)} open</span>
      </div>
    </div>
  )
}

/** Custom tooltip for the currency exposure bar chart. */
function ExposureTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const { currency, exposure } = payload[0].payload
  return (
    <ChartTooltipShell>
      <p className="font-mono text-text-faint">{currency}</p>
      <p className="font-mono font-semibold tabular-nums text-text">{exposure}% exposure</p>
    </ChartTooltipShell>
  )
}

export default function PositionsPage() {
  const { totalPnl, totalLots } = useMemo(
    () => ({
      totalPnl: openPositions.reduce((sum, position) => sum + position.pnl, 0),
      totalLots: openPositions.reduce((sum, position) => sum + position.lots, 0),
    }),
    [],
  )

  const marginSegments = useMemo(() => {
    const used = account.margin
    const free = Math.max(0, account.equity - used - MARGIN_BUFFER)
    const total = used + free + MARGIN_BUFFER
    return [
      { key: 'used', label: 'Used Margin', amount: used, className: 'bg-[var(--ds-accent-face)]', pct: (used / total) * 100 },
      { key: 'free', label: 'Free Margin', amount: free, className: 'bg-surface-3', pct: (free / total) * 100 },
      { key: 'buffer', label: 'Risk Buffer', amount: MARGIN_BUFFER, className: 'bg-danger', pct: (MARGIN_BUFFER / total) * 100 },
    ]
  }, [])

  return (
    <PageContainer>
      <PageSection>
        <PageHeader title="Positions" subtitle={`${openPositions.length} open positions · ${totalLots.toFixed(2)} lots live`} />
      </PageSection>

      <PageSection>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <SummaryStat
            label="Total Open P&L"
            value={formatCurrency(totalPnl, { signed: true })}
            icon={TrendingUp}
            valueClassName={signedColor(totalPnl)}
          />
          <SummaryStat label="Positions" value={openPositions.length} icon={Layers} />
          <SummaryStat label="Total Lots" value={totalLots.toFixed(2)} icon={Scale} />
          <SummaryStat label="Margin Used" value={formatCurrency(account.margin)} icon={Gauge} />
        </div>
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
          <Card title="Margin Usage" action={<span className="text-xs text-text-faint">Equity {formatCurrency(account.equity)}</span>}>
            <div className="flex h-3 overflow-hidden rounded-full bg-surface-2">
              {marginSegments.map((segment) => (
                <div
                  key={segment.key}
                  className={cn('h-full first:rounded-l-full last:rounded-r-full', segment.className)}
                  style={{ width: `${segment.pct}%` }}
                />
              ))}
            </div>
            <ul className="mt-4 space-y-2.5">
              {marginSegments.map((segment) => (
                <li key={segment.key} className="flex items-center justify-between gap-3 text-sm">
                  <span className="flex items-center gap-2">
                    <span className={cn('h-2.5 w-2.5 rounded-sm', segment.className)} aria-hidden="true" />
                    <span className="text-text-muted">{segment.label}</span>
                  </span>
                  <span className="font-mono tabular-nums text-text">
                    {formatCurrency(segment.amount)}
                    <span className="ml-2 text-text-faint">{segment.pct.toFixed(1)}%</span>
                  </span>
                </li>
              ))}
            </ul>
          </Card>

          <Card title="Risk Breakdown" action={<span className="text-xs text-text-faint">Exposure by currency</span>}>
            <ResponsiveContainer width="100%" height={196}>
              <BarChart
                data={currencyExposure}
                layout="vertical"
                margin={{ top: 0, right: 16, bottom: 0, left: 8 }}
                barCategoryGap="28%"
              >
                <XAxis type="number" domain={[0, 100]} hide />
                <YAxis
                  type="category"
                  dataKey="currency"
                  tick={{ fill: 'var(--ds-text-muted)', fontSize: 12, fontFamily: 'var(--ds-font-mono)' }}
                  tickLine={false}
                  axisLine={false}
                  width={44}
                />
                <Tooltip content={<ExposureTooltip />} cursor={{ fill: 'var(--ds-surface-2)' }} />
                <Bar dataKey="exposure" radius={[0, 4, 4, 0]} isAnimationActive animationDuration={600}>
                  {currencyExposure.map((entry) => (
                    <Cell key={entry.currency} fill="var(--ds-accent-bright)" />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>
      </PageSection>
    </PageContainer>
  )
}
