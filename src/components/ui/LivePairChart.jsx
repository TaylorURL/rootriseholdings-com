import { useId } from 'react'
import { Area, AreaChart, ResponsiveContainer, YAxis } from 'recharts'
import { useReducedMotion } from 'framer-motion'
import { ArrowDownRight, ArrowUpRight } from 'lucide-react'
import { cn } from '../../lib/cn'
import { useInstrumentQuote } from '../../lib/marketData/instrumentQuotes.js'
import { formatInstrumentPrice } from '../../lib/format'
import { AREA_STOPS } from '../charts/chartTheme'

/** Glowing marker drawn only at the live (last) data point. */
function LiveDot({ cx, cy, index, dataLength, stroke, reduce }) {
  if (cx == null || cy == null || index !== dataLength - 1) return null
  return (
    <g>
      {!reduce && (
        <circle cx={cx} cy={cy} r={6} fill={stroke} opacity={0.18}>
          <animate attributeName="r" values="5;10;5" dur="1.6s" repeatCount="indefinite" />
          <animate
            attributeName="opacity"
            values="0.25;0;0.25"
            dur="1.6s"
            repeatCount="indefinite"
          />
        </circle>
      )}
      <circle cx={cx} cy={cy} r={3} fill={stroke} stroke="var(--ds-bg)" strokeWidth={1.5} />
    </g>
  )
}

/**
 * An instrument's current session as a sparkline, with its price above.
 *
 * The shape is drawn from the intraday bars that travel on the quote, so the
 * chart opens no feed request of its own and every one of these on a page moves
 * together off the one shared read.
 *
 * @param {object} props
 * @param {string} props.symbol - instrument symbol, e.g. 'XAUUSD'
 * @param {number} [props.height=220]
 * @param {boolean} [props.compact=false] - hide the header row
 * @param {string} [props.className]
 */
export default function LivePairChart({ symbol, height = 220, compact = false, className }) {
  const quote = useInstrumentQuote(symbol)
  const reduce = useReducedMotion()
  const gradientId = useId()
  const series = (quote?.intraday ?? []).map((candle, index) => ({ index, value: candle.close }))

  const positive = (quote?.changePct ?? 0) >= 0
  const stroke = positive ? 'var(--ds-positive)' : 'var(--ds-danger)'
  const Arrow = positive ? ArrowUpRight : ArrowDownRight

  return (
    <div data-chart-slot="" className={cn('content-enter flex flex-col', className)}>
      {!compact && quote && (
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className="h-2 w-2 rounded-full bg-accent-bright shadow-[var(--ds-glow-dot)]"
              aria-hidden="true"
            />
            <span className="font-mono text-sm font-semibold text-text">{quote.displaySymbol}</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-lg font-semibold tabular-nums text-text">
              {formatInstrumentPrice(quote.price, symbol)}
            </span>
            <span
              className={cn(
                'flex items-center gap-0.5 font-mono text-xs tabular-nums',
                positive ? 'text-positive' : 'text-danger'
              )}
            >
              <Arrow className="h-3 w-3" aria-hidden="true" />
              {positive ? '+' : ''}
              {quote.changePct.toFixed(2)}%
            </span>
          </div>
        </div>
      )}
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={series} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              {AREA_STOPS.map((stop) => (
                <stop
                  key={stop.offset}
                  offset={stop.offset}
                  stopColor={stroke}
                  stopOpacity={stop.opacity}
                />
              ))}
            </linearGradient>
          </defs>
          <YAxis hide domain={['dataMin', 'dataMax']} />
          <Area
            type="monotone"
            dataKey="value"
            stroke={stroke}
            strokeWidth={2}
            fill={`url(#${gradientId})`}
            isAnimationActive={false}
            dot={<LiveDot dataLength={series.length} stroke={stroke} reduce={reduce} />}
            activeDot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
