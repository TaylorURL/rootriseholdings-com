import { motion, useScroll, useSpring } from 'framer-motion'

/**
 * Fixed reading-progress bar pinned to the top of the viewport, scaled on the X
 * axis with document scroll so it costs a transform rather than a layout pass.
 * The spring runs for every reader: the bar reports position in the page rather
 * than decorating it, so it is not one of the effects reduced motion drops.
 *
 * @param {object} props
 * @param {string} [props.className]
 */
export default function ScrollProgress({ className }) {
  const { scrollYProgress } = useScroll()
  const scaleX = useSpring(scrollYProgress, { stiffness: 140, damping: 28, mass: 0.4 })

  return (
    <motion.div
      style={{ scaleX }}
      className={
        'accent-face fixed inset-x-0 top-0 z-[60] h-0.5 origin-left ' +
        'shadow-[var(--ds-glow-dot)]' +
        (className ?? '')
      }
      aria-hidden="true"
    />
  )
}
