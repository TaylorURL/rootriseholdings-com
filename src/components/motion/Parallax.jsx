import { useRef } from 'react'
import { motion, useReducedMotion, useScroll, useSpring, useTransform } from 'framer-motion'

/**
 * Scroll-linked parallax wrapper. Translates its children on the Y axis as the
 * element travels through the viewport. GPU-friendly (transform only) and inert
 * under prefers-reduced-motion.
 *
 * @param {object} props
 * @param {React.ReactNode} props.children
 * @param {number} [props.speed=60] - px of travel across the full scroll range
 * @param {boolean} [props.smooth=true] - spring-smooth the motion
 * @param {React.ElementType} [props.as='div']
 * @param {string} [props.className]
 */
export default function Parallax({ children, speed = 60, smooth = true, as = 'div', className, ...rest }) {
  const ref = useRef(null)
  const reduce = useReducedMotion()
  const MotionTag = motion[as] ?? motion.div
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const raw = useTransform(scrollYProgress, [0, 1], [reduce ? 0 : speed, reduce ? 0 : -speed])
  const y = useSpring(raw, { stiffness: 90, damping: 24, mass: 0.6 })

  return (
    <MotionTag ref={ref} className={className} style={{ y: smooth ? y : raw }} {...rest}>
      {children}
    </MotionTag>
  )
}
