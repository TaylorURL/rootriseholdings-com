import { Skeleton, SkeletonRegion } from '../ui/Skeleton'

/**
 * The placeholder a route shows while its own code arrives. One composition for
 * every route, so a page in flight always reserves the same shape: the heading,
 * its subtitle, then the first band of content under them.
 *
 * The fade carries a delay, so a chunk that lands inside the window a reader
 * would not notice shows nothing at all rather than a flash of grey boxes.
 */
export default function RoutePending() {
  return (
    <SkeletonRegion label="Loading the page" className="pending-in space-y-6">
      <Skeleton className="h-8 w-56 rounded-control" />
      <Skeleton className="h-4 w-80 rounded-sm" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Skeleton className="h-64 w-full rounded-card" />
        <Skeleton className="h-64 w-full rounded-card" />
      </div>
    </SkeletonRegion>
  )
}
