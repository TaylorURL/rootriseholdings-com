import { useEffect, useId, useRef, useState } from 'react'
import { Area, AreaChart, ResponsiveContainer, YAxis } from 'recharts'
import { useReducedMotion } from 'framer-motion'
import { ArrowDownRight, ArrowUpRight } from 'lucide-react'
import { cn } from '../../lib/cn'
import { useInstrumentQuote } from '../../data/instruments'
import { formatInstrumentPrice } from '../../lib/format'
import { AREA_STOPS } from '../charts/chartTheme'

const BUFFER = 48

/** Seed a flat-ish rolling buffer so the chart is full on first paint. */
function seedSeries(base) {
  return Array.from({ length: BUFFER }, (_, index) => ({
    index,
    value: base * (1 + Math.sin(index / 5) * 0.0008),
  }))
}

/** Glowing marker drawn only at the live (last) data point. */
function LiveDot({ cx, cy, index, dataLength, stroke, reduce }) {
  if (cx == null || cy == null || index !== dataLength - 1) return null
  return (
    <g>
      {!reduce && (
        <circle cx={cx} cy={cy} r={6} fill={stroke} opacity={0.18}>
          <animate attributeName="r" values="5;10;5" dur="1.6s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.25;0;0.25" dur="1.6s" repeatCount="indefinite" />
        </circle>
      )}
      <circle cx={cx} cy={cy} r={3} fill={stroke} stroke="var(--ds-bg)" strokeWidth={1.5} />
    </g>
  )
}

/**
 * A self-updating gradient area chart bound to a single live instrument (e.g.
 * 'XAUUSD', 'NAS100'). Each tick from the simulated data layer shifts the
 * rolling window, producing a genuinely live preview with a pulsing endpoint.
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
  const seededRef = useRef(false)
  const [series, setSeries] = useState(() => seedSeries(quote?.bid ?? 1))

  useEffect(() => {
    if (!quote) return
    if (!seededRef.current) {
      setSeries(seedSeries(quote.bid))
      seededRef.current = true
      return
    }
    setSeries((previous) => {
      const next = previous.slice(1)
      next.push({ index: (previous[previous.length - 1]?.index ?? 0) + 1, value: quote.bid })
      return next
    })
  }, [quote?.bid]) // eslint-disable-line react-hooks/exhaustive-deps

  const positive = (quote?.changePct ?? 0) >= 0
  const stroke = positive ? 'var(--ds-positive)' : 'var(--ds-danger)'
  const Arrow = positive ? ArrowUpRight : ArrowDownRight

  return (
    <div className={cn('flex flex-col', className)}>
      {!compact && quote && (
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-accent-bright shadow-[0_0_8px_var(--ds-accent-glow)]" aria-hidden="true" />
            <span className="font-mono text-sm font-semibold text-text">{quote.displaySymbol}</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-lg font-semibold tabular-nums text-text">
              {formatInstrumentPrice(quote.bid, symbol)}
            </span>
            <span
              className={cn(
                'flex items-center gap-0.5 font-mono text-xs tabular-nums',
                positive ? 'text-positive' : 'text-danger',
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
                <stop key={stop.offset} offset={stop.offset} stopColor={stroke} stopOpacity={stop.opacity} />
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
