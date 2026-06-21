import { useRef } from 'react'
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from 'framer-motion'
import { cn } from '../../lib/cn'

/**
 * Cursor-reactive 3D-tilt surface. The card rotates toward the pointer and a
 * spotlight follows it, giving a tactile, reactive feel. Transform/opacity only;
 * reduced-motion and coarse pointers fall back to a flat, static card.
 *
 * @param {object} props
 * @param {React.ReactNode} props.children
 * @param {number} [props.max=8] - max tilt in degrees
 * @param {string} [props.className]
 */
export default function TiltCard({ children, max = 8, className, ...rest }) {
  const ref = useRef(null)
  const reduce = useReducedMotion()
  const px = useMotionValue(0.5)
  const py = useMotionValue(0.5)
  const rotateX = useSpring(useTransform(py, [0, 1], [max, -max]), { stiffness: 200, damping: 20 })
  const rotateY = useSpring(useTransform(px, [0, 1], [-max, max]), { stiffness: 200, damping: 20 })

  const handleMove = (event) => {
    const node = ref.current
    if (reduce || !node || event.pointerType === 'touch') return
    const rect = node.getBoundingClientRect()
    const x = (event.clientX - rect.left) / rect.width
    const y = (event.clientY - rect.top) / rect.height
    px.set(x)
    py.set(y)
    node.style.setProperty('--mx', `${x * 100}%`)
    node.style.setProperty('--my', `${y * 100}%`)
  }

  const handleLeave = () => {
    px.set(0.5)
    py.set(0.5)
  }

  return (
    <motion.div
      ref={ref}
      onPointerMove={handleMove}
      onPointerLeave={handleLeave}
      style={reduce ? undefined : { rotateX, rotateY, transformPerspective: 900 }}
      className={cn('group relative overflow-hidden [transform-style:preserve-3d]', className)}
      {...rest}
    >
      <span
        className="spotlight pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 [@media(hover:hover)]:group-hover:opacity-100"
        aria-hidden="true"
      />
      {children}
    </motion.div>
  )
}
