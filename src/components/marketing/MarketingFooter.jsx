import { Link } from 'react-router-dom'
import BrandMark from './BrandMark'
import { COMPLIANCE, FOOTER_LINKS, FOOTER_STATEMENT, LEGAL_LINKS, PRODUCT } from '../../lib/brand'
import Reveal from '../motion/Reveal'

const LINK_CLASS =
  'focus-ring rounded-sm text-[13px] text-text-muted transition-colors duration-200 ease-out [@media(hover:hover)]:hover:text-text'

/**
 * The footer is the last slab in the stack rather than a separate piece of
 * chrome: same dark ground, same blueprint grid, same accent hairline opening
 * it. One sentence carries it at display size, and everything a reader might
 * actually click sits small underneath.
 */
export default function MarketingFooter({ children }) {
  const year = new Date().getFullYear()

  return (
    <footer
      data-ground="dark"
      className="relative overflow-hidden border-t border-border bg-bg text-text"
    >
      <div className="grid-blueprint absolute inset-0 opacity-60" aria-hidden="true" />
      <div className="rule-accent absolute inset-x-0 top-0 h-px" aria-hidden="true" />

      <div className="container-rail relative pb-10 pt-20 sm:pt-28">
        <Reveal>
          <p className="t-display max-w-[16ch] text-text">{FOOTER_STATEMENT}</p>
        </Reveal>

        <div className="mt-14 flex flex-col gap-8 border-t border-border pt-8 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-sm">
            <BrandMark />
            <p className="mt-4 text-[13px] leading-relaxed text-text-muted">{COMPLIANCE.long}</p>
          </div>

          <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-3">
            {FOOTER_LINKS.map((link) => (
              <Link key={link.label} to={link.to} className={LINK_CLASS}>
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="mt-8 flex flex-col gap-4 border-t border-border pt-6 text-[13px] text-text-faint sm:flex-row sm:items-center sm:justify-between">
          <p>
            {'©'} {year} {PRODUCT.name}
          </p>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            {LEGAL_LINKS.map((link) => (
              <Link key={link.label} to={link.to} className={LINK_CLASS}>
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {children}
    </footer>
  )
}
