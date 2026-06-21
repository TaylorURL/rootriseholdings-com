import { motion, useReducedMotion } from 'framer-motion'
import { DURATION, EASE_OUT, REVEAL_VIEWPORT, staggerParentWith } from '../../lib/marketingMotion'

/**
 * Scroll-triggered stagger container. Children wrapped in {@link StaggerItem}
 * cascade into view. Replaces hand-rolled `delay={index * n}` chains.
 *
 * @param {object} props
 * @param {React.ReactNode} props.children
 * @param {number} [props.stagger=0.08] - seconds between children
 * @param {number} [props.delay=0.05] - delay before the first child
 * @param {React.ElementType} [props.as='div']
 * @param {string} [props.className]
 * @param {boolean} [props.once=true]
 */
export function StaggerGroup({ children, stagger = 0.08, delay = 0.05, as = 'div', className, once = true, ...rest }) {
  const MotionTag = motion[as] ?? motion.div
  return (
    <MotionTag
      className={className}
      variants={staggerParentWith(stagger, delay)}
      initial="hidden"
      whileInView="visible"
      viewport={{ ...REVEAL_VIEWPORT, once }}
      {...rest}
    >
      {children}
    </MotionTag>
  )
}

/**
 * A single staggered child. Must sit inside a {@link StaggerGroup}.
 *
 * @param {object} props
 * @param {React.ReactNode} props.children
 * @param {'up'|'down'|'left'|'right'} [props.direction='up']
 * @param {number} [props.distance=22]
 * @param {React.ElementType} [props.as='div']
 * @param {string} [props.className]
 */
export function StaggerItem({ children, direction = 'up', distance = 22, as = 'div', className, ...rest }) {
  const reduce = useReducedMotion()
  const MotionTag = motion[as] ?? motion.div
  const axis = direction === 'left' || direction === 'right' ? 'x' : 'y'
  const sign = direction === 'down' || direction === 'right' ? 1 : -1
  const from = reduce ? 0 : sign * -distance

  return (
    <MotionTag
      className={className}
      variants={{
        hidden: { opacity: 0, [axis]: from },
        visible: { opacity: 1, [axis]: 0, transition: { duration: DURATION.slow, ease: EASE_OUT } },
      }}
      {...rest}
    >
      {children}
    </MotionTag>
  )
}
