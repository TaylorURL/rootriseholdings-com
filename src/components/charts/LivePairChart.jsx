import { useEffect, useMemo, useRef, useState } from 'react'
import { createChart } from 'lightweight-charts'
import { ArrowDownRight, ArrowUpRight } from 'lucide-react'
import { cn } from '../../lib/cn'
import { useInstrumentQuote } from '../../lib/marketData/instrumentQuotes.js'
import { formatInstrumentPrice } from '../../lib/format'
import { useTheme } from '../../context/ThemeContext'
import { chartOptions, resolveTokens } from './lwcTheme'
import { formatCt } from '../../lib/time.js'

/**
 * An instrument's current session, with its price above it.
 *
 * This is the chart that appears most often on the site - the hero, the four
 * cards under it, and the markets rail - and until now it was an area with no
 * axis, no crosshair and no readout: a shape that told a reader the line went
 * up without letting them ask by how much, or when. A sparkline is a reasonable
 * thing to put in a table row and an unreasonable thing to give a third of the
 * first screen to.
 *
 * So the plot carries a time axis, a price axis and a crosshair at full size,
 * and drops to the bare shape only where it is genuinely a thumbnail. Both come
 * off the same engine the candle chart uses, which is what makes them behave
 * the same way under a finger.
 *
 * The series is still the intraday bars travelling on the shared quote, so this
 * opens no request of its own and every instance on a page moves together off
 * one read.
 *
 * @param {object} props
 * @param {string} props.symbol - instrument symbol, e.g. 'XAUUSD'
 * @param {number} [props.height=220]
 * @param {boolean} [props.compact=false] - hide the header row and the axes
 * @param {string} [props.className]
 */
export default function LivePairChart({ symbol, height = 220, compact = false, className }) {
  const quote = useInstrumentQuote(symbol)
  const holder = useRef(null)
  const chartRef = useRef(null)
  const areaRef = useRef(null)
  const { theme } = useTheme()
  const [hover, setHover] = useState(null)

  const positive = (quote?.changePct ?? 0) >= 0
  const Arrow = positive ? ArrowUpRight : ArrowDownRight

  const series = useMemo(() => {
    const rows = (quote?.intraday ?? [])
      .filter((candle) => candle && Number.isFinite(candle.time) && Number.isFinite(candle.close))
      .sort((a, b) => a.time - b.time)
    const points = []
    let last = null
    for (const candle of rows) {
      const time = Math.floor(candle.time / 1000)
      if (time === last) continue
      last = time
      points.push({ time, value: candle.close })
    }
    return points
  }, [quote])

  useEffect(() => {
    const element = holder.current
    if (!element) return undefined

    const tokens = resolveTokens(element)
    const chart = createChart(element, {
      ...chartOptions(tokens, {
        // A thumbnail has no room for furniture, so it keeps the shape alone.
        timeAxis: !compact,
        priceAxis: !compact,
        grid: !compact,
      }),
      height,
      autoSize: false,
    })
    chartRef.current = chart
    areaRef.current = chart.addAreaSeries({
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: !compact,
      crosshairMarkerVisible: !compact,
      crosshairMarkerRadius: 3,
    })

    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect?.width
      if (width) chart.applyOptions({ width: Math.floor(width) })
    })
    observer.observe(element)
    chart.applyOptions({ width: Math.floor(element.clientWidth) })

    if (!compact) {
      chart.subscribeCrosshairMove((param) => {
        const point = param?.seriesData?.get(areaRef.current)
        setHover(point && param.point != null ? { value: point.value, time: param.time } : null)
      })
    }

    return () => {
      observer.disconnect()
      chart.remove()
      chartRef.current = null
      areaRef.current = null
    }
    // Built once; height and colour are applied below rather than rebuilt.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [compact])

  useEffect(() => {
    chartRef.current?.applyOptions({ height })
  }, [height])

  // Direction and theme both repaint the same way: the line takes the colour
  // the session's direction earns, and the fill fades it out underneath.
  useEffect(() => {
    const area = areaRef.current
    const element = holder.current
    if (!area || !element) return
    const tokens = resolveTokens(element)
    const stroke = positive ? tokens['--ds-positive'] : tokens['--ds-danger']
    area.applyOptions({
      lineColor: stroke,
      topColor: `${stroke}44`,
      bottomColor: `${stroke}00`,
    })
    chartRef.current?.applyOptions(
      chartOptions(tokens, { timeAxis: !compact, priceAxis: !compact, grid: !compact })
    )
  }, [positive, theme, compact])

  useEffect(() => {
    if (!areaRef.current || !series.length) return
    areaRef.current.setData(series)
    chartRef.current?.timeScale().fitContent()
  }, [series])

  const shown = hover?.value ?? quote?.price

  return (
    <div data-chart-slot="" className={cn('content-enter flex flex-col', className)}>
      {!compact && quote && (
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <span
              className="h-2 w-2 shrink-0 rounded-full bg-accent-bright shadow-[var(--ds-glow-dot)]"
              aria-hidden="true"
            />
            <span className="truncate text-sm font-semibold tabular-nums text-text">
              {quote.displaySymbol}
            </span>
            {hover ? (
              <span className="truncate text-xs tabular-nums text-text-faint">
                {formatCt(hover.time * 1000, { hour: '2-digit', minute: '2-digit' })}
              </span>
            ) : null}
          </div>
          <div className="flex shrink-0 items-baseline gap-2">
            <span className="text-lg font-semibold tabular-nums text-text">
              {formatInstrumentPrice(shown, symbol)}
            </span>
            <span
              className={cn(
                'flex items-center gap-0.5 text-xs tabular-nums',
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
      <div ref={holder} style={{ height }} className="w-full" />
    </div>
  )
}
