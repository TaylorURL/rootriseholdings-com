import { forwardRef } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '../../lib/cn'

const VARIANT_CLASSES = {
  primary:
    'bg-[var(--ds-accent-face)] text-on-accent shadow-[0_8px_30px_-8px_var(--ds-accent-glow)] hover:bg-[var(--ds-accent-face-hover)]',
  secondary:
    'border border-border-strong bg-surface/40 text-text backdrop-blur hover:border-border-hover hover:bg-surface-2',
  ghost: 'text-text-muted hover:text-text',
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
    'group inline-flex items-center justify-center gap-2 rounded-full font-medium tracking-tight',
    'transition-[background-color,border-color,color,transform] duration-200 ease-out',
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
