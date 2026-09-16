import { useId } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatCurrency } from '../../lib/format'
import { ChartTooltipShell, TooltipRow } from './ChartTooltip'
import {
  AXIS_TICK,
  CURSOR_STROKE,
  DRAW,
  GAIN,
  GRID_DASH,
  GRID_STROKE,
  LOSS,
  REFERENCE_LABEL,
  formatDayTick,
  formatUsdTick,
  niceTicks,
} from './chartTheme'

/**
 * The equity curve.
 *
 * A balance line means one thing to the person reading it - am I up or down on
 * where I started - so the line takes the colour the balance has earned
 * against its starting point, the start is ruled across the plot and labelled,
 * and the latest balance is marked at the end of the line. The dollar axis is
 * always drawn, because a curve without a scale is a shape rather than a
 * reading.
 *
 * The tooltip carries the same comparison in words, because a reader hovering a
 * point in the middle of a long curve cannot see the first point to subtract it
 * from.
 *
 * @param {object} props
 * @param {Array<{date:string, equity:number}>} props.data
 * @param {number} [props.start] - the starting balance; the first point when omitted
 * @param {number} [props.height=300]
 * @param {number} [props.xTickInterval] - XAxis tick interval
 * @param {boolean} [props.animate=true] - draw-in animation
 */
export default function EquityCurveChart({
  data,
  start,
  height = 300,
  xTickInterval,
  animate = true,
}) {
  const gradientId = useId()

  const points = data ?? []
  const opening = start ?? points[0]?.equity ?? 0
  const last = points[points.length - 1]
  const latest = last?.equity ?? opening
  const ahead = latest >= opening
  const stroke = ahead ? GAIN : LOSS
  const values = points.map((point) => point.equity)
  const axis = niceTicks(Math.min(opening, ...values), Math.max(opening, ...values))

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-end gap-x-4 gap-y-1 text-[11px] font-medium text-text-muted">
        <span className="inline-flex items-center gap-1.5">
          <span
            className="h-0.5 w-3.5 rounded-full"
            style={{ background: stroke }}
            aria-hidden="true"
          />
          Balance
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            className="w-3.5 border-t border-dashed border-[var(--ds-text-faint)]"
            aria-hidden="true"
          />
          Start, {formatCurrency(opening)}
        </span>
      </div>
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={points} margin={{ top: 12, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={stroke} stopOpacity={0.22} />
              <stop offset="100%" stopColor={stroke} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={GRID_STROKE} strokeDasharray={GRID_DASH} vertical={false} />
          <XAxis
            dataKey="date"
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={{ stroke: GRID_STROKE }}
            tickMargin={8}
            tickFormatter={formatDayTick}
            interval={xTickInterval ?? 'preserveStartEnd'}
            minTickGap={xTickInterval == null ? 40 : 0}
          />
          <YAxis
            orientation="right"
            domain={axis.domain}
            ticks={axis.ticks}
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={false}
            tickMargin={6}
            width={56}
            tickFormatter={(value) => formatUsdTick(value)}
          />

          {/* Where the book started. Everything above it is profit. */}
          <ReferenceLine
            y={opening}
            stroke="var(--ds-text-faint)"
            strokeDasharray="4 4"
            label={{ value: 'Start', position: 'insideBottomLeft', offset: 6, ...REFERENCE_LABEL }}
          />

          <Tooltip
            content={<EquityTooltip opening={opening} />}
            cursor={{ stroke: CURSOR_STROKE, strokeDasharray: '4 4' }}
          />
          <Area
            type="monotone"
            dataKey="equity"
            stroke={stroke}
            strokeWidth={2}
            fill={`url(#${gradientId})`}
            dot={false}
            activeDot={{ r: 4, fill: stroke, stroke: 'var(--ds-surface)', strokeWidth: 2 }}
            {...(animate ? DRAW : { isAnimationActive: false })}
          />
          {last ? (
            <ReferenceDot
              x={last.date}
              y={last.equity}
              r={4}
              fill={stroke}
              stroke="var(--ds-surface)"
              strokeWidth={2}
              label={{
                value: formatCurrency(last.equity),
                position: 'left',
                offset: 10,
                ...REFERENCE_LABEL,
                fill: 'var(--ds-text)',
                fontWeight: 600,
              }}
            />
          ) : null}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

function EquityTooltip({ active, payload, opening }) {
  if (!active || !payload?.length) return null
  const point = payload[0].payload
  const change = point.equity - opening
  const pct = opening > 0 ? (change / opening) * 100 : 0
  const tone = change > 0 ? 'text-positive' : change < 0 ? 'text-danger' : undefined

  return (
    <ChartTooltipShell>
      <p className="font-medium tabular-nums text-text-faint">{formatDayTick(point.date)}</p>
      <TooltipRow label="Balance" value={formatCurrency(point.equity)} />
      <TooltipRow
        label="From Start"
        value={`${formatCurrency(change, { signed: true })} (${change >= 0 ? '+' : ''}${pct.toFixed(2)}%)`}
        tone={tone}
      />
    </ChartTooltipShell>
  )
}
