import { ArrowRight } from 'lucide-react'
import { Section, Container, SectionHeading } from '../Section'
import Reveal from '../Reveal'
import MarketingButton from '../MarketingButton'
import { HOW_IT_WORKS_STEPS } from '../../../lib/content'

/** Home overview of the three-step decision loop. Deeper dive lives on its page. */
export default function HowItWorksSection() {
  return (
    <Section id="how-it-works" className="border-t border-border">
      <Container>
        <SectionHeading
          eyebrow="How It Works"
          title="Scripts find the setup. You make the call."
          description="A closed loop between the market and your judgment — built so you act on evidence, in time, every session."
        />

        <div className="mt-16 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {HOW_IT_WORKS_STEPS.map((step, index) => (
            <Reveal key={step.id} delay={index * 0.1}>
              <div className="group flex h-full flex-col rounded-2xl border border-border bg-surface/40 p-8 transition-colors hover:border-border-hover">
                <div className="flex items-center justify-between">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-surface-2 text-accent-bright">
                    <step.icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span className="font-mono text-5xl font-semibold tracking-tight text-surface-3">
                    {step.id}
                  </span>
                </div>
                <h3 className="mt-7 text-xl font-semibold tracking-tight text-text">{step.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-text-muted">{step.detail}</p>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.1} className="mt-12 flex justify-center">
          <MarketingButton to="/how-it-works" variant="secondary">
            Go deeper on the system
            <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
          </MarketingButton>
        </Reveal>
      </Container>
    </Section>
  )
}
