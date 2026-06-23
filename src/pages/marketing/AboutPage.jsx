import { PRODUCT } from '../../lib/brand'
import { TRUST_PILLARS } from '../../lib/content'
import { Section, Container, SectionHeading } from '../../components/marketing/Section'
import Eyebrow from '../../components/marketing/Eyebrow'
import Reveal from '../../components/marketing/Reveal'
import ClosingCta from '../../components/marketing/ClosingCta'
import MissionTimeline from '../../components/marketing/MissionTimeline'
import TextReveal from '../../components/motion/TextReveal'
import { StaggerGroup, StaggerItem } from '../../components/motion/Stagger'
import { SpotlightCard } from '../../components/motion/Spotlight'

const TEAM = [
  { initials: 'QR', role: 'Quant Research', focus: 'Signal models & backtesting' },
  { initials: 'PE', role: 'Platform Engineering', focus: 'Streaming data & terminal' },
  { initials: 'MO', role: 'Market Operations', focus: 'Coverage & data integrity' },
  { initials: 'DX', role: 'Design & Experience', focus: 'Clarity under pressure' },
]

/** Mission, principles and a minimal team strip. */
export default function AboutPage() {
  return (
    <>
      {/* Hero — mission statement */}
      <section className="relative overflow-hidden pt-32 sm:pt-40">
        <div className="pointer-events-none absolute inset-0 bg-grid bg-grid-fade opacity-60" aria-hidden="true" />
        <div className="bg-mesh pointer-events-none absolute inset-0 opacity-70" aria-hidden="true" />
        <div
          className="accent-glow-strong pointer-events-none absolute -top-40 left-1/2 h-[600px] w-[600px] -translate-x-1/2"
          aria-hidden="true"
        />
        <Container className="relative pb-16 text-center">
          <Reveal className="mx-auto max-w-4xl">
            <Eyebrow className="justify-center">About</Eyebrow>
            <h1 className="mt-6 text-balance text-4xl font-semibold leading-[1.06] tracking-tight text-text sm:text-5xl lg:text-6xl">
              We sharpen the trader&apos;s judgment.
              <br />
              <TextReveal text="We never replace it." className="text-accent-bright" />
            </h1>
            <p className="mx-auto mt-7 max-w-2xl text-pretty text-lg leading-relaxed text-text-muted">
              {PRODUCT.tagline} {PRODUCT.name} exists to put institutional-grade signal intelligence
              in the hands of independent traders — without ever taking the trigger out of them.
            </p>
          </Reveal>
        </Container>
      </section>

      {/* Mission / story */}
      <Section className="border-t border-border">
        <Container>
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
            <SectionHeading eyebrow="Mission" title="Why Root &amp; Rise exists." />
            <Reveal delay={0.1} className="max-w-2xl space-y-6 text-pretty text-lg leading-relaxed text-text-muted">
              <p>
                Most traders don&apos;t lose because they lack information. They lose because the
                signal is buried in noise, arrives too late, or comes wrapped in someone else&apos;s
                agenda. We built {PRODUCT.name} to cut through that — scripts that watch every pair
                around the clock and surface the setup the moment it forms, with the reasoning intact.
              </p>
              <p>
                We are deliberate about what we are not. We do not custody funds. We do not execute
                trades. We do not promise returns. The temptation in this space is to over-claim —
                to dress up a black box as a money machine. We refuse. Every signal shows its work,
                so you can agree or disagree on the evidence.
              </p>
              <p>
                The decision has to stay with the person who carries the risk. That is the line we
                hold. {PRODUCT.name} makes you faster and better-informed — the conviction, the
                sizing, and the trigger remain entirely yours.
              </p>
            </Reveal>
          </div>
        </Container>
      </Section>

      {/* Signature: scroll-driven mission timeline */}
      <MissionTimeline />

      {/* Principles */}
      <Section className="border-t border-border">
        <Container>
          <SectionHeading
            eyebrow="Principles"
            title="The lines we don&apos;t cross."
            description="Three commitments that shape every decision, every signal, and every word of copy."
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

      {/* Team strip */}
      <Section className="border-t border-border">
        <Container>
          <SectionHeading
            eyebrow="Team"
            title="A small, focused crew."
            description="Quant research, engineering and market operations — building one thing, carefully."
          />
          <StaggerGroup className="mt-16 grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-4" stagger={0.07}>
            {TEAM.map((member) => (
              <StaggerItem key={member.role} className="h-full">
                <SpotlightCard className="h-full bg-bg p-8">
                  <span
                    className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--ds-accent-face)] font-mono text-base font-bold text-on-accent shadow-[0_8px_30px_-10px_var(--ds-accent-glow)] transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:scale-105"
                    aria-hidden="true"
                  >
                    {member.initials}
                  </span>
                  <h3 className="mt-6 text-base font-semibold tracking-tight text-text">{member.role}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-text-muted">{member.focus}</p>
                </SpotlightCard>
              </StaggerItem>
            ))}
          </StaggerGroup>
        </Container>
      </Section>

      <ClosingCta />
    </>
  )
}
