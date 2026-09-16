import { Section, SectionHeading } from '../Section'
import { METHOD_STEPS } from '../../../lib/copy/content'
import { StaggerGroup, StaggerItem } from '../../motion/Stagger'

/**
 * Three ruled rows, each one step of the read. The step number is set in mono
 * at display size so the column reads as an index down the left rather than as
 * a third heading level.
 */
export default function MethodSection({ ground = 'page' }) {
  return (
    <Section id="method" ground={ground}>
      <SectionHeading
        title="Structure first, entry second, rules always."
        description="The same three passes run on every instrument the desk touches, in the same order, before a ticket exists."
      />

      <StaggerGroup className="border-t border-border">
        {METHOD_STEPS.map((step) => {
          const Icon = step.icon
          return (
            <StaggerItem key={step.id}>
              <div className="grid gap-6 border-b border-border py-10 lg:grid-cols-[8rem_minmax(0,1fr)_minmax(0,1.15fr)] lg:gap-10">
                <div className="flex items-center gap-4 lg:flex-col lg:items-start lg:gap-5">
                  <span className="text-4xl font-semibold tabular-nums leading-none tracking-tighter text-text-ghost">
                    {step.id}
                  </span>
                  <span className="flex h-9 w-9 items-center justify-center rounded-control bg-accent-soft text-accent">
                    <Icon aria-hidden="true" className="h-4 w-4" />
                  </span>
                </div>
                <div>
                  <h3 className="t-h3 text-text">{step.title}</h3>
                  <p className="t-body mt-2 text-text-muted">{step.summary}</p>
                </div>
                <p className="t-body text-text-muted lg:pt-1">{step.detail}</p>
              </div>
            </StaggerItem>
          )
        })}
      </StaggerGroup>
    </Section>
  )
}
