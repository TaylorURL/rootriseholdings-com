import { useMemo, useState } from 'react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { cn } from '../../lib/cn'
import { generatePriceHistory } from '../../data/mockData'
import ChangeIndicator from './ChangeIndicator'

const TIMEFRAMES = ['1H', '4H', '1D', '1W']
const AXIS_COLOR = 'var(--ds-text-faint)'

/** Custom OHLC tooltip card. */
function PriceTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const { time, open, high, low, close } = payload[0].payload
  const rows = [
    ['Open', open],
    ['High', high],
    ['Low', low],
    ['Close', close],
  ]

  return (
    <div className="rounded-md border border-border-strong bg-bg-elevated/95 px-3 py-2 shadow-lg backdrop-blur">
      <p className="mb-1.5 font-mono text-xs text-text-faint">{time}</p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between gap-3 text-xs">
            <span className="text-text-faint">{label}</span>
            <span className="font-mono tabular-nums text-text">{value.toFixed(5)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * Main price chart: gradient area chart with a pair selector, timeframe
 * controls, and a custom OHLC tooltip. Timeframe buttons are visual only.
 *
 * @param {object} props
 * @param {string} [props.pair='EUR/USD']
 * @param {number} [props.baseValue=1.08423]
 * @param {number} [props.changePct=0.31]
 * @param {number} [props.height=320]
 */
export default function PriceChart({ pair = 'EUR/USD', baseValue = 1.08423, changePct = 0.31, height = 320 }) {
  const [timeframe, setTimeframe] = useState('1D')
  const data = useMemo(() => generatePriceHistory(baseValue), [baseValue])
  const lastClose = data[data.length - 1]?.close ?? baseValue

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-md border border-border bg-surface-2 px-3 py-1.5">
            <span className="h-2 w-2 rounded-full bg-accent-bright" aria-hidden="true" />
            <span className="font-mono text-sm font-semibold text-text">{pair}</span>
          </div>
          <div>
            <span className="font-mono text-lg font-semibold tabular-nums text-text">
              {lastClose.toFixed(5)}
            </span>
            <ChangeIndicator value={changePct} size="sm" className="ml-2" />
          </div>
        </div>
        <div
          role="group"
          aria-label="Chart timeframe"
          className="flex items-center gap-1 rounded-md border border-border bg-surface-2 p-0.5"
        >
          {TIMEFRAMES.map((label) => (
            <button
              key={label}
              type="button"
              aria-pressed={timeframe === label}
              onClick={() => setTimeframe(label)}
              className={cn(
                'rounded px-2.5 py-1 font-mono text-xs font-medium transition-colors',
                timeframe === label
                  ? 'bg-[var(--ds-accent-soft)] text-accent-bright'
                  : 'text-text-faint hover:text-text',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="priceFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--ds-accent-bright)" stopOpacity={0.28} />
              <stop offset="100%" stopColor="var(--ds-accent-bright)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--ds-border)" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="time"
            tick={{ fill: AXIS_COLOR, fontSize: 11, fontFamily: 'var(--ds-font-mono)' }}
            tickLine={false}
            axisLine={false}
            minTickGap={48}
          />
          <YAxis
            orientation="right"
            domain={['dataMin', 'dataMax']}
            tick={{ fill: AXIS_COLOR, fontSize: 11, fontFamily: 'var(--ds-font-mono)' }}
            tickLine={false}
            axisLine={false}
            width={56}
            tickFormatter={(value) => value.toFixed(4)}
          />
          <Tooltip content={<PriceTooltip />} cursor={{ stroke: 'var(--ds-border-strong)' }} />
          <Area
            type="monotone"
            dataKey="close"
            stroke="var(--ds-accent-bright)"
            strokeWidth={2}
            fill="url(#priceFill)"
            isAnimationActive
            animationDuration={600}
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
