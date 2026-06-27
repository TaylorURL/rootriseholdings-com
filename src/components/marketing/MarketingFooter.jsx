import { Link } from 'react-router-dom'
import { PRODUCT, COMPLIANCE, FOOTER_LINKS } from '../../lib/brand'
import BrandMark from './BrandMark'
import BuiltByBadge from './BuiltByBadge'

const CURRENT_YEAR = new Date().getFullYear()

/**
 * Public marketing footer with link columns and the compliance disclaimer. Pinned
 * to the dark tone so it closes every page as a deliberate brand anchor and gives
 * the adaptive navbar a stable resting tone at the bottom of the scroll.
 */
export default function MarketingFooter() {
  return (
    <footer data-theme="dark" className="band-seam relative border-t border-border bg-bg text-text">
      <div className="mx-auto max-w-7xl px-6 py-16 lg:px-10">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1.5fr_1fr_1fr]">
          <div className="max-w-sm">
            <BrandMark size="lg" />
            <p className="mt-5 text-sm leading-relaxed text-text-muted">{PRODUCT.tagline}</p>
            <p className="mt-4 font-mono text-xs uppercase tracking-[0.2em] text-text-faint">
              Decision-support · Not a fund
            </p>
          </div>

          {FOOTER_LINKS.map((group) => (
            <div key={group.heading}>
              <h4 className="font-mono text-xs font-medium uppercase tracking-[0.2em] text-text-faint">
                {group.heading}
              </h4>
              <ul className="mt-5 space-y-3">
                {group.links.map((link, index) => (
                  <li key={`${link.to}-${index}`}>
                    <Link
                      to={link.to}
                      className="rounded-sm text-sm text-text-muted transition-colors duration-200 [transition-timing-function:var(--ds-ease-out)] [@media(hover:hover)]:hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-bright focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 border-t border-border pt-8">
          <p className="max-w-3xl text-xs leading-relaxed text-text-faint">{COMPLIANCE.long}</p>
          <div className="mt-6 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
            <p className="font-mono text-xs text-text-faint">
              © {CURRENT_YEAR} {PRODUCT.name}. All rights reserved.
            </p>
            <p className="font-mono text-xs text-text-faint">Built for traders, not for autopilot.</p>
          </div>
        </div>

        <BuiltByBadge />
      </div>
    </footer>
  )
}
