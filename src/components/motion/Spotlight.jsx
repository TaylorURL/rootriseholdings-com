import { useCallback, useRef } from 'react'
import { cn } from '../../lib/cn'

/**
 * Hook: track the pointer over an element and expose its position as the
 * `--mx`/`--my` CSS custom properties (percent), for cursor-reactive surfaces.
 * Updates the variables imperatively (no React re-render, no layout thrash) and
 * is a no-op for coarse pointers.
 *
 * @returns {{ ref: React.RefObject, onPointerMove: Function, onPointerLeave: Function }}
 */
export function usePointerGlow() {
  const ref = useRef(null)

  const onPointerMove = useCallback((event) => {
    const node = ref.current
    if (!node || event.pointerType === 'touch') return
    const rect = node.getBoundingClientRect()
    node.style.setProperty('--mx', `${((event.clientX - rect.left) / rect.width) * 100}%`)
    node.style.setProperty('--my', `${((event.clientY - rect.top) / rect.height) * 100}%`)
  }, [])

  const onPointerLeave = useCallback(() => {
    const node = ref.current
    if (!node) return
    node.style.setProperty('--mx', '50%')
    node.style.setProperty('--my', '50%')
  }, [])

  return { ref, onPointerMove, onPointerLeave }
}

/**
 * A surface with a cursor-following purple spotlight. The glow layer sits behind
 * the content and is masked to the card bounds. Pure paint on a single element,
 * so it stays cheap; the static gradient is a fine reduced-motion fallback.
 *
 * @param {object} props
 * @param {React.ReactNode} props.children
 * @param {string} [props.className]
 * @param {string} [props.as='div']
 */
export function SpotlightCard({ children, className, as: Tag = 'div', ...rest }) {
  const { ref, onPointerMove, onPointerLeave } = usePointerGlow()
  return (
    <Tag
      ref={ref}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      className={cn('group relative overflow-hidden', className)}
      {...rest}
    >
      <span
        className="spotlight pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 ease-out [@media(hover:hover)]:group-hover:opacity-100"
        aria-hidden="true"
      />
      {children}
    </Tag>
  )
}
