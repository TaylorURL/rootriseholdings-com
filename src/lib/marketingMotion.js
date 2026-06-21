/** Motion primitives shared across the marketing site. GPU-friendly: every
 *  variant animates only transform/opacity. Easing mirrors the design tokens. */

export const EASE_OUT = [0.23, 1, 0.32, 1]
export const EASE_IN_OUT = [0.77, 0, 0.175, 1]

/** Default viewport config for scroll-reveal: fire once, slightly early. */
export const REVEAL_VIEWPORT = { once: true, margin: '-80px' }

export const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE_OUT } },
}

export const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.7, ease: EASE_OUT } },
}

/** Parent that staggers its children's reveals. */
export const staggerParent = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
}
