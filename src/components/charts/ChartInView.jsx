import { useRef } from 'react'
import { useInView } from 'framer-motion'
import { Skeleton, SkeletonRegion } from '../ui/Skeleton'
import { cn } from '../../lib/cn'

/**
 * Defers mounting a recharts chart until it scrolls into view, so the chart's
 * draw-in animation fires on reveal rather than silently off-screen.
 *
 * The wrapper holds the chart's box from first paint and the placeholder fills
 * it rather than carrying a height of its own, so a chart sized to fill its
 * column is stood in for at that size and nothing moves when it lands. The
 * placeholder is square-cornered because a chart surface is.
 *
 * @param {object} props
 * @param {number} props.height - the least height the box holds, whether or not the chart has
 *   mounted; a chart set to fill grows past it
 * @param {() => React.ReactNode} props.children - render-prop returning the chart
 * @param {string} [props.className]
 * @param {string} [props.label] - accessible name for the pending region
 */
export default function ChartInView({ height, children, className, label = 'Chart' }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-40px' })

  return (
    <div ref={ref} className={cn('flex flex-col', className)} style={{ minHeight: height }}>
      {inView ? (
        <div className="content-enter flex flex-1 flex-col">{children()}</div>
      ) : (
        <SkeletonRegion label={`${label} loading`} className="flex flex-1 flex-col">
          <Skeleton className="w-full flex-1" />
        </SkeletonRegion>
      )}
    </div>
  )
}
