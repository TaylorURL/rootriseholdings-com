import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import SplitRail from '@taylorurl/split-rail'
import BrandMark from './BrandMark'
import Eyebrow from './Eyebrow'
import Plate from './Plate'
import FxTicker from './FxTicker'
import { COMPLIANCE, PRODUCT } from '../../lib/brand'
import { useTheme } from '../../context/ThemeContext'

/**
 * The sign-in shell. It sits outside the marketing layout, so it carries its
 * own root and its own copy of the status bar. The right half is the navy slab
 * the rest of the site is cut with, holding the plate and the live watch list,
 * and it stands down below the large breakpoint rather than stacking.
 */
export default function AuthShell({ eyebrow, title, subtitle, children }) {
  const { shellTheme } = useTheme()

  return (
    <div
      className="ds-root grid min-h-dvh grid-cols-1 bg-bg lg:grid-cols-2"
      data-theme={shellTheme}
    >
      <div className="flex flex-col px-6 py-8 sm:px-10 lg:px-16">
        <div className="flex items-center justify-between">
          <Link to="/" className="focus-ring press rounded-sm" aria-label={`${PRODUCT.name} home`}>
            <BrandMark />
          </Link>
          <Link
            to="/"
            className="focus-ring inline-flex items-center gap-1.5 rounded-sm text-[13px] text-text-muted transition-colors duration-200 ease-out [@media(hover:hover)]:hover:text-text"
          >
            <ArrowLeft aria-hidden="true" className="h-3.5 w-3.5" />
            Back to Site
          </Link>
        </div>

        <div className="flex flex-1 items-center py-14">
          <div className="mx-auto w-full max-w-md">
            {eyebrow ? <Eyebrow accent>{eyebrow}</Eyebrow> : null}
            <h1 className="t-h2 mt-4 text-text">{title}</h1>
            {subtitle ? <p className="t-body mt-3 text-text-muted">{subtitle}</p> : null}
            <div className="mt-9">{children}</div>
          </div>
        </div>

        <p className="t-meta text-text-faint">{COMPLIANCE.short}</p>
        <SplitRail />
      </div>

      <aside
        data-ground="dark"
        className="relative hidden overflow-hidden bg-bg text-text lg:flex lg:flex-col"
      >
        <div className="grid-blueprint absolute inset-0 opacity-60" aria-hidden="true" />
        <div
          className="accent-glow absolute -top-32 left-1/2 h-[30rem] w-[40rem] -translate-x-1/2 opacity-70"
          aria-hidden="true"
        />

        <div className="relative flex flex-1 flex-col justify-center px-14">
          <p className="t-h2 max-w-[16ch] text-text">Trade on structure, not on instinct.</p>
          <p className="t-body mt-5 max-w-[46ch] text-text-muted">{PRODUCT.valueProp}</p>
          <Plate name="structure" loading="eager" className="mt-10 max-w-lg" />
        </div>

        <FxTicker className="relative border-x-0 border-b-0" />
      </aside>
    </div>
  )
}
