import { ArrowRight, Check } from 'lucide-react'
import { cn } from '../../lib/cn'
import { PRODUCT } from '../../lib/brand'
import { PRICING_FEATURES } from '../../lib/content'
import MarketingButton from './MarketingButton'

/**
 * The single premium pricing plan card. Accent top-border, soft purple glow,
 * mono price, and the full feature list with check icons.
 *
 * @param {object} props
 * @param {'monthly'|'annual'} props.billing
 * @param {string} [props.className]
 */
export default function PricingTierCard({ billing, className }) {
  const annual = billing === 'annual'
  const displayPrice = annual ? PRODUCT.annualPrice : PRODUCT.monthlyPrice
  const period = annual ? '/year' : '/month'

  return (
    <div className={cn('relative mx-auto w-full max-w-lg', className)}>
      <div
        className="accent-glow pointer-events-none absolute -inset-x-12 -top-16 h-64 opacity-70"
        aria-hidden="true"
      />
      <div className="relative overflow-hidden rounded-2xl border border-border-strong bg-surface/60 backdrop-blur-xl">
        {/* Accent top-border */}
        <div
          className="h-1 w-full bg-[var(--ds-accent-face)] shadow-[0_0_24px_var(--ds-accent-glow)]"
          aria-hidden="true"
        />
        <div className="p-8 sm:p-10">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs uppercase tracking-[0.2em] text-text-muted">
              The Terminal
            </span>
            <span className="rounded-full border border-[var(--ds-accent-soft)] bg-[var(--ds-accent-softer)] px-3 py-1 font-mono text-[11px] uppercase tracking-[0.16em] text-accent-bright">
              All-in
            </span>
          </div>

          <div className="mt-8 flex items-baseline gap-2">
            <span className="font-mono text-6xl font-semibold tracking-tight text-text tabular-nums">
              ${displayPrice}
            </span>
            <span className="font-mono text-sm text-text-muted">{period}</span>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-text-muted">
            {annual
              ? 'Billed annually — two months free versus monthly.'
              : 'Everything in the signal terminal. One plan, no tiers, no upsells.'}
          </p>

          <MarketingButton to="/signup" size="lg" className="mt-8 w-full">
            Get Access
            <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
          </MarketingButton>

          <ul className="mt-10 space-y-4">
            {PRICING_FEATURES.map((feature) => (
              <li key={feature} className="flex items-start gap-3">
                <span
                  className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--ds-accent-soft)] text-accent-bright"
                  aria-hidden="true"
                >
                  <Check className="h-3 w-3" strokeWidth={3} />
                </span>
                <span className="text-sm leading-relaxed text-text-muted">{feature}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
