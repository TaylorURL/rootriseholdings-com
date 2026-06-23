import { forwardRef } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '../../lib/cn'

/* Hover effects gated on hover-capable pointers so touch devices don't get a
   stuck hover state after tap. Only animate transform + opacity + paint props. */
const VARIANT_CLASSES = {
  primary:
    'sheen-sweep bg-[var(--ds-accent-face)] text-on-accent shadow-[0_8px_30px_-8px_var(--ds-accent-glow)] [@media(hover:hover)]:hover:bg-[var(--ds-accent-face-hover)] [@media(hover:hover)]:hover:shadow-[0_12px_44px_-8px_var(--ds-glow-strong)] [@media(hover:hover)]:hover:-translate-y-[1px]',
  secondary:
    'border border-border-strong bg-surface/40 text-text backdrop-blur [@media(hover:hover)]:hover:border-border-hover [@media(hover:hover)]:hover:bg-surface-2 [@media(hover:hover)]:hover:-translate-y-[1px]',
  ghost: 'text-text-muted [@media(hover:hover)]:hover:text-text',
}

const SIZE_CLASSES = {
  sm: 'h-9 px-4 text-sm',
  md: 'h-11 px-5 text-sm',
  lg: 'h-12 px-7 text-base',
}

/**
 * Marketing-grade call-to-action. Renders a router <Link> when `to` is set, an
 * <a> when `href` is set, otherwise a <button>. Press feedback via active scale.
 *
 * @param {object} props
 * @param {'primary'|'secondary'|'ghost'} [props.variant='primary']
 * @param {'sm'|'md'|'lg'} [props.size='md']
 * @param {string} [props.to] - router path
 * @param {string} [props.href] - external href
 * @param {string} [props.className]
 */
const MarketingButton = forwardRef(function MarketingButton(
  { variant = 'primary', size = 'md', to, href, className, children, ...rest },
  ref,
) {
  const classes = cn(
    'group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-full font-medium tracking-tight',
    // Explicit prop list — never `transition: all`. Token easing so the curve
    // matches the rest of the motion system instead of the browser default.
    'transition-[background-color,border-color,color,transform,box-shadow] duration-200 [transition-timing-function:var(--ds-ease-out)] will-change-transform',
    // Press feedback + tokenized focus ring legible against either band tone.
    'active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-bright focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
    VARIANT_CLASSES[variant],
    SIZE_CLASSES[size],
    className,
  )

  if (to) {
    return (
      <Link ref={ref} to={to} className={classes} {...rest}>
        {children}
      </Link>
    )
  }
  if (href) {
    return (
      <a ref={ref} href={href} className={classes} {...rest}>
        {children}
      </a>
    )
  }
  return (
    <button ref={ref} className={classes} {...rest}>
      {children}
    </button>
  )
})

export default MarketingButton
