import { useRef } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { cn } from '../../lib/cn'
import { useScrollLerp } from '../../lib/useScrollLerp'

/**
 * Shared marketing-page hero shell. Owns the page's first scroll-driven
 * moment: the technical grid drifts up, the purple key-light parallaxes a
 * touch slower, and the conic mesh fades out as the user scrolls past the
 * fold. The lag from `useScrollLerp`'s spring is what gives it the cinematic
 * feel instead of a 1:1 scroll glue. Reduced-motion users see the static
 * backdrop with all decoration in its rest state.
 *
 * Pure presentation — no copy/handler contracts; callers compose their
 * headline into the children slot.
 *
 * @param {object} props
 * @param {React.ReactNode} props.children
 * @param {string} [props.className]
 */
export default function MarketingHero({ children, className }) {
  const ref = useRef(null)
  const reduce = useReducedMotion()

  // Decorative-only; never scrub the copy itself. Springs lag the linear
  // scroll progress so the parallax tracks the user with a touch of softness.
  const gridY = useScrollLerp(ref, [0, 1], [0, reduce ? 0 : -120])
  const glowY = useScrollLerp(ref, [0, 1], [0, reduce ? 0 : -60])
  const glowOpacity = useScrollLerp(ref, [0, 1], [1, reduce ? 1 : 0.2])
  const meshOpacity = useScrollLerp(ref, [0, 1], [0.7, reduce ? 0.7 : 0.3])

  return (
    <section
      ref={ref}
      data-theme="dark"
      className={cn('relative overflow-hidden bg-bg pt-32 text-text sm:pt-40', className)}
    >
      {/* Technical hairline grid — drifts up as the page scrolls. */}
      <motion.div
        style={{ y: gridY }}
        className="bg-grid bg-grid-fade pointer-events-none absolute inset-0 opacity-60"
        aria-hidden="true"
      />
      {/* Layered purple mesh wash — fades down as the user passes the fold. */}
      <motion.div
        style={{ opacity: meshOpacity }}
        className="bg-mesh pointer-events-none absolute inset-0"
        aria-hidden="true"
      />
      {/* Cinematic key light — parallaxes upward and dims as it leaves the viewport. */}
      <motion.div
        style={{ y: glowY, opacity: glowOpacity }}
        className="accent-glow-strong pointer-events-none absolute -top-40 left-1/2 h-[600px] w-[600px] -translate-x-1/2"
        aria-hidden="true"
      />
      {children}
    </section>
  )
}
