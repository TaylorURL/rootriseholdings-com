import { Section, Container, SectionHeading } from '../Section'
import { StaggerGroup, StaggerItem } from '../../motion/Stagger'
import { SpotlightCard } from '../../motion/Spotlight'
import { PLATFORM_FEATURES } from '../../../lib/content'

/** Capability grid — the platform's headline features. */
export default function FeaturesSection() {
  return (
    <Section id="features" className="border-t border-border">
      <Container>
        <SectionHeading
          eyebrow="Capabilities"
          title="A signal terminal, not a dashboard of guesses."
          description="Everything you need to read the market and act with conviction — and nothing that pretends to trade for you."
        />

        <StaggerGroup
          className="mt-16 grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-3"
          stagger={0.06}
        >
          {PLATFORM_FEATURES.map((feature) => (
            <StaggerItem key={feature.title} className="h-full">
              <SpotlightCard className="h-full bg-bg p-8 transition-colors hover:bg-surface/40">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-surface-2 text-accent-bright transition-all duration-300 group-hover:-translate-y-0.5 group-hover:border-border-hover group-hover:text-accent-bright">
                  <feature.icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <h3 className="mt-6 text-lg font-semibold tracking-tight text-text">{feature.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-text-muted">{feature.body}</p>
              </SpotlightCard>
            </StaggerItem>
          ))}
        </StaggerGroup>
      </Container>
    </Section>
  )
}
