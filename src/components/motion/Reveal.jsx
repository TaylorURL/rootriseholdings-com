import { motion } from 'framer-motion'
import {
  DURATION,
  EASE_OUT,
  REVEAL_VIEWPORT,
  blurUp,
  revealVariants,
  scaleIn,
  useSafeReducedMotion,
} from '../../lib/marketingMotion'

/**
 * Fades and lifts its children into view as they are scrolled to, animating
 * transform, opacity and filter alone. Under prefers-reduced-motion the travel,
 * scale and blur collapse to a fade, so the content still arrives.
 *
 * @param {object} props
 * @param {React.ReactNode} props.children
 * @param {'up'|'down'|'left'|'right'|'none'} [props.direction='up']
 * @param {'fade'|'blur'|'scale'} [props.variant='fade'] - reveal flavor
 * @param {number} [props.delay=0] - seconds to delay (for manual staggering)
 * @param {number} [props.distance=24] - initial offset in px (directional only)
 * @param {string} [props.className]
 * @param {React.ElementType} [props.as='div']
 * @param {boolean} [props.once=true]
 */
export default function Reveal({
  children,
  direction = 'up',
  variant = 'fade',
  delay = 0,
  distance = 24,
  className,
  as = 'div',
  once = true,
  ...rest
}) {
  const reduce = useSafeReducedMotion()
  const MotionTag = motion[as] ?? motion.div

  const variants =
    variant === 'blur'
      ? reduce
        ? {
            hidden: { opacity: 0 },
            visible: { opacity: 1, transition: { duration: DURATION.slow } },
          }
        : blurUp
      : variant === 'scale'
        ? reduce
          ? {
              hidden: { opacity: 0 },
              visible: { opacity: 1, transition: { duration: DURATION.slow } },
            }
          : scaleIn
        : revealVariants(direction, distance, reduce)

  return (
    <MotionTag
      className={className}
      variants={variants}
      initial="hidden"
      whileInView="visible"
      viewport={{ ...REVEAL_VIEWPORT, once }}
      transition={{ duration: DURATION.cinematic, ease: EASE_OUT, delay }}
      {...rest}
    >
      {children}
    </MotionTag>
  )
}
