import { useId } from 'react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatCurrency } from '../../lib/format'
import { ChartTooltip } from './ChartTooltip'

const AXIS_COLOR = 'var(--ds-text-faint)'
const AXIS_TICK = { fill: AXIS_COLOR, fontSize: 11, fontFamily: 'var(--ds-font-mono)' }

/**
 * Gradient-filled equity curve area chart with a subtle grid.
 *
 * @param {object} props
 * @param {Array<{date:string, equity:number}>} props.data
 * @param {number} [props.height=300]
 * @param {boolean} [props.showYAxis=false] - render the right-hand $-axis
 * @param {number} [props.xTickInterval] - XAxis tick interval (e.g. 4 → label every 5th day)
 */
export default function EquityCurveChart({ data, height = 300, showYAxis = false, xTickInterval }) {
  const gradientId = useId()

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: showYAxis ? 8 : 4, bottom: 0, left: 4 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--ds-accent-bright)" stopOpacity={0.28} />
            <stop offset="100%" stopColor="var(--ds-accent-bright)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="var(--ds-border)" strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="date"
          tick={AXIS_TICK}
          tickLine={false}
          axisLine={false}
          interval={xTickInterval ?? 'preserveStartEnd'}
          minTickGap={xTickInterval == null ? 32 : 0}
        />
        {showYAxis && (
          <YAxis
            orientation="right"
            domain={['dataMin', 'dataMax']}
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={false}
            width={64}
            tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
          />
        )}
        {!showYAxis && <YAxis hide domain={['dataMin', 'dataMax']} />}
        <Tooltip
          content={<ChartTooltip labelKey="date" valueKey="equity" format={(value) => formatCurrency(value)} />}
          cursor={{ stroke: 'var(--ds-border-strong)' }}
        />
        <Area
          type="monotone"
          dataKey="equity"
          stroke="var(--ds-accent-bright)"
          strokeWidth={2}
          fill={`url(#${gradientId})`}
          isAnimationActive
          animationDuration={700}
          dot={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
