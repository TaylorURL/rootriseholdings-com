import { cn } from '../../lib/cn'

/**
 * Seamless, edge-faded marquee. Duplicates its children so the CSS scroll never
 * shows a seam; reduced-motion users get a static, horizontally-scrollable strip
 * (handled by the global `.ticker-track` reduced-motion guard).
 *
 * @param {object} props
 * @param {React.ReactNode} props.children - one copy of the track content
 * @param {'left'|'right'} [props.direction='left']
 * @param {number} [props.speed=48] - seconds for one full loop
 * @param {boolean} [props.fade=true] - apply edge mask
 * @param {string} [props.className]
 */
export default function Marquee({ children, direction = 'left', speed = 48, fade = true, className }) {
  return (
    <div
      className={cn(
        'relative flex overflow-hidden',
        fade && '[mask-image:linear-gradient(to_right,transparent,#000_8%,#000_92%,transparent)]',
        className,
      )}
    >
      <div
        className="ticker-track flex w-max"
        style={{ animationDuration: `${speed}s`, animationDirection: direction === 'right' ? 'reverse' : 'normal' }}
      >
        {[0, 1].map((copy) => (
          <div key={copy} className="flex shrink-0" aria-hidden={copy === 1}>
            {children}
          </div>
        ))}
      </div>
    </div>
  )
}
