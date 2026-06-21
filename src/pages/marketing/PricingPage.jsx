import { useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import { cn } from '../../lib/cn'
import { PRODUCT, COMPLIANCE } from '../../lib/brand'
import { FAQS } from '../../lib/content'
import { Section, Container, SectionHeading } from '../../components/marketing/Section'
import Eyebrow from '../../components/marketing/Eyebrow'
import Reveal from '../../components/marketing/Reveal'
import Accordion from '../../components/marketing/Accordion'
import ClosingCta from '../../components/marketing/ClosingCta'
import PricingTierCard from '../../components/marketing/PricingTierCard'
import PricingComparison from '../../components/marketing/PricingComparison'
import TextReveal from '../../components/motion/TextReveal'

const BILLING_OPTIONS = [
  { id: 'monthly', label: 'Monthly' },
  { id: 'annual', label: 'Annual' },
]

/** Single-plan pricing page with billing toggle, compliance block and FAQ. */
export default function PricingPage() {
  const [billing, setBilling] = useState('monthly')

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden pt-32 sm:pt-40">
        <div className="pointer-events-none absolute inset-0 bg-grid bg-grid-fade opacity-60" aria-hidden="true" />
        <div className="bg-mesh pointer-events-none absolute inset-0 opacity-70" aria-hidden="true" />
        <div
          className="accent-glow-strong pointer-events-none absolute -top-40 left-1/2 h-[600px] w-[600px] -translate-x-1/2"
          aria-hidden="true"
        />
        <Container className="relative pb-16 text-center sm:pb-20">
          <Reveal className="mx-auto max-w-3xl">
            <Eyebrow className="justify-center">Pricing</Eyebrow>
            <h1 className="mt-6 text-balance text-5xl font-semibold leading-[1.04] tracking-tight text-text sm:text-6xl lg:text-7xl">
              One plan. <TextReveal text="The whole terminal." className="text-accent-bright" />
            </h1>
            <p className="mx-auto mt-7 max-w-xl text-pretty text-lg leading-relaxed text-text-muted">
              No tiers, no seats, no feature gates. Full access to every signal, chart and alert for
              one flat price — cancel whenever you like.
            </p>
          </Reveal>

          {/* Billing toggle */}
          <Reveal delay={0.1} className="mt-10 flex justify-center">
            <div
              role="radiogroup"
              aria-label="Billing period"
              className="inline-flex items-center gap-1 rounded-full border border-border bg-surface/60 p-1 backdrop-blur"
            >
              {BILLING_OPTIONS.map((option) => {
                const active = billing === option.id
                return (
                  <button
                    key={option.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setBilling(option.id)}
                    className={cn(
                      'relative rounded-full px-5 py-2 font-mono text-xs uppercase tracking-[0.14em] transition-colors',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-bright focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
                      active
                        ? 'bg-[var(--ds-accent-face)] text-on-accent'
                        : 'text-text-muted hover:text-text',
                    )}
                  >
                    {option.label}
                    {option.id === 'annual' && (
                      <span
                        className={cn(
                          'ml-2 rounded-full px-1.5 py-0.5 text-[10px]',
                          active ? 'bg-black/20 text-on-accent' : 'bg-[var(--ds-accent-softer)] text-accent-bright',
                        )}
                      >
                        2 mo free
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </Reveal>
        </Container>
      </section>

      {/* Plan card */}
      <Section className="pt-4 sm:pt-6">
        <Container>
          <Reveal>
            <PricingTierCard billing={billing} />
          </Reveal>
          <Reveal delay={0.1} className="mx-auto mt-6 max-w-lg text-center">
            <p className="font-mono text-xs uppercase tracking-[0.16em] text-text-faint">
              {billing === 'annual'
                ? `$${PRODUCT.annualPrice} billed yearly · equivalent to $${(PRODUCT.annualPrice / 12).toFixed(0)}/mo`
                : `$${PRODUCT.monthlyPrice} billed monthly · switch to annual any time`}
            </p>
          </Reveal>
        </Container>
      </Section>

      {/* Compliance disclaimer block */}
      <Section className="border-t border-border">
        <Container>
          <Reveal className="mx-auto max-w-3xl">
            <div className="relative overflow-hidden rounded-2xl border border-border bg-surface/40 p-8 sm:p-10">
              <div className="flex items-start gap-4">
                <span
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border bg-surface-2 text-accent-bright"
                  aria-hidden="true"
                >
                  <ShieldCheck className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="text-xl font-semibold tracking-tight text-text">
                    {COMPLIANCE.short}
                  </h2>
                  <p className="mt-4 text-pretty leading-relaxed text-text-muted">
                    {COMPLIANCE.long}
                  </p>
                  <p className="mt-4 font-mono text-xs uppercase tracking-[0.14em] text-text-faint">
                    {COMPLIANCE.roadmap}
                  </p>
                </div>
              </div>
            </div>
          </Reveal>
        </Container>
      </Section>

      {/* FAQ */}
      <Section className="border-t border-border">
        <Container>
          <SectionHeading
            eyebrow="FAQ"
            title="Questions, answered plainly."
            description="The honest version — what you get, what we won't do, and how billing works."
          />
          <Reveal delay={0.1} className="mt-14 max-w-3xl">
            <Accordion items={FAQS} />
          </Reveal>
        </Container>
      </Section>

      <ClosingCta />
    </>
  )
}
