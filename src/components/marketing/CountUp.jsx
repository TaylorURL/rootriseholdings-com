import { useEffect, useRef, useState } from 'react'
import { useInView, useReducedMotion } from 'framer-motion'

/**
 * Animate a number from 0 → target the first time it scrolls into view.
 * Uses requestAnimationFrame and an ease-out curve; honors reduced-motion by
 * rendering the final value immediately.
 *
 * @param {object} props
 * @param {number} props.value - target value
 * @param {number} [props.duration=1500] - animation length in ms
 * @param {number} [props.decimals=0]
 * @param {string} [props.prefix='']
 * @param {string} [props.suffix='']
 * @param {string} [props.className]
 */
export default function CountUp({
  value,
  duration = 1500,
  decimals = 0,
  prefix = '',
  suffix = '',
  className,
}) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })
  const reduceMotion = useReducedMotion()
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    if (!inView) return
    if (reduceMotion) {
      setDisplay(value)
      return
    }

    let frame
    let startTime
    const step = (timestamp) => {
      if (startTime === undefined) startTime = timestamp
      const progress = Math.min((timestamp - startTime) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(value * eased)
      if (progress < 1) frame = requestAnimationFrame(step)
    }
    frame = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame)
  }, [inView, value, duration, reduceMotion])

  const formatted = display.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })

  return (
    <span ref={ref} className={className}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  )
}
