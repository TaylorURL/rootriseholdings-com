import { useId } from 'react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatCurrency } from '../../lib/format'
import { ChartTooltip } from './ChartTooltip'
import { AREA_STOPS, AXIS_TICK, CURSOR_STROKE, DRAW, GRID_STROKE } from '../charts/chartTheme'

/**
 * Gradient-filled equity curve with a subtle grid, a soft accent glow on the
 * stroke, and a premium tooltip. Draws in on mount (pair with ChartInView to
 * trigger the draw on scroll).
 *
 * @param {object} props
 * @param {Array<{date:string, equity:number}>} props.data
 * @param {number} [props.height=300]
 * @param {boolean} [props.showYAxis=false] - render the right-hand $-axis
 * @param {number} [props.xTickInterval] - XAxis tick interval
 * @param {boolean} [props.animate=true] - draw-in animation
 */
export default function EquityCurveChart({ data, height = 300, showYAxis = false, xTickInterval, animate = true }) {
  const gradientId = useId()
  const glowId = useId()

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: showYAxis ? 8 : 4, bottom: 0, left: 4 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            {AREA_STOPS.map((stop) => (
              <stop key={stop.offset} offset={stop.offset} stopColor="var(--ds-accent-bright)" stopOpacity={stop.opacity} />
            ))}
          </linearGradient>
          <filter id={glowId} x="-20%" y="-40%" width="140%" height="180%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <CartesianGrid stroke={GRID_STROKE} strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="date"
          tick={AXIS_TICK}
          tickLine={false}
          axisLine={false}
          interval={xTickInterval ?? 'preserveStartEnd'}
          minTickGap={xTickInterval == null ? 32 : 0}
        />
        {showYAxis ? (
          <YAxis
            orientation="right"
            domain={['dataMin', 'dataMax']}
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={false}
            width={64}
            tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
          />
        ) : (
          <YAxis hide domain={['dataMin', 'dataMax']} />
        )}
        <Tooltip
          content={<ChartTooltip labelKey="date" valueKey="equity" format={(value) => formatCurrency(value)} />}
          cursor={{ stroke: CURSOR_STROKE, strokeDasharray: '4 4' }}
        />
        <Area
          type="monotone"
          dataKey="equity"
          stroke="var(--ds-accent-bright)"
          strokeWidth={2}
          fill={`url(#${gradientId})`}
          filter={`url(#${glowId})`}
          dot={false}
          activeDot={{ r: 4, fill: 'var(--ds-accent-bright)', stroke: 'var(--ds-bg)', strokeWidth: 2 }}
          {...(animate ? DRAW : { isAnimationActive: false })}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
