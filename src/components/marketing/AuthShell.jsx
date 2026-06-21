import { Link } from 'react-router-dom'
import { Signal } from 'lucide-react'
import { cn } from '../../lib/cn'
import { PRODUCT, COMPLIANCE } from '../../lib/brand'
import BrandMark from './BrandMark'
import Eyebrow from './Eyebrow'
import FxTicker from './FxTicker'

/**
 * Shared two-panel auth layout. The LEFT panel hosts the form; the RIGHT panel
 * (lg+ only) is a cinematic brand aside with grid, accent glow, value prop, a
 * faux live-signal stat, and the live ticker.
 *
 * Renders OUTSIDE the marketing layout, so it wraps itself in the design-system
 * dark-theme root to inherit token CSS variables.
 *
 * @param {object} props
 * @param {React.ReactNode} props.eyebrow - small caption above the heading
 * @param {string} props.title - form heading
 * @param {string} props.subtitle - supporting copy under the heading
 * @param {React.ReactNode} props.children - the form
 */
export default function AuthShell({ eyebrow, title, subtitle, children }) {
  return (
    <div
      className="ds-root grid min-h-screen grid-cols-1 bg-bg lg:grid-cols-2"
      data-theme="dark"
    >
      {/* LEFT — form panel */}
      <div className="relative flex flex-col px-6 py-8 sm:px-10">
        <header className="flex items-center justify-between">
          <Link to="/" aria-label={`${PRODUCT.name} home`}>
            <BrandMark />
          </Link>
          <Link
            to="/"
            className="text-sm font-medium text-text-muted transition-colors hover:text-text"
          >
            Back to site
          </Link>
        </header>

        <div className="flex flex-1 items-center justify-center py-12">
          <div className="w-full max-w-md">
            {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
            <h1 className="mt-5 text-3xl font-semibold tracking-tight text-text sm:text-4xl">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-3 text-pretty text-sm leading-relaxed text-text-muted">
                {subtitle}
              </p>
            )}

            <div className="mt-8">{children}</div>
          </div>
        </div>

        <p className="text-center font-mono text-[11px] uppercase tracking-[0.16em] text-text-faint">
          {COMPLIANCE.short}
        </p>
      </div>

      {/* RIGHT — cinematic brand aside */}
      <aside className="relative hidden overflow-hidden border-l border-border bg-bg-elevated/40 lg:block">
        <div
          className="pointer-events-none absolute inset-0 bg-grid bg-grid-fade opacity-50"
          aria-hidden="true"
        />
        <div
          className="accent-glow pointer-events-none absolute -right-32 -top-32 h-[560px] w-[560px]"
          aria-hidden="true"
        />

        <div className="relative flex h-full flex-col justify-between p-12">
          <BrandMark size="lg" />

          <div className="max-w-md">
            <h2 className="text-balance text-4xl font-semibold leading-[1.05] tracking-tight text-text">
              Trade on <span className="text-gradient-accent">signal</span>,
              <br />
              not on instinct.
            </h2>
            <p className="mt-6 text-pretty text-base leading-relaxed text-text-muted">
              {PRODUCT.valueProp}
            </p>

            {/* Faux live-signal stat */}
            <div className="mt-10 flex items-center justify-between rounded-xl border border-[var(--ds-accent-soft)] bg-[var(--ds-accent-softer)] p-4">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--ds-accent-soft)]">
                  <Signal className="h-4 w-4 text-accent-bright" aria-hidden="true" />
                </span>
                <div className="leading-tight">
                  <p className="font-mono text-sm font-semibold text-text">Live signal feed</p>
                  <p className="text-xs text-text-faint">24/7 market coverage</p>
                </div>
              </div>
              <span className="flex items-center gap-1.5 rounded-full border border-border bg-surface-2 px-2.5 py-1 font-mono text-[11px] text-positive">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-positive opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-positive" />
                </span>
                LIVE
              </span>
            </div>
          </div>

          <div className="-mx-12 -mb-12">
            <FxTicker className={cn('border-x-0 border-b-0')} />
          </div>
        </div>
      </aside>
    </div>
  )
}
