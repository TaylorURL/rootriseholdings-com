import { cn } from '../../lib/cn'

/**
 * The site's one micro-label. Mono, uppercase and tracked wide, because caps
 * set small at normal spacing close into a block. Used sparingly: a label above
 * every section turns into a second, quieter set of headings.
 */
export default function Eyebrow({ children, accent = false, className }) {
  return <span className={cn('eyebrow', accent && 'eyebrow-accent', className)}>{children}</span>
}
