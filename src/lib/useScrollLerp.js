import { useScroll, useSpring, useTransform } from 'framer-motion'

/**
 * Spring-smoothed scroll-driven motion value. Wraps `useScroll`'s linear
 * progress in a spring so decorative layers (parallax glows, drifting
 * backdrops, hero columns) lag scroll slightly instead of tracking it 1:1 —
 * the lag is what makes scrubbed motion feel cinematic. GPU-only (transform
 * / opacity values consume this).
 *
 * @param {React.RefObject<HTMLElement>} ref - section to track
 * @param {[number, number]} input - scrollYProgress input range, e.g. [0, 1]
 * @param {[number|string, number|string]} output - mapped output range
 * @param {object} [scrollOptions] - useScroll options
 * @param {object} [springOptions] - useSpring options
 */
export function useScrollLerp(
  ref,
  input,
  output,
  scrollOptions = { offset: ['start end', 'end start'] },
  springOptions = { stiffness: 120, damping: 30, mass: 0.6 },
) {
  const { scrollYProgress } = useScroll({ target: ref, ...scrollOptions })
  const raw = useTransform(scrollYProgress, input, output)
  return useSpring(raw, springOptions)
}
