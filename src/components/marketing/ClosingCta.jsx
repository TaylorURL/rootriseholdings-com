import { ArrowRight } from 'lucide-react'
import { Container } from './Section'
import Reveal from './Reveal'
import MarketingButton from './MarketingButton'
import { PRODUCT, COMPLIANCE } from '../../lib/brand'

/**
 * The recurring big closing call-to-action with a purple key light. Shared by
 * the home page and the detail pages so the conversion moment stays consistent.
 *
 * @param {object} props
 * @param {string} [props.title]
 * @param {string} [props.subtitle]
 */
export default function ClosingCta({
  title = 'Stop guessing. Start trading on signal.',
  subtitle = `Full access to the signal terminal for $${PRODUCT.monthlyPrice}/month. Cancel anytime.`,
}) {
  return (
    <section className="relative overflow-hidden border-t border-border py-28 sm:py-36">
      <div className="pointer-events-none absolute inset-0 bg-grid bg-grid-fade opacity-50" aria-hidden="true" />
      <div
        className="accent-glow pointer-events-none absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2"
        aria-hidden="true"
      />
      <Container className="relative text-center">
        <Reveal>
          <h2 className="mx-auto max-w-3xl text-balance text-4xl font-semibold leading-tight tracking-tight text-text sm:text-5xl lg:text-6xl">
            {title}
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-pretty text-lg text-text-muted">{subtitle}</p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <MarketingButton to="/signup" size="lg">
              Get Access
              <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            </MarketingButton>
            <MarketingButton to="/pricing" variant="secondary" size="lg">
              View pricing
            </MarketingButton>
          </div>
          <p className="mx-auto mt-8 max-w-md font-mono text-xs uppercase tracking-[0.16em] text-text-faint">
            {COMPLIANCE.short}
          </p>
        </Reveal>
      </Container>
    </section>
  )
}
