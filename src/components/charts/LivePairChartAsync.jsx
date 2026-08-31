import { Suspense, lazy, useState, useEffect } from 'react'
import { Skeleton, SkeletonRegion } from '../ui/Skeleton'
import { ChunkErrorBoundary, withChunkReload } from '../../lib/lazyRoute.jsx'

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
 * The build writes out the placeholder rather than the chart. Hydration adopts
 * that placeholder on its first pass (mounted is false on both server and
 * client), then the effect flips it and the Suspense-wrapped chart takes over.
 * Rendering the Suspense boundary only after mount keeps the server and client
 * trees identical during hydration, which is what React #421 refused: a state
 * update landing on a Suspense boundary whose server markup was a direct render
 * rather than a fallback.
 *
 * @param {object} props
 * @param {string} props.symbol - instrument symbol, e.g. 'XAUUSD'
 * @param {number} [props.height=220]
 * @param {boolean} [props.compact=false] - the chart hides its header row
 */
export default function LivePairChartAsync({ height = 220, compact = false, ...rest }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  if (!mounted) return <ChartPending height={height} compact={compact} />

  return (
    <ChunkErrorBoundary>
      <Suspense fallback={<ChartPending height={height} compact={compact} />}>
        <LivePairChart height={height} compact={compact} {...rest} />
      </Suspense>
    </ChunkErrorBoundary>
  )
}
