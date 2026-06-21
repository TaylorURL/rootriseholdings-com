import { PLATFORM_FEATURES, TRUST_PILLARS } from '../../lib/content'
import { Section, Container, SectionHeading } from '../../components/marketing/Section'
import Eyebrow from '../../components/marketing/Eyebrow'
import Reveal from '../../components/marketing/Reveal'
import ClosingCta from '../../components/marketing/ClosingCta'
import LivePairChart from '../../components/ui/LivePairChart'
import FxTicker from '../../components/marketing/FxTicker'
import CapabilityMatrix from '../../components/marketing/CapabilityMatrix'
import TextReveal from '../../components/motion/TextReveal'
import { StaggerGroup, StaggerItem } from '../../components/motion/Stagger'
import { SpotlightCard } from '../../components/motion/Spotlight'

/** Comprehensive capability tour with alternating feature blocks. */
export default function FeaturesPage() {
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
        <Container className="relative pb-16 text-center">
          <Reveal className="mx-auto max-w-3xl">
            <Eyebrow className="justify-center">Features</Eyebrow>
            <h1 className="mt-6 text-balance text-5xl font-semibold leading-[1.04] tracking-tight text-text sm:text-6xl lg:text-7xl">
              Everything to read the market.
              <br />
              <TextReveal text="Nothing that trades it for you." className="text-accent-bright" />
            </h1>
            <p className="mx-auto mt-7 max-w-xl text-pretty text-lg leading-relaxed text-text-muted">
              A signal terminal built for traders who want evidence and context — not a black box and
              a promise. Here is the full capability set.
            </p>
          </Reveal>
        </Container>
        <FxTicker />
      </section>

      {/* Signature: cursor-reactive capability matrix */}
      <CapabilityMatrix />

      {/* Feature blocks — alternating large layout */}
      <Section className="border-t border-border">
        <Container>
          <div className="space-y-16 lg:space-y-24">
            {PLATFORM_FEATURES.map((feature, index) => {
              const reversed = index % 2 === 1
              const showChart = index === 1
              return (
                <Reveal key={feature.title} delay={0.05}>
                  <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-2 lg:gap-16">
                    <div className={reversed ? 'lg:order-2' : ''}>
                      <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-surface-2 text-accent-bright">
                        <feature.icon className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <p className="mt-6 font-mono text-xs uppercase tracking-[0.18em] text-text-faint">
                        {String(index + 1).padStart(2, '0')} / Capability
                      </p>
                      <h2 className="mt-3 text-3xl font-semibold tracking-tight text-text sm:text-4xl">
                        {feature.title}
                      </h2>
                      <p className="mt-4 max-w-xl text-pretty text-lg leading-relaxed text-text-muted">
                        {feature.body}
                      </p>
                    </div>

                    <div className={reversed ? 'lg:order-1' : ''}>
                      {showChart ? (
                        <div className="accent-ring rounded-2xl border border-border-strong bg-surface/50 p-5 backdrop-blur-xl">
                          <LivePairChart pair="USD/JPY" height={240} />
                        </div>
                      ) : (
                        <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-border bg-surface/40">
                          <div className="pointer-events-none absolute inset-0 bg-grid bg-grid-fade opacity-40" aria-hidden="true" />
                          <div
                            className="accent-aura pointer-events-none absolute -right-10 -top-10 h-64 w-64 rounded-full opacity-25"
                            aria-hidden="true"
                          />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <feature.icon
                              className="h-20 w-20 text-accent-bright/40 transition-transform duration-500 group-hover:scale-105"
                              strokeWidth={1}
                              aria-hidden="true"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </Reveal>
              )
            })}
          </div>
        </Container>
      </Section>

      {/* Trust pillars */}
      <Section className="border-t border-border">
        <Container>
          <SectionHeading
            eyebrow="Built on trust"
            title="Serious tools demand serious framing."
            description="The capabilities matter, but so does how we talk about them. These principles hold across every screen."
            center
          />
          <StaggerGroup className="mt-16 grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-border bg-border md:grid-cols-3" stagger={0.08}>
            {TRUST_PILLARS.map((pillar) => (
              <StaggerItem key={pillar.title} className="h-full">
                <SpotlightCard className="h-full bg-bg p-8">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-surface-2 text-accent-bright transition-transform duration-300 group-hover:-translate-y-0.5">
                    <pillar.icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <h3 className="mt-6 text-lg font-semibold tracking-tight text-text">{pillar.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-text-muted">{pillar.body}</p>
                </SpotlightCard>
              </StaggerItem>
            ))}
          </StaggerGroup>
        </Container>
      </Section>

      <ClosingCta
        title="See the terminal in motion."
        subtitle="Full access to every capability above for $99/month. Cancel anytime."
      />
    </>
  )
}
