import { cn } from '../../lib/cn'

/**
 * The line over a heading: the body face, small and quiet, in the Title Case the
 * copy is written in. Used sparingly: a label above every section turns into a
 * second, quieter set of headings.
 */
export default function Eyebrow({ children, accent = false, className }) {
  return <span className={cn('eyebrow', accent && 'eyebrow-accent', className)}>{children}</span>
}
