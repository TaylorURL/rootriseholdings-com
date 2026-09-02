import { forwardRef } from 'react'
import { cn } from '../../lib/cn'

/**
 * The one loading placeholder primitive. Every deferred surface builds its
 * pending state from these rather than inventing a shape, so a placeholder and
 * the content that replaces it stay the same size, radius, and position.
 *
 * Placeholders are decorative: each is aria-hidden and the container that owns
 * them carries the status role, so a screen reader hears "loading" once instead
 * of reading a wall of empty boxes. The shimmer animates opacity only and is
 * dropped under prefers-reduced-motion by the global guard in index.css.
 */

/**
 * @param {object} props
 * @param {string} [props.className] - sizing/radius utilities matching the real content
 * @param {object} [props.style] - for a box whose size is a runtime number rather than a utility
 */
export function Skeleton({ className, style }) {
  return (
    <span
      aria-hidden="true"
      style={style}
      className={cn('skeleton block bg-surface-2', className)}
    />
  )
}

/**
 * A run of text lines. The last line is short, the way a real paragraph ends.
 *
 * @param {object} props
 * @param {number} [props.lines=3]
 * @param {string} [props.className]
 */
export function SkeletonText({ lines = 3, className }) {
  return (
    <span className={cn('block space-y-2', className)}>
      {Array.from({ length: lines }, (_, index) => (
        <Skeleton
          key={index}
          className={cn('h-3.5 rounded-sm', index === lines - 1 ? 'w-2/5' : 'w-full')}
        />
      ))}
    </span>
  )
}

/**
 * Wraps a pending region so assistive tech is told the state once.
 *
 * The element is forwarded because a placeholder is the only thing standing in
 * the content's place, so a caller that has to watch where the content will go -
 * whether it is near enough the viewport to be worth fetching, say - has nothing
 * else to observe.
 *
 * @param {object} props
 * @param {string} props.label - what is loading, e.g. "Loading the briefing"
 * @param {React.ReactNode} props.children
 * @param {string} [props.className]
 */
export const SkeletonRegion = forwardRef(function SkeletonRegion(
  { label, children, className, ...rest },
  ref
) {
  return (
    <div
      ref={ref}
      role="status"
      aria-busy="true"
      aria-label={label}
      className={className}
      {...rest}
    >
      {children}
    </div>
  )
})
