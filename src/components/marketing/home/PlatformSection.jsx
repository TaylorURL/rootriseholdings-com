import { Section, SectionHeading } from '../Section'
import Plate from '../Plate'
import { PLATFORM_FEATURES } from '../../../lib/content'
import { SpotlightCard } from '../../motion/Spotlight'
import Reveal from '../../motion/Reveal'

/**
 * The terminal, as a ruled mesh beside the thing it produces. Cells sit flush
 * and share one hairline between them rather than each drawing its own box.
 */
export default function PlatformSection({ ground = 'band' }) {
  return (
    <Section id="platform" ground={ground}>
      <SectionHeading
        title="The journal and the briefing, in one terminal."
        description="Everything the desk needs during a session is one surface: the read, the ticket that comes out of it, and the record it leaves."
      />

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:items-start lg:gap-14">
        <div className="mesh-shell">
          <div className="mesh-grid sm:grid-cols-2">
            {PLATFORM_FEATURES.map((feature) => {
              const Icon = feature.icon
              return (
                <SpotlightCard key={feature.title} className="mesh-cell bg-bg p-7">
                  <span className="flex h-9 w-9 items-center justify-center rounded-control bg-accent-soft text-accent">
                    <Icon aria-hidden="true" className="h-4 w-4" />
                  </span>
                  <h3 className="t-h4 mt-5 text-text">{feature.title}</h3>
                  <p className="t-meta mt-2 text-text-muted">{feature.body}</p>
                </SpotlightCard>
              )
            })}
          </div>
        </div>

        <Reveal>
          <Plate name="briefing" loading="lazy" />
          <p className="t-meta mt-4 text-text-faint">
            The London edition, composed from the feed rather than typed out.
          </p>
        </Reveal>
      </div>
    </Section>
  )
}
