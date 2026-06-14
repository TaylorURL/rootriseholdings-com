import { Line, LineChart, ResponsiveContainer, YAxis } from 'recharts'

/**
 * Axis-less line sparkline for inline price trends.
 *
 * @param {object} props
 * @param {Array<{value:number}>} props.data
 * @param {boolean} [props.positive=true] - colors the line green when true, red otherwise
 * @param {number} [props.height=32]
 * @param {number|string} [props.width='100%']
 */
export default function Sparkline({ data, positive = true, height = 32, width = '100%' }) {
  const stroke = positive ? 'var(--ds-positive)' : 'var(--ds-danger)'

  return (
    <ResponsiveContainer width={width} height={height}>
      <LineChart data={data} margin={{ top: 2, right: 0, bottom: 2, left: 0 }}>
        <YAxis hide domain={['dataMin', 'dataMax']} />
        <Line
          type="monotone"
          dataKey="value"
          stroke={stroke}
          strokeWidth={1.5}
          dot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
