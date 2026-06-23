import { ArrowRight } from 'lucide-react'
import { Section, Container, SectionHeading } from '../Section'
import Reveal from '../Reveal'
import MarketingButton from '../MarketingButton'
import { StaggerGroup, StaggerItem } from '../../motion/Stagger'
import { SpotlightCard } from '../../motion/Spotlight'
import { HOW_IT_WORKS_STEPS } from '../../../lib/content'

/**
 * Home overview of the three-step decision loop. Deeper dive lives on its page.
 *
 * @param {object} props
 * @param {'dark'|'light'} [props.tone='dark']
 */
export default function HowItWorksSection({ tone = 'dark' }) {
  return (
    <Section id="how-it-works" tone={tone} className="border-t border-border">
      <Container>
        <SectionHeading
          eyebrow="How It Works"
          title="Scripts find the setup. You make the call."
          description="A closed loop between the market and your judgment — built so you act on evidence, in time, every session."
        />

        <StaggerGroup className="mt-16 grid grid-cols-1 gap-6 lg:grid-cols-3" stagger={0.1}>
          {HOW_IT_WORKS_STEPS.map((step) => (
            <StaggerItem key={step.id}>
              <SpotlightCard className="card-elevated flex h-full flex-col rounded-2xl border border-border bg-surface/40 p-8 [@media(hover:hover)]:hover:border-border-hover">
                <div className="flex items-center justify-between">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-surface-2 text-accent-bright transition-[transform,border-color] duration-300 [transition-timing-function:var(--ds-ease-out)] [@media(hover:hover)]:group-hover:-translate-y-0.5 [@media(hover:hover)]:group-hover:border-border-hover">
                    <step.icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span className="font-mono text-5xl font-semibold tracking-tight text-surface-3 transition-colors duration-300 [transition-timing-function:var(--ds-ease-out)] [@media(hover:hover)]:group-hover:text-[var(--ds-accent-soft)]">
                    {step.id}
                  </span>
                </div>
                <h3 className="mt-7 text-xl font-semibold tracking-tight text-text">{step.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-text-muted">{step.detail}</p>
              </SpotlightCard>
            </StaggerItem>
          ))}
        </StaggerGroup>

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
