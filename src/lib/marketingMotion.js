/**
 * Canonical motion contract for the whole site. GPU-friendly by construction:
 * every variant animates only transform/opacity (and the occasional filter).
 * Easings mirror the design tokens in tokens.css so CSS and JS motion agree.
 *
 * This is the single source of truth for durations, easings, stagger rhythm and
 * the reveal variant vocabulary consumed by the shared motion primitives.
 */

/** Strong custom easings — never the weak CSS built-ins. */
export const EASE_OUT = [0.23, 1, 0.32, 1]
export const EASE_IN_OUT = [0.77, 0, 0.175, 1]
export const EASE_DRAWER = [0.32, 0.72, 0, 1]

/** Duration scale (seconds). Cinematic for marketing reveals, crisp for UI. */
export const DURATION = {
  fast: 0.16,
  base: 0.28,
  slow: 0.5,
  cinematic: 0.72,
}

/** Spring presets (Apple-style: easier to reason about than stiffness/damping). */
export const SPRING_SOFT = { type: 'spring', stiffness: 120, damping: 18, mass: 0.9 }
export const SPRING_SNAPPY = { type: 'spring', stiffness: 300, damping: 26 }
export const SPRING_CURSOR = { stiffness: 150, damping: 18, mass: 0.6 }

/** Default viewport config for scroll-reveal: fire once, slightly early. */
export const REVEAL_VIEWPORT = { once: true, margin: '-80px' }

/** Per-direction initial offsets for directional reveals. */
const OFFSET = 26

/**
 * Build the hidden/visible pair for a reveal in a given direction. Honors
 * reduced-motion by collapsing positional movement to a pure fade.
 *
 * @param {'up'|'down'|'left'|'right'|'none'} direction
 * @param {number} distance - px of travel
 * @param {boolean} reduce - reduced-motion active
 */
export function revealVariants(direction = 'up', distance = OFFSET, reduce = false) {
  const axis = direction === 'left' || direction === 'right' ? 'x' : 'y'
  const sign = direction === 'down' || direction === 'right' ? 1 : -1
  const from = reduce || direction === 'none' ? 0 : sign * -distance
  return {
    hidden: { opacity: 0, [axis]: from },
    visible: {
      opacity: 1,
      [axis]: 0,
      transition: { duration: DURATION.cinematic, ease: EASE_OUT },
    },
  }
}

/** Classic fade-up reveal. */
export const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE_OUT } },
}

export const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.7, ease: EASE_OUT } },
}

/** Soft blur-up — masks an imperfect entrance and reads more premium. */
export const blurUp = {
  hidden: { opacity: 0, y: 22, filter: 'blur(8px)' },
  visible: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: DURATION.cinematic, ease: EASE_OUT },
  },
}

/** Scale-in for framed panels — never from scale(0). */
export const scaleIn = {
  hidden: { opacity: 0, scale: 0.96, y: 16 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { duration: DURATION.cinematic, ease: EASE_OUT } },
}

/** Parent that staggers its children's reveals. */
export const staggerParent = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
}

/**
 * Build a stagger-parent variant with a custom cadence.
 * @param {number} stagger - seconds between children
 * @param {number} delay - initial delay before the first child
 */
export function staggerParentWith(stagger = 0.08, delay = 0.05) {
  return { hidden: {}, visible: { transition: { staggerChildren: stagger, delayChildren: delay } } }
}
