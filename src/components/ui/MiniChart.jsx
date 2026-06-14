import { useId } from 'react'
import { Area, AreaChart, ResponsiveContainer, YAxis } from 'recharts'

const STROKE_BY_TREND = {
  positive: 'var(--ds-positive)',
  negative: 'var(--ds-danger)',
  neutral: 'var(--ds-accent-bright)',
}

/** Resolve trend direction from an explicit prop or the data endpoints. */
function resolveTrend(trend, data) {
  if (trend) return trend
  if (!data || data.length < 2) return 'neutral'
  const delta = data[data.length - 1].value - data[0].value
  if (delta > 0) return 'positive'
  if (delta < 0) return 'negative'
  return 'neutral'
}

/**
 * Compact sparkline (axis-less area chart) for table rows and cards.
 *
 * @param {object} props
 * @param {Array<{value:number}>} props.data
 * @param {'positive'|'negative'|'neutral'} [props.trend] - inferred from data when omitted
 * @param {number} [props.height=40]
 * @param {number|string} [props.width='100%']
 */
export default function MiniChart({ data, trend, height = 40, width = '100%' }) {
  const gradientId = useId()
  const resolvedTrend = resolveTrend(trend, data)
  const stroke = STROKE_BY_TREND[resolvedTrend]

  return (
    <ResponsiveContainer width={width} height={height}>
      <AreaChart data={data} margin={{ top: 2, right: 0, bottom: 2, left: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={stroke} stopOpacity={0.32} />
            <stop offset="100%" stopColor={stroke} stopOpacity={0} />
          </linearGradient>
        </defs>
        <YAxis hide domain={['dataMin', 'dataMax']} />
        <Area
          type="monotone"
          dataKey="value"
          stroke={stroke}
          strokeWidth={1.5}
          fill={`url(#${gradientId})`}
          isAnimationActive={false}
          dot={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
