import { useEffect, useId, useRef, useState } from 'react'
import { Area, AreaChart, ResponsiveContainer, YAxis } from 'recharts'
import { ArrowDownRight, ArrowUpRight } from 'lucide-react'
import { cn } from '../../lib/cn'
import { useFxQuote } from '../../lib/fxData'
import { decimalsForPair } from '../../lib/fxData/pairs'

const BUFFER = 48

/** Seed a flat-ish rolling buffer so the chart is full on first paint. */
function seedSeries(base) {
  return Array.from({ length: BUFFER }, (_, index) => ({
    index,
    value: base * (1 + Math.sin(index / 5) * 0.0008),
  }))
}

/**
 * A self-updating area chart bound to a single live FX pair. Each tick from the
 * data layer shifts the rolling window, producing a genuinely live preview on
 * the marketing site. Animates only transform/opacity-friendly SVG paint.
 *
 * @param {object} props
 * @param {string} props.pair - e.g. 'EUR/USD'
 * @param {number} [props.height=220]
 * @param {boolean} [props.compact=false] - hide the header row
 * @param {string} [props.className]
 */
export default function LivePairChart({ pair, height = 220, compact = false, className }) {
  const quote = useFxQuote(pair)
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
            <span className="font-mono text-sm font-semibold text-text">{pair}</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-lg font-semibold tabular-nums text-text">
              {quote.bid.toFixed(decimalsForPair(pair))}
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
        <AreaChart data={series} margin={{ top: 6, right: 0, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={stroke} stopOpacity={0.26} />
              <stop offset="100%" stopColor={stroke} stopOpacity={0} />
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
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
