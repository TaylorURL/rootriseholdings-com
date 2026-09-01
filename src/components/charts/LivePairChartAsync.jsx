import { Suspense, lazy, useState, useEffect } from 'react'
import { Skeleton, SkeletonRegion } from '../ui/Skeleton'
import { ChunkErrorBoundary, withChunkReload } from '../../lib/lazyRoute.jsx'
import { useInstrumentQuote } from '../../lib/marketData/instrumentQuotes.js'

const LivePairChart = lazy(withChunkReload(() => import('../ui/LivePairChart')))

/**
 * The placeholder, as its own component so the document written at build time
 * and the browser's first render are the same markup rather than two things
 * that happen to look alike.
 *
 * It holds the whole component's box, not just the plot: the chart carries a
 * header row of symbol and price above it unless `compact` is set, so the
 * placeholder carries one too. Standing in for the plot alone left the rest of
 * the page to move down by the header's height when the quote landed.
 */
function ChartPending({ height, compact }) {
  return (
    <SkeletonRegion label="Loading the chart" className="flex flex-col" data-chart-slot="">
      {!compact && (
        <div className="mb-3 flex items-center justify-between">
          <Skeleton className="h-7 w-24 rounded-sm" />
          <Skeleton className="h-7 w-28 rounded-sm" />
        </div>
      )}
      <Skeleton className="w-full" style={{ height }} />
    </SkeletonRegion>
  )
}

/**
 * The sparkline with its chart engine fetched at the point of use, so a reader
 * who never scrolls past the copy never downloads it.
 *
 * The build writes out the placeholder rather than the chart, and the first
 * render on both sides is that same placeholder. Rendering the Suspense
 * boundary only once the page is past its own arrival keeps the server and
 * client trees identical during hydration, which is what React #421 refused: a
 * state update landing on a Suspense boundary whose server markup was a direct
 * render rather than a fallback.
 *
 * The engine is asked for when the instrument's quote lands, because the plot
 * has nothing to draw before then and the fetch would otherwise sit on the
 * network beside the code the first screen is waiting on. An instrument the
 * feed does not serve never gets a quote, so an idle callback carries it to the
 * chart's own unavailable state rather than leaving it on a placeholder.
 *
 * @param {object} props
 * @param {string} props.symbol - instrument symbol, e.g. 'XAUUSD'
 * @param {number} [props.height=220]
 * @param {boolean} [props.compact=false] - the chart hides its header row
 */
export default function LivePairChartAsync({ symbol, height = 220, compact = false, ...rest }) {
  const priced = Boolean(useInstrumentQuote(symbol))
  const [idle, setIdle] = useState(false)

  useEffect(() => {
    if (typeof window.requestIdleCallback === 'function') {
      const handle = window.requestIdleCallback(() => setIdle(true), { timeout: 4_000 })
      return () => window.cancelIdleCallback(handle)
    }
    const handle = window.setTimeout(() => setIdle(true), 1_200)
    return () => window.clearTimeout(handle)
  }, [])

  if (!priced && !idle) return <ChartPending height={height} compact={compact} />

  return (
    <ChunkErrorBoundary>
      <Suspense fallback={<ChartPending height={height} compact={compact} />}>
        <LivePairChart symbol={symbol} height={height} compact={compact} {...rest} />
      </Suspense>
    </ChunkErrorBoundary>
  )
}
