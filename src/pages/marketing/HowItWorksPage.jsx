import { ListChecks } from 'lucide-react'
import { COMPLIANCE } from '../../lib/brand'
import { HOW_IT_WORKS_STEPS } from '../../lib/content'
import { Section, Container, SectionHeading } from '../../components/marketing/Section'
import Eyebrow from '../../components/marketing/Eyebrow'
import Reveal from '../../components/marketing/Reveal'
import ClosingCta from '../../components/marketing/ClosingCta'
import LivePairChart from '../../components/ui/LivePairChart'
import HowSignalAnatomy from '../../components/marketing/HowSignalAnatomy'
import SignalFormsSequence from '../../components/marketing/SignalFormsSequence'
import MarketingHero from '../../components/marketing/MarketingHero'
import TextReveal from '../../components/motion/TextReveal'

/** Deep dive on the scripts → signal → decision loop. */
export default function HowItWorksPage() {
  return (
    <>
      <MarketingHero>
        <Container className="relative pb-24 text-center sm:pb-28">
          <Reveal className="mx-auto max-w-3xl">
            <Eyebrow className="justify-center">How It Works</Eyebrow>
            <h1 className="mt-6 text-balance text-5xl font-semibold leading-[1.04] tracking-tight text-text sm:text-6xl lg:text-7xl">
              The market never sleeps.
              <br />
              <TextReveal text="Neither do the scripts." className="text-accent-bright" />
            </h1>
            <p className="mx-auto mt-7 max-w-xl text-pretty text-lg leading-relaxed text-text-muted">
              A closed loop between live price action and your judgment: algorithms surface the
              setup, score it, and explain it — then you decide and act on your own broker.
            </p>
          </Reveal>
        </Container>
      </MarketingHero>

      {/* Signature: scroll-scrubbed signal-forming sequence */}
      <SignalFormsSequence tone="light" />

      {/* Step walkthrough with connecting accent line */}
      <Section tone="dark" className="border-t border-border">
        <Container>
          <div className="relative">
            {/* Connecting vertical accent line */}
            <div
              className="pointer-events-none absolute left-6 top-4 bottom-4 hidden w-px bg-gradient-to-b from-[var(--ds-accent-face)] via-border to-transparent lg:block"
              aria-hidden="true"
            />
            <div className="space-y-20 lg:space-y-28">
              {HOW_IT_WORKS_STEPS.map((step, index) => {
                const isChart = index === 0
                return (
                  <Reveal key={step.id} delay={0.05}>
                    <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-[1fr_1fr] lg:gap-16">
                      {/* Text column */}
                      <div className={index % 2 === 1 ? 'lg:order-2' : ''}>
                        <div className="flex items-center gap-5">
                          <span className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-border bg-surface-2 text-accent-bright">
                            <step.icon className="h-5 w-5" aria-hidden="true" />
                          </span>
                          <span className="font-mono text-6xl font-semibold tracking-tight text-surface-3">
                            {step.id}
                          </span>
                        </div>
                        <h2 className="mt-8 text-3xl font-semibold tracking-tight text-text sm:text-4xl">
                          {step.title}
                        </h2>
                        <p className="mt-3 text-base text-text-muted">{step.summary}</p>
                        <p className="mt-5 max-w-xl text-pretty leading-relaxed text-text-muted">
                          {step.detail}
                        </p>
                      </div>

                      {/* Visual column */}
                      <div className={index % 2 === 1 ? 'lg:order-1' : ''}>
                        {isChart ? (
                          <div className="rounded-2xl border border-border-strong bg-surface/50 p-5 backdrop-blur-xl">
                            <div className="mb-1 flex items-center justify-between">
                              <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-text-muted">
                                Scripts watching
                              </span>
                              <span className="flex items-center gap-1.5 font-mono text-[11px] text-positive">
                                <span className="relative flex h-1.5 w-1.5">
                                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-positive opacity-75" />
                                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-positive" />
                                </span>
                                LIVE
                              </span>
                            </div>
                            <LivePairChart symbol="XAUUSD" height={220} />
                          </div>
                        ) : index === 1 ? (
                          <HowSignalAnatomy />
                        ) : (
                          <div className="relative overflow-hidden rounded-2xl border border-[var(--ds-accent-soft)] bg-[var(--ds-accent-softer)] p-8 sm:p-10">
                            <span
                              className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--ds-accent-soft)] text-accent-bright"
                              aria-hidden="true"
                            >
                              <ListChecks className="h-5 w-5" />
                            </span>
                            <p className="mt-6 text-pretty text-lg leading-relaxed text-text">
                              The signal is ours. The decision is yours. We never touch your funds or
                              your broker — you size every position and pull every trigger.
                            </p>
                            <p className="mt-4 font-mono text-xs uppercase tracking-[0.16em] text-text-faint">
                              You hold the trigger
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </Reveal>
                )
              })}
            </div>
          </div>
        </Container>
      </Section>

      {/* What a signal contains */}
      <Section tone="light" className="border-t border-border">
        <Container>
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
            <SectionHeading
              eyebrow="Anatomy of a signal"
              title="Not an arrow. A briefing."
              description="Every signal carries a side and a confidence score, a suggested entry, target and stop, the risk/reward, and the catalysts behind the call — so you can interrogate it, not just obey it."
            />
            <Reveal delay={0.1}>
              <HowSignalAnatomy />
            </Reveal>
          </div>
        </Container>
      </Section>

      {/* Roadmap / user-decides reiteration */}
      <Section tone="dark" className="border-t border-border">
        <Container>
          <Reveal className="mx-auto max-w-3xl text-center">
            <Eyebrow className="justify-center">Where this goes</Eyebrow>
            <h2 className="mt-6 text-balance text-3xl font-semibold tracking-tight text-text sm:text-4xl">
              Today, decision-support. The decision stays yours.
            </h2>
            <p className="mt-5 text-pretty leading-relaxed text-text-muted">{COMPLIANCE.long}</p>
            <p className="mt-6 font-mono text-xs uppercase tracking-[0.14em] text-text-faint">
              {COMPLIANCE.roadmap}
            </p>
          </Reveal>
        </Container>
      </Section>

      <ClosingCta tone="light" />
    </>
  )
}
