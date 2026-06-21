import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, YAxis } from 'recharts'
import { ChartTooltipShell } from '../ui/ChartTooltip'
import { CURSOR_STROKE } from './chartTheme'

const UP = 'var(--ds-positive)'
const DOWN = 'var(--ds-danger)'

/**
 * Candlestick body + wick shape. Bound to a ranged `range:[low,high]` Bar so the
 * (y, height) geometry already spans the wick; open/close pixels are
 * interpolated within that range. Hairline wick, filled body, colored by
 * direction — the real trading-terminal treatment.
 */
function Candle({ x, y, width, height, payload }) {
  const { open, close, high, low } = payload
  if (high === low) return null
  const pixelFor = (value) => y + ((high - value) / (high - low)) * height
  const openY = pixelFor(open)
  const closeY = pixelFor(close)
  const rising = close >= open
  const color = rising ? UP : DOWN
  const bodyTop = Math.min(openY, closeY)
  const bodyHeight = Math.max(1.5, Math.abs(closeY - openY))
  const centerX = x + width / 2
  const bodyWidth = Math.max(2, width * 0.6)

  return (
    <g>
      <line x1={centerX} x2={centerX} y1={y} y2={y + height} stroke={color} strokeWidth={1} opacity={0.7} />
      <rect x={centerX - bodyWidth / 2} y={bodyTop} width={bodyWidth} height={bodyHeight} rx={1} fill={color} opacity={0.92} />
    </g>
  )
}

/** Custom OHLC tooltip. */
function CandleTooltip({ active, payload, decimals }) {
  if (!active || !payload?.length) return null
  const candle = payload[0].payload
  const rising = candle.close >= candle.open
  const fmt = (value) => value.toFixed(decimals)
  return (
    <ChartTooltipShell>
      <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 font-mono tabular-nums">
        <span className="text-text-faint">O</span>
        <span className="text-right text-text">{fmt(candle.open)}</span>
        <span className="text-text-faint">H</span>
        <span className="text-right text-text">{fmt(candle.high)}</span>
        <span className="text-text-faint">L</span>
        <span className="text-right text-text">{fmt(candle.low)}</span>
        <span className="text-text-faint">C</span>
        <span className={rising ? 'text-right text-positive' : 'text-right text-danger'}>{fmt(candle.close)}</span>
      </div>
    </ChartTooltipShell>
  )
}

/**
 * Branded candlestick chart. Animates the bodies in on mount (pair with
 * ChartInView to draw on scroll). Reduced-motion is handled by recharts' timing
 * collapse under the global guard.
 *
 * @param {object} props
 * @param {Array<{open:number,high:number,low:number,close:number,range:[number,number]}>} props.data
 * @param {number} [props.height=280]
 * @param {number} [props.decimals=5] - tooltip price precision
 * @param {boolean} [props.animate=true]
 */
export default function CandlestickChart({ data, height = 280, decimals = 5, animate = true }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: 4 }} barCategoryGap="22%">
        <YAxis hide domain={['dataMin', 'dataMax']} />
        <Tooltip content={<CandleTooltip decimals={decimals} />} cursor={{ fill: 'var(--ds-accent-softer)', stroke: CURSOR_STROKE }} />
        <Bar dataKey="range" shape={<Candle />} isAnimationActive={animate} animationDuration={800} animationEasing="ease-out">
          {data.map((candle) => (
            <Cell key={candle.label} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
