import { Section, SectionHeading } from '../Section'
import { FAQ } from '../../../lib/faq.data'
import { StaggerGroup, StaggerItem } from '../../motion/Stagger'

/**
 * Questions and answers as ruled rows, question left and answer right, so the
 * page can be scanned down one column without opening anything.
 */
export default function FaqSection({ ground = 'page' }) {
  return (
    <Section id="faq" ground={ground}>
      <SectionHeading title="Questions the desk gets asked." />

      <StaggerGroup className="border-t border-border">
        {FAQ.map((entry) => (
          <StaggerItem key={entry.question}>
            <div className="grid gap-4 border-b border-border py-9 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] lg:gap-10">
              <h3 className="t-h3 text-text">{entry.question}</h3>
              <p className="t-body text-text-muted">{entry.answer}</p>
            </div>
          </StaggerItem>
        ))}
      </StaggerGroup>
    </Section>
  )
}
