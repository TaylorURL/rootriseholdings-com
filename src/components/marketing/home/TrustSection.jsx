import { Section } from '../Section'
import Eyebrow from '../Eyebrow'
import Reveal from '../../motion/Reveal'
import { COMPLIANCE } from '../../../lib/copy/brand'
import { TRUST_PILLARS } from '../../../lib/copy/content'
import { StaggerGroup, StaggerItem } from '../../motion/Stagger'

/**
 * Where the desk stands.
 *
 * The statement holds the left column and the three things it rests on run down
 * the right as ruled rows, so the band is read across rather than down and the
 * pillars are supporting text rather than three more headings. Set as boxed
 * cards under a centred headline they read as a feature grid, which is the one
 * thing this section is not.
 *
 * Each pillar is one ruled row, and that row is the staggered item itself
 * rather than a grid nested inside one. A description list may hold a div
 * between itself and its terms, and only one: a term two divs down is no
 * longer a term of any list, which is what a reader on a screen reader is
 * handed and what the accessibility audit reports.
 */
export default function TrustSection({ ground = 'band' }) {
  return (
    <Section ground={ground}>
      <div className="grid gap-x-16 gap-y-12 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <Reveal>
          <div className="lg:sticky lg:top-32">
            <Eyebrow accent>Where the Desk Stands</Eyebrow>
            <h2 className="t-h2 mt-5 max-w-[15ch] text-balance text-text">
              An edge is a rule, not a prediction.
            </h2>
            <p className="t-meta mt-6 max-w-[42ch] text-text-faint">{COMPLIANCE.long}</p>
          </div>
        </Reveal>

        <StaggerGroup as="dl" className="border-t border-border">
          {TRUST_PILLARS.map((pillar) => {
            const Icon = pillar.icon
            return (
              <StaggerItem
                key={pillar.title}
                className="grid grid-cols-[1.5rem_minmax(0,1fr)] gap-x-4 gap-y-1 border-b border-border py-6"
              >
                <Icon aria-hidden="true" className="mt-0.5 h-4 w-4 text-accent" />
                <dt className="t-h4 text-text">{pillar.title}</dt>
                <dd className="t-body col-start-2 text-text-muted">{pillar.body}</dd>
              </StaggerItem>
            )
          })}
        </StaggerGroup>
      </div>
    </Section>
  )
}
