import { Section, Container } from '../Section'
import Reveal from '../Reveal'
import Eyebrow from '../Eyebrow'
import { StaggerGroup, StaggerItem } from '../../motion/Stagger'
import { SpotlightCard } from '../../motion/Spotlight'
import { TRUST_PILLARS } from '../../../lib/content'

/** Compliance-forward trust strip standing in for traditional social proof. */
export default function TrustSection() {
  return (
    <Section className="relative overflow-hidden border-t border-border">
      <div
        className="accent-glow pointer-events-none absolute left-1/2 top-0 h-[360px] w-[680px] -translate-x-1/2 opacity-40"
        aria-hidden="true"
      />
      <Container>
        <Reveal variant="blur" className="mx-auto max-w-4xl text-center">
          <Eyebrow className="justify-center">Where We Stand</Eyebrow>
          <blockquote className="mt-7 text-balance text-2xl font-medium leading-snug tracking-tight text-text sm:text-3xl lg:text-4xl">
            “We don’t sell certainty, and we don’t touch your money. We give you a
            sharper read on the market — the decision stays yours.”
          </blockquote>
          <p className="mt-6 font-mono text-xs uppercase tracking-[0.2em] text-text-faint">
            — The Root &amp; Rise team
          </p>
        </Reveal>

        <StaggerGroup className="mt-16 grid grid-cols-1 gap-6 md:grid-cols-3" stagger={0.1}>
          {TRUST_PILLARS.map((pillar) => (
            <StaggerItem key={pillar.title} className="h-full">
              <SpotlightCard className="h-full rounded-2xl border border-border bg-surface/40 p-7 transition-colors hover:border-border-hover">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-surface-2 text-accent-bright transition-transform duration-300 group-hover:-translate-y-0.5">
                  <pillar.icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <h3 className="mt-5 text-base font-semibold tracking-tight text-text">{pillar.title}</h3>
                <p className="mt-2.5 text-sm leading-relaxed text-text-muted">{pillar.body}</p>
              </SpotlightCard>
            </StaggerItem>
          ))}
        </StaggerGroup>
      </Container>
    </Section>
  )
}
