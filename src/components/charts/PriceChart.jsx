import { useMemo, useState } from 'react'
import {
  Bar,
  Brush,
  CartesianGrid,
  Cell,
  ComposedChart,
  ReferenceArea,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { ChartTooltipShell } from '../ui/ChartTooltip'
import { AXIS_TICK, CURSOR_STROKE, GRID_STROKE } from './chartTheme'
import { formatCt } from '../../lib/time.js'

const UP = 'var(--ds-positive)'
const DOWN = 'var(--ds-danger)'

/**
 * Price pane height as a share of the whole, leaving the rest to volume. A
 * candle chart that gives volume equal weight reads as two charts; a quarter is
 * enough to see where participation came in.
 */
const VOLUME_SHARE = 0.24

/** Padding above and below the series, as a share of its own range. */
const PRICE_PAD = 0.06

/** How many bars the range selector opens on. */
const WINDOW_BARS = 80

/** Past this many bars the series gets a range selector. */
const BRUSH_AFTER = 40

/**
 * One candle: a wick spanning the bar's range and a body between open and
 * close.
 *
 * Recharts hands the shape the pixel box of the `range` bar it is bound to,
 * which already spans low to high, so open and close are interpolated inside
 * that box rather than measured against the axis a second time.
 */
function Candle({ x, y, width, height, payload }) {
  const { open, close, high, low } = payload
  if (high == null || low == null) return null
  const span = high - low
  const pixelFor = (value) => (span === 0 ? y : y + ((high - value) / span) * height)
  const openY = pixelFor(open)
  const closeY = pixelFor(close)
  const rising = close >= open
  const color = rising ? UP : DOWN
  const bodyTop = Math.min(openY, closeY)
  const bodyHeight = Math.max(1, Math.abs(closeY - openY))
  const centerX = x + width / 2
  const bodyWidth = Math.max(1.5, width * 0.62)

  return (
    <g>
      <line
        x1={centerX}
        x2={centerX}
        y1={y}
        y2={y + height}
        stroke={color}
        strokeWidth={1}
        opacity={0.75}
      />
      <rect
        x={centerX - bodyWidth / 2}
        y={bodyTop}
        width={bodyWidth}
        height={bodyHeight}
        rx={0.5}
        fill={rising ? color : 'transparent'}
        stroke={color}
        strokeWidth={rising ? 0 : 1}
        opacity={0.95}
      />
    </g>
  )
}

function PriceTooltip({ active, payload, decimals, moveLabel }) {
  if (!active || !payload?.length) return null
  const candle = payload[0].payload
  const rising = candle.close >= candle.open
  const change = candle.close - candle.open
  const changePct = candle.open ? (change / candle.open) * 100 : 0
  const price = (value) =>
    value.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })

  return (
    <ChartTooltipShell>
      <p className="mb-1.5 font-mono text-[11px] text-text-faint">{candle.label}</p>
      <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-0.5 font-mono text-xs tabular-nums">
        <span className="text-text-faint">O</span>
        <span className="text-right text-text">{price(candle.open)}</span>
        <span className="text-text-faint">H</span>
        <span className="text-right text-text">{price(candle.high)}</span>
        <span className="text-text-faint">L</span>
        <span className="text-right text-text">{price(candle.low)}</span>
        <span className="text-text-faint">C</span>
        <span className={rising ? 'text-right text-positive' : 'text-right text-danger'}>
          {price(candle.close)}
        </span>
        <span className="mt-1 border-t border-border pt-1 text-text-faint">Δ</span>
        <span
          className={`mt-1 border-t border-border pt-1 text-right ${rising ? 'text-positive' : 'text-danger'}`}
        >
          {change >= 0 ? '+' : ''}
          {price(change)} {moveLabel} · {changePct >= 0 ? '+' : ''}
          {changePct.toFixed(2)}%
        </span>
        {candle.volume > 0 && (
          <>
            <span className="text-text-faint">Vol</span>
            <span className="text-right text-text-muted">
              {candle.volume.toLocaleString('en-US', {
                notation: 'compact',
                maximumFractionDigits: 1,
              })}
            </span>
          </>
        )}
      </div>
    </ChartTooltipShell>
  )
}

/**
 * The desk's price chart: real OHLCV candles with the structure read drawn on
 * top of them, so the levels the briefing describes in prose are the same
 * levels the reader can see.
 *
 * What the overlays mean, in the order they sit on the chart: the shaded band is
 * the 62-79% optimal-entry zone for the current leg; the dashed rules are the
 * last swing high and low that bound the dealing range; the marked points are
 * where structure last broke; the solid rule is the last close.
 *
 * @param {object} props
 * @param {Array<{time:number,open:number,high:number,low:number,close:number,volume:number}>} props.candles
 * @param {object} [props.analysis] - output of analyzeStructure for the same series
 * @param {number|string} [props.height=360] - a pixel height, or '100%' to fill a sized parent
 * @param {number} [props.decimals=2] - price precision in the readout
 * @param {string} [props.moveLabel='pts'] - unit the instrument moves in
 * @param {boolean} [props.brush=true] - show the range selector under the chart
 * @param {boolean} [props.animate=true]
 */
export default function PriceChart({
  candles,
  analysis,
  height = 360,
  decimals = 2,
  moveLabel = 'pts',
  brush = true,
  animate = true,
}) {
  const data = useMemo(
    () =>
      (candles ?? []).map((candle) => ({
        ...candle,
        range: [candle.low, candle.high],
        label: formatCt(candle.time, {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
      })),
    [candles]
  )

  const hasBrush = brush && data.length > BRUSH_AFTER
  const openingIndex = Math.max(0, data.length - WINDOW_BARS)
  const [window, setWindow] = useState(null)

  // The axis is scaled to the bars actually on screen, not to the whole series,
  // so a month of history behind the selector cannot flatten the week in front
  // of it. Panning the selector rescales with it.
  const visible = useMemo(() => {
    if (!hasBrush) return data
    const from = window?.startIndex ?? openingIndex
    const to = window?.endIndex ?? data.length - 1
    return data.slice(from, to + 1)
  }, [data, hasBrush, window, openingIndex])

  const domain = useMemo(() => {
    const bars = visible.length ? visible : data
    if (!bars.length) return { price: [0, 1], volume: [0, 1] }
    const low = Math.min(...bars.map((candle) => candle.low))
    const high = Math.max(...bars.map((candle) => candle.high))
    const pad = (high - low) * PRICE_PAD || high * 0.01
    const maxVolume = Math.max(...bars.map((candle) => candle.volume), 1)
    return {
      // The volume axis is scaled so its bars occupy the bottom band only,
      // which keeps them under the price action instead of behind it.
      price: [low - pad, high + pad],
      volume: [0, maxVolume / VOLUME_SHARE],
    }
  }, [visible, data])

  if (!data.length) return null

  const lastClose = data[data.length - 1].close
  const ote = analysis?.oteZone
  const swings = analysis?.swings
  const events = (analysis?.events ?? []).filter((event) => event.index < data.length)

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart
        data={data}
        margin={{ top: 10, right: 56, bottom: 0, left: 0 }}
        barCategoryGap="18%"
      >
        <CartesianGrid stroke={GRID_STROKE} strokeDasharray="2 4" vertical={false} />

        <XAxis
          dataKey="label"
          tick={AXIS_TICK}
          tickLine={false}
          axisLine={{ stroke: GRID_STROKE }}
          minTickGap={48}
          interval="preserveStartEnd"
        />
        <YAxis
          yAxisId="price"
          orientation="right"
          domain={domain.price}
          tick={AXIS_TICK}
          tickLine={false}
          axisLine={false}
          width={56}
          tickFormatter={(value) => value.toFixed(decimals > 2 ? 2 : decimals)}
        />
        <YAxis yAxisId="volume" hide domain={domain.volume} />

        {/* The optimal-entry band for the leg in play. */}
        {ote && (
          <ReferenceArea
            yAxisId="price"
            y1={ote.from}
            y2={ote.to}
            fill="var(--ds-accent-glow)"
            fillOpacity={0.16}
            stroke="var(--ds-accent-bright)"
            strokeOpacity={0.35}
            strokeDasharray="3 3"
            ifOverflow="hidden"
            label={{
              value: 'OTE 62–79%',
              position: 'insideTopLeft',
              fill: 'var(--ds-accent-bright)',
              fontSize: 10,
            }}
          />
        )}

        {/* The dealing range the current price sits inside. */}
        {swings?.lastHigh != null && (
          <ReferenceLine
            yAxisId="price"
            y={swings.lastHigh}
            stroke="var(--ds-text-faint)"
            strokeDasharray="4 4"
            strokeOpacity={0.8}
            ifOverflow="hidden"
          />
        )}
        {swings?.lastLow != null && (
          <ReferenceLine
            yAxisId="price"
            y={swings.lastLow}
            stroke="var(--ds-text-faint)"
            strokeDasharray="4 4"
            strokeOpacity={0.8}
            ifOverflow="hidden"
          />
        )}

        <Bar yAxisId="volume" dataKey="volume" isAnimationActive={false} radius={[1, 1, 0, 0]}>
          {data.map((candle, index) => (
            <Cell
              key={`volume-${index}`}
              fill={candle.close >= candle.open ? UP : DOWN}
              fillOpacity={0.22}
            />
          ))}
        </Bar>

        <Bar
          yAxisId="price"
          dataKey="range"
          shape={<Candle />}
          isAnimationActive={animate}
          animationDuration={700}
          animationEasing="ease-out"
        />

        {/* Where structure broke, marked at the level and on the bar that broke
            it. A change of character reads larger than a continuation because it
            is the one that turns the bias. */}
        {events.map((event, index) => (
          <ReferenceDot
            key={`event-${index}`}
            yAxisId="price"
            x={data[event.index]?.label}
            y={event.level}
            r={event.type.startsWith('CHoCH') ? 4 : 2.5}
            fill={event.type.endsWith('Up') ? UP : DOWN}
            stroke="var(--ds-bg)"
            strokeWidth={1.5}
            ifOverflow="hidden"
          />
        ))}

        <ReferenceLine
          yAxisId="price"
          y={lastClose}
          stroke="var(--ds-accent-bright)"
          strokeWidth={1}
          strokeDasharray="6 3"
          ifOverflow="hidden"
          label={{
            value: lastClose.toFixed(decimals),
            position: 'right',
            fill: 'var(--ds-accent-bright)',
            fontSize: 11,
            fontFamily: 'var(--ds-font-mono)',
          }}
        />

        <Tooltip
          content={<PriceTooltip decimals={decimals} moveLabel={moveLabel} />}
          cursor={{ stroke: CURSOR_STROKE, strokeDasharray: '3 3' }}
        />

        {hasBrush && (
          <Brush
            dataKey="label"
            height={22}
            travellerWidth={8}
            stroke="var(--ds-border-strong)"
            fill="var(--ds-surface-2)"
            startIndex={openingIndex}
            onChange={(range) =>
              setWindow({ startIndex: range.startIndex, endIndex: range.endIndex })
            }
            tickFormatter={() => ''}
          />
        )}
      </ComposedChart>
    </ResponsiveContainer>
  )
}
