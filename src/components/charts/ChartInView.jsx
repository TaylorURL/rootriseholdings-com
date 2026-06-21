import { useRef } from 'react'
import { useInView } from 'framer-motion'

/**
 * Defers mounting a recharts chart until it scrolls into view, so the chart's
 * draw-in animation fires on reveal rather than silently off-screen. Reserves
 * the chart's height up-front to avoid layout shift, and renders immediately for
 * reduced-motion-agnostic correctness (the animation itself respects the global
 * guard via recharts' own timing collapse).
 *
 * @param {object} props
 * @param {number} props.height - reserved height while pending
 * @param {() => React.ReactNode} props.children - render-prop returning the chart
 * @param {string} [props.className]
 */
export default function ChartInView({ height, children, className }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-40px' })

  return (
    <div ref={ref} className={className} style={{ minHeight: height }}>
      {inView ? children() : null}
    </div>
  )
}
