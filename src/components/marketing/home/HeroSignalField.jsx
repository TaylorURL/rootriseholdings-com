import { motion, useTransform } from 'framer-motion'

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
 * The pointer motion values are owned by the hero section, not this component,
 * so movement over the copy and panel still drives the parallax.
 *
 * @param {object} props
 * @param {import('framer-motion').MotionValue<number>} props.offsetX
 * @param {import('framer-motion').MotionValue<number>} props.offsetY
 */
export default function HeroSignalField({ offsetX, offsetY }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
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
