import { useId } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatCurrency } from '../../lib/format'
import { ChartTooltipShell } from './ChartTooltip'
import { AXIS_TICK, CURSOR_STROKE, DRAW, GRID_STROKE } from './chartTheme'

/**
 * The equity curve.
 *
 * A balance line means one thing to the person reading it - am I up or down on
 * where I started - and the chart used to answer it in a single accent colour
 * that said neither. So the line takes the colour the balance has earned
 * against its opening point, the fill goes with it, and the open is ruled
 * across the plot so the crossing is visible rather than inferred from an axis.
 *
 * The tooltip carries the same comparison in words, because a reader hovering a
 * point in the middle of a long curve cannot see the first point to subtract it
 * from.
 *
 * @param {object} props
 * @param {Array<{date:string, equity:number}>} props.data
 * @param {number} [props.height=300]
 * @param {boolean} [props.showYAxis=false] - render the right-hand $-axis
 * @param {number} [props.xTickInterval] - XAxis tick interval
 * @param {boolean} [props.animate=true] - draw-in animation
 */
export default function EquityCurveChart({
  data,
  height = 300,
  showYAxis = false,
  xTickInterval,
  animate = true,
}) {
  const gradientId = useId()

  const points = data ?? []
  const opening = points[0]?.equity ?? 0
  const latest = points[points.length - 1]?.equity ?? opening
  const ahead = latest >= opening
  const stroke = ahead ? 'var(--ds-positive)' : 'var(--ds-danger)'

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={points} margin={{ top: 8, right: showYAxis ? 8 : 4, bottom: 0, left: 4 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={stroke} stopOpacity={0.28} />
            <stop offset="60%" stopColor={stroke} stopOpacity={0.06} />
            <stop offset="100%" stopColor={stroke} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={GRID_STROKE} strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="date"
          tick={AXIS_TICK}
          tickLine={false}
          axisLine={false}
          interval={xTickInterval ?? 'preserveStartEnd'}
          // A wider gap than the axis would choose for itself: dates set in
          // mono are wide, and a narrow column packs them until they collide.
          minTickGap={xTickInterval == null ? 48 : 0}
        />
        {showYAxis ? (
          <YAxis
            orientation="right"
            domain={['dataMin', 'dataMax']}
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={false}
            width={60}
            tickFormatter={(value) =>
              Math.abs(value) >= 1000 ? `$${(value / 1000).toFixed(1)}k` : `$${value.toFixed(0)}`
            }
          />
        ) : (
          <YAxis hide domain={['dataMin', 'dataMax']} />
        )}

        {/* Where the book opened. Everything above it is profit. */}
        <ReferenceLine
          y={opening}
          stroke="var(--ds-text-faint)"
          strokeDasharray="4 4"
          strokeOpacity={0.6}
          ifOverflow="extendDomain"
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
          activeDot={{ r: 4, fill: stroke, stroke: 'var(--ds-bg)', strokeWidth: 2 }}
          {...(animate ? DRAW : { isAnimationActive: false })}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

function EquityTooltip({ active, payload, opening }) {
  if (!active || !payload?.length) return null
  const point = payload[0].payload
  const change = point.equity - opening
  const pct = opening > 0 ? (change / opening) * 100 : 0
  const up = change >= 0

  return (
    <ChartTooltipShell>
      <p className="font-mono uppercase tracking-[0.12em] text-text-faint">{point.date}</p>
      <p className="mt-0.5 font-mono text-sm font-semibold tabular-nums text-text">
        {formatCurrency(point.equity)}
      </p>
      {change !== 0 ? (
        <p
          className={`mt-0.5 font-mono text-[11px] tabular-nums ${up ? 'text-positive' : 'text-danger'}`}
        >
          {formatCurrency(change, { signed: true })} · {up ? '+' : ''}
          {pct.toFixed(2)}% from open
        </p>
      ) : (
        <p className="mt-0.5 font-mono text-[11px] text-text-faint">Opening balance</p>
      )}
    </ChartTooltipShell>
  )
}
