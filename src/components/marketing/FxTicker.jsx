import { Suspense, lazy } from 'react'
import { cn } from '../../lib/cn'
import { Skeleton, SkeletonRegion } from '../ui/Skeleton'
import { ChunkErrorBoundary, withChunkReload } from '../../lib/lazyRoute.jsx'
import { useArrived } from '../../lib/arrival.js'

const FxTickerRows = lazy(withChunkReload(() => import('./FxTickerRows')))

/** How many placeholder quotes stand in for the strip before any arrive. */
const PENDING_ITEMS = 8

/**
 * One pending quote, built to the same padding and line box as a real one so the
 * strip stands at its full height before the first read lands. An empty strip
 * collapses to its two borders and pushes the page down by its own height the
 * moment quotes arrive.
 */
function PendingItem() {
  return (
    <span className="flex shrink-0 items-center gap-3 px-6 py-3">
      <Skeleton className="h-5 w-16 rounded-sm" />
      <Skeleton className="h-5 w-20 rounded-sm" />
      <Skeleton className="h-5 w-12 rounded-sm" />
    </span>
  )
}

function PendingStrip() {
  return (
    <SkeletonRegion label="Loading live rates" className="flex w-max">
      <div className="flex divide-x divide-border">
        {Array.from({ length: PENDING_ITEMS }, (_, index) => (
          <PendingItem key={index} />
        ))}
      </div>
    </SkeletonRegion>
  )
}

/**
 * Edge-to-edge live instrument marquee across the desk's traded and watch sets,
 * reading the shared quote stream.
 *
 * The track is duplicated so the CSS scroll never shows a seam at the loop
 * point; reduced-motion readers get the same strip standing still.
 *
 * The strip itself is in the document the build writes out; the rows are asked
 * for once the page is past its own arrival. Until they land the strip stands
 * on the placeholder it has always stood on, which is what it stood on for the
 * whole of the first read anyway.
 *
 * @param {object} props
 * @param {string} [props.className]
 */
export default function FxTicker({ className }) {
  const arrived = useArrived()

  return (
    <div
      className={cn(
        'marquee-fade-x group relative flex overflow-hidden border-y border-border bg-bg-elevated',
        className
      )}
      aria-label="Live instrument rates"
    >
      {arrived ? (
        <ChunkErrorBoundary>
          <Suspense fallback={<PendingStrip />}>
            <FxTickerRows pending={<PendingStrip />} />
          </Suspense>
        </ChunkErrorBoundary>
      ) : (
        <PendingStrip />
      )}
    </div>
  )
}
