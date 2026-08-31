import { forwardRef } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '../../lib/cn'

/**
 * Three tiers, told apart by how loud the ground under the label is rather than
 * by three different shapes: a filled accent, a raised sheet, and a bare label.
 * All of them are the same rectangle at the control radius, so a row of mixed
 * tiers still reads as one row of buttons.
 */
const VARIANTS = {
  primary: 'btn-primary sheen-sweep',
  secondary: 'btn-secondary',
  quiet: 'btn-quiet',
}

const SIZES = {
  sm: 'h-9 min-h-0 px-3.5 text-[13px]',
  md: 'h-10 min-h-0 px-4 text-sm',
  lg: 'h-12 px-6 text-[15px]',
}

/**
 * Renders as a router link, a plain anchor, or a button, depending on which of
 * `to` and `href` it is given - so a call to action is the right element for
 * where it actually goes without the caller restating the styling.
 */
const MarketingButton = forwardRef(function MarketingButton(
  { as, to, href, variant = 'primary', size = 'md', className, children, ...props },
  ref
) {
  const classes = cn('btn press focus-ring', VARIANTS[variant], SIZES[size], className)

  if (to) {
    return (
      <Link ref={ref} to={to} className={classes} {...props}>
        {children}
      </Link>
    )
  }

  if (href) {
    return (
      <a ref={ref} href={href} className={classes} {...props}>
        {children}
      </a>
    )
  }

  const Tag = as ?? 'button'
  return (
    <Tag ref={ref} className={classes} {...props}>
      {children}
    </Tag>
  )
})

export default MarketingButton
