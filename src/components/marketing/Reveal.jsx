import { motion, useReducedMotion } from 'framer-motion'
import { EASE_OUT, REVEAL_VIEWPORT } from '../../lib/marketingMotion'

/**
 * Scroll-triggered reveal wrapper. Fades and lifts its children into view once,
 * GPU-friendly (transform/opacity only). Respects prefers-reduced-motion by
 * keeping the fade but dropping the positional movement.
 *
 * @param {object} props
 * @param {React.ReactNode} props.children
 * @param {number} [props.delay=0] - seconds to delay the reveal (for staggering)
 * @param {number} [props.y=24] - initial vertical offset in px
 * @param {string} [props.className]
 * @param {React.ElementType} [props.as='div']
 */
export default function Reveal({ children, delay = 0, y = 24, className, as = 'div' }) {
  const reduceMotion = useReducedMotion()
  const MotionTag = motion[as] ?? motion.div

  return (
    <MotionTag
      className={className}
      initial={{ opacity: 0, y: reduceMotion ? 0 : y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={REVEAL_VIEWPORT}
      transition={{ duration: 0.6, ease: EASE_OUT, delay }}
    >
      {children}
    </MotionTag>
  )
}
