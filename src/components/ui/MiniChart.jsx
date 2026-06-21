import { useId } from 'react'
import { Area, AreaChart, ResponsiveContainer, YAxis } from 'recharts'
import { AREA_STOPS, TREND_COLOR, resolveTrend } from '../charts/chartTheme'

/**
 * Compact sparkline (axis-less gradient area) for table rows and cards. Trend
 * color is inferred from the data endpoints unless given explicitly.
 *
 * @param {object} props
 * @param {Array<{value:number}>} props.data
 * @param {'positive'|'negative'|'neutral'} [props.trend]
 * @param {number} [props.height=40]
 * @param {number|string} [props.width='100%']
 */
export default function MiniChart({ data, trend, height = 40, width = '100%' }) {
  const gradientId = useId()
  const stroke = TREND_COLOR[resolveTrend(trend, data)]

  return (
    <ResponsiveContainer width={width} height={height}>
      <AreaChart data={data} margin={{ top: 2, right: 0, bottom: 2, left: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            {AREA_STOPS.map((stop) => (
              <stop key={stop.offset} offset={stop.offset} stopColor={stroke} stopOpacity={stop.opacity} />
            ))}
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
