import { motion, useScroll, useSpring } from 'framer-motion'

/**
 * Fixed reading-progress bar pinned to the top of the viewport. Scales on the X
 * axis with document scroll (transform only). Reduced-motion users still get the
 * indicator — it's information, not decoration — just without spring smoothing.
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
        'fixed inset-x-0 top-0 z-[60] h-0.5 origin-left bg-[var(--ds-accent-face)] ' +
        'shadow-[0_0_12px_var(--ds-accent-glow)] ' +
        (className ?? '')
      }
      aria-hidden="true"
    />
  )
}
