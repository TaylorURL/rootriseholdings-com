import { useRef } from 'react'
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from 'framer-motion'
import { SPRING_CURSOR } from '../../../lib/marketingMotion'

/** Constellation of signal nodes; each drifts toward the cursor by its depth. */
const NODES = [
  { x: 12, y: 24, depth: 30, size: 4 },
  { x: 26, y: 64, depth: 18, size: 3 },
  { x: 38, y: 18, depth: 44, size: 5 },
  { x: 52, y: 48, depth: 12, size: 3 },
  { x: 64, y: 78, depth: 36, size: 4 },
  { x: 72, y: 30, depth: 24, size: 3 },
  { x: 84, y: 58, depth: 48, size: 6 },
  { x: 92, y: 20, depth: 20, size: 3 },
  { x: 18, y: 86, depth: 40, size: 4 },
  { x: 46, y: 88, depth: 16, size: 3 },
]

/** Connections drawn between selected nodes to suggest a signal graph. */
const EDGES = [
  [0, 2],
  [2, 3],
  [3, 5],
  [5, 6],
  [1, 3],
  [3, 4],
  [4, 9],
  [6, 7],
]

/** One depth-parallaxed node bound to the shared cursor offset motion values. */
function FieldNode({ node, offsetX, offsetY }) {
  const x = useTransform(offsetX, (value) => value * node.depth)
  const y = useTransform(offsetY, (value) => value * node.depth)
  return (
    <motion.span
      style={{ left: `${node.x}%`, top: `${node.y}%`, x, y, width: node.size, height: node.size }}
      className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent-bright shadow-[0_0_10px_var(--ds-accent-glow)]"
      aria-hidden="true"
    />
  )
}

/**
 * Cursor-reactive hero backdrop — Home's signature interactive section. A graph
 * of signal nodes parallaxes toward the pointer while a spotlight tracks it,
 * suggesting the engine "watching" the market. Pure transform/opacity motion;
 * reduced-motion renders a still constellation.
 */
export default function HeroSignalField() {
  const ref = useRef(null)
  const reduce = useReducedMotion()
  const rawX = useMotionValue(0)
  const rawY = useMotionValue(0)
  const offsetX = useSpring(rawX, SPRING_CURSOR)
  const offsetY = useSpring(rawY, SPRING_CURSOR)

  const handleMove = (event) => {
    if (reduce) return
    const node = ref.current
    if (!node || event.pointerType === 'touch') return
    const rect = node.getBoundingClientRect()
    rawX.set((event.clientX - rect.left) / rect.width - 0.5)
    rawY.set((event.clientY - rect.top) / rect.height - 0.5)
    node.style.setProperty('--mx', `${((event.clientX - rect.left) / rect.width) * 100}%`)
    node.style.setProperty('--my', `${((event.clientY - rect.top) / rect.height) * 100}%`)
  }

  const handleLeave = () => {
    rawX.set(0)
    rawY.set(0)
  }

  return (
    <div
      ref={ref}
      onPointerMove={handleMove}
      onPointerLeave={handleLeave}
      className="pointer-events-auto absolute inset-0 overflow-hidden"
      aria-hidden="true"
    >
      <span className="spotlight absolute inset-0 opacity-70" />
      <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none" viewBox="0 0 100 100">
        {EDGES.map(([a, b]) => (
          <line
            key={`${a}-${b}`}
            x1={NODES[a].x}
            y1={NODES[a].y}
            x2={NODES[b].x}
            y2={NODES[b].y}
            stroke="var(--ds-accent-soft)"
            strokeWidth={0.2}
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>
      {NODES.map((node, index) => (
        <FieldNode key={index} node={node} offsetX={offsetX} offsetY={offsetY} />
      ))}
    </div>
  )
}
