import { Suspense, forwardRef, lazy, useEffect, useRef, useState } from 'react'
import { useInView } from 'framer-motion'
import { Skeleton, SkeletonRegion } from '../ui/Skeleton'
import { ChunkErrorBoundary, withChunkReload } from '../../lib/lazyRoute.jsx'
import { useInstrumentQuote } from '../../lib/marketData/instrumentQuotes.js'
import { useArrived } from '../../lib/arrival.js'

const LivePairChart = lazy(withChunkReload(() => import('../ui/LivePairChart')))

/** How far outside the viewport a slot counts as worth fetching the engine for. */
const NEAR_VIEWPORT = '200px'

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
const ChartPending = forwardRef(function ChartPending({ height, compact }, ref) {
  return (
    <SkeletonRegion
      ref={ref}
      label="Loading the chart"
      className="flex flex-col"
      data-chart-slot=""
    >
      {!compact && (
        <div className="mb-3 flex items-center justify-between">
          <Skeleton className="h-7 w-24 rounded-sm" />
          <Skeleton className="h-7 w-28 rounded-sm" />
        </div>
      )}
      <Skeleton className="w-full" style={{ height }} />
    </SkeletonRegion>
  )
})

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
 * Three things have to be true before the engine is asked for, and each answers
 * a different question. The page has to be past its own arrival, because a
 * hundred kilobytes of chart code parsed inside hydration is paid for by the
 * reader waiting on the screen it is not drawing. The slot has to be near the
 * viewport, because a chart nobody has scrolled to draws nothing either way.
 * And the instrument has to have a price, because the plot has nothing to draw
 * before then. An instrument the feed does not serve never gets one, so an idle
 * callback carries it to the chart's own unavailable state rather than leaving
 * it on a placeholder forever.
 *
 * @param {object} props
 * @param {string} props.symbol - instrument symbol, e.g. 'XAUUSD'
 * @param {number} [props.height=220]
 * @param {boolean} [props.compact=false] - the chart hides its header row
 */
export default function LivePairChartAsync({ symbol, height = 220, compact = false, ...rest }) {
  const slotRef = useRef(null)
  const near = useInView(slotRef, { once: true, margin: NEAR_VIEWPORT })
  const arrived = useArrived()
  const ready = arrived && near
  const priced = Boolean(useInstrumentQuote(symbol, { enabled: ready }))
  const [unpriced, setUnpriced] = useState(false)

  useEffect(() => {
    if (!ready) return undefined
    if (typeof window.requestIdleCallback === 'function') {
      const handle = window.requestIdleCallback(() => setUnpriced(true), { timeout: 4_000 })
      return () => window.cancelIdleCallback(handle)
    }
    const handle = window.setTimeout(() => setUnpriced(true), 1_200)
    return () => window.clearTimeout(handle)
  }, [ready])

  if (!ready || (!priced && !unpriced))
    return <ChartPending ref={slotRef} height={height} compact={compact} />

  return (
    <ChunkErrorBoundary>
      <Suspense fallback={<ChartPending height={height} compact={compact} />}>
        <LivePairChart symbol={symbol} height={height} compact={compact} {...rest} />
      </Suspense>
    </ChunkErrorBoundary>
  )
}
