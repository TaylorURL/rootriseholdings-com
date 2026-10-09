import { useEffect, useMemo, useRef, useState } from 'react'
import { createChart } from 'lightweight-charts'
import { useTheme } from '../../context/ThemeContext'
import { chartOptions, resolveTokens } from './lwcTheme'
import { followChartWidth } from './chartWidth'
import { cn } from '../../lib/cn'
import { formatCt } from '../../lib/time.js'

/**
 * The desk's price chart, drawn by a charting engine rather than by hand.
 *
 * What was here before was a candle body and wick composed as an SVG shape and
 * handed to a general-purpose plotting library one bar at a time. It drew
 * correctly and it could not do the two things anybody opening a price chart
 * tries within five seconds: pinch it, and drag it. A range selector under the
 * plot is not a substitute for either, and on a phone it is a twenty-pixel
 * target on top of a chart that already swallowed the scroll.
 *
 * So the plot is a canvas now. Pan, pinch-zoom, the crosshair and the axis
 * scaling come from the engine, which means they behave the way they do in
 * every other trading application the reader has used. The structure read stays
 * exactly what it was - the same levels, from the same analysis - drawn as
 * price lines on the series instead of as reference shapes in the plot.
 *
 * @param {object} props
 * @param {Array<{time:number,open:number,high:number,low:number,close:number,volume:number}>} props.candles
 * @param {object} [props.analysis] - analyzeStructure output for the same series
 * @param {number} [props.height=360]
 * @param {number} [props.decimals=2]
 * @param {boolean} [props.volume=true] - draw the volume histogram under the price
 * @param {string} [props.className]
 */
export default function CandleChart({
  candles,
  analysis,
  height = 360,
  decimals = 2,
  volume = true,
  className,
}) {
  const holder = useRef(null)
  const chartRef = useRef(null)
  const priceRef = useRef(null)
  const volumeRef = useRef(null)
  const linesRef = useRef([])
  const { theme } = useTheme()
  const [readout, setReadout] = useState(null)

  const series = useMemo(() => {
    const rows = (candles ?? [])
      .filter((candle) => candle && Number.isFinite(candle.time))
      // The engine indexes by time and refuses a series that is not ascending
      // or that repeats a stamp, which a folded 4H series can do at a session
      // boundary. Sorting and de-duplicating here is cheaper than the throw.
      .sort((a, b) => a.time - b.time)
    const bars = []
    const volumes = []
    let last = null
    for (const candle of rows) {
      const time = Math.floor(candle.time / 1000)
      if (time === last) continue
      last = time
      bars.push({
        time,
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
      })
      volumes.push({ time, value: candle.volume ?? 0, rising: candle.close >= candle.open })
    }
    return { bars, volumes }
  }, [candles])

  // The chart is built once and then fed. Tearing it down whenever the data
  // changes would throw away the reader's pan and zoom on every two-minute
  // refresh, which is the same as not having them.
  useEffect(() => {
    const element = holder.current
    if (!element) return undefined

    const tokens = resolveTokens(element)
    const chart = createChart(element, {
      ...chartOptions(tokens),
      height,
      autoSize: false,
    })
    chartRef.current = chart

    priceRef.current = chart.addCandlestickSeries({
      upColor: tokens['--ds-positive'],
      downColor: 'transparent',
      borderUpColor: tokens['--ds-positive'],
      borderDownColor: tokens['--ds-danger'],
      wickUpColor: tokens['--ds-positive'],
      wickDownColor: tokens['--ds-danger'],
      priceFormat: { type: 'price', precision: decimals, minMove: 10 ** -decimals },
    })

    if (volume) {
      volumeRef.current = chart.addHistogramSeries({
        priceFormat: { type: 'volume' },
        priceScaleId: 'volume',
        lastValueVisible: false,
        priceLineVisible: false,
      })
      // A quarter of the pane, pinned to the bottom, so participation reads
      // under the price action rather than behind it.
      chart.priceScale('volume').applyOptions({
        scaleMargins: { top: 0.78, bottom: 0 },
        visible: false,
      })
    }

    // The width follows the column the chart sits in, read off the viewport
    // rather than off the column itself, so resizing the canvases cannot feed
    // a second size back into the read that caused it.
    const stopWidth = followChartWidth(element, (width) => chart.applyOptions({ width }))

    chart.subscribeCrosshairMove((param) => {
      const bar = param?.seriesData?.get(priceRef.current)
      if (!bar || param.point == null) {
        setReadout(null)
        return
      }
      setReadout({ ...bar, time: param.time })
    })

    return () => {
      stopWidth()
      chart.remove()
      chartRef.current = null
      priceRef.current = null
      volumeRef.current = null
      linesRef.current = []
    }
    // The engine is created once per mount. Height, precision and the volume
    // pane are applied below rather than rebuilt, so none of them belongs here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    chartRef.current?.applyOptions({ height })
  }, [height])

  // A theme change repaints rather than rebuilds, so the reader keeps whatever
  // part of the series they had scrolled to.
  useEffect(() => {
    const chart = chartRef.current
    const element = holder.current
    if (!chart || !element) return
    const tokens = resolveTokens(element)
    chart.applyOptions(chartOptions(tokens))
    priceRef.current?.applyOptions({
      upColor: tokens['--ds-positive'],
      downColor: 'transparent',
      borderUpColor: tokens['--ds-positive'],
      borderDownColor: tokens['--ds-danger'],
      wickUpColor: tokens['--ds-positive'],
      wickDownColor: tokens['--ds-danger'],
    })
  }, [theme])

  useEffect(() => {
    const price = priceRef.current
    if (!price || !series.bars.length) return
    price.setData(series.bars)
    if (volumeRef.current) {
      const tokens = resolveTokens(holder.current)
      volumeRef.current.setData(
        series.volumes.map((bar) => ({
          time: bar.time,
          value: bar.value,
          color: `${bar.rising ? tokens['--ds-positive'] : tokens['--ds-danger']}33`,
        }))
      )
    }
  }, [series])

  // The structure read, as price lines. They are cleared and redrawn together
  // because a level that has moved and a level that is gone look the same from
  // here, and leaving a stale one on the chart is worse than redrawing three.
  useEffect(() => {
    const price = priceRef.current
    if (!price) return
    for (const line of linesRef.current) price.removePriceLine(line)
    linesRef.current = []
    if (!analysis) return

    const tokens = resolveTokens(holder.current)
    const draw = (value, title, color, style = 2) => {
      if (value == null || !Number.isFinite(value)) return
      linesRef.current.push(
        price.createPriceLine({
          price: value,
          color,
          lineWidth: 1,
          lineStyle: style,
          axisLabelVisible: true,
          title,
        })
      )
    }

    draw(analysis.swings?.lastHigh, 'Swing High', tokens['--ds-text-faint'])
    draw(analysis.swings?.lastLow, 'Swing Low', tokens['--ds-text-faint'])
    draw(analysis.oteZone?.from, 'OTE 62%', tokens['--ds-accent-bright'], 1)
    draw(analysis.oteZone?.to, 'OTE 79%', tokens['--ds-accent-bright'], 1)
  }, [analysis])

  const fmt = (value) =>
    value?.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })

  return (
    <div className={cn('relative w-full', className)}>
      <div ref={holder} style={{ height }} className="w-full" />
      {readout ? (
        <div className="bg-surface/90 pointer-events-none absolute left-2 top-2 flex flex-wrap items-center gap-x-3 gap-y-0.5 rounded-sm px-2 py-1 text-xs tabular-nums shadow-[0_0_0_1px_var(--ds-border)] backdrop-blur-sm">
          <span className="text-text-faint">
            {formatCt(readout.time * 1000, {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
          <span className="text-text-faint">
            O <span className="text-text">{fmt(readout.open)}</span>
          </span>
          <span className="text-text-faint">
            H <span className="text-text">{fmt(readout.high)}</span>
          </span>
          <span className="text-text-faint">
            L <span className="text-text">{fmt(readout.low)}</span>
          </span>
          <span className="text-text-faint">
            C{' '}
            <span className={readout.close >= readout.open ? 'text-positive' : 'text-danger'}>
              {fmt(readout.close)}
            </span>
          </span>
        </div>
      ) : null}
    </div>
  )
}
