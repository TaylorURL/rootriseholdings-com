import { Section, Container, SectionHeading } from './Section'
import { StaggerGroup, StaggerItem } from '../motion/Stagger'
import TiltCard from '../motion/TiltCard'
import { PLATFORM_FEATURES } from '../../lib/content'

/**
 * Features signature section: a cursor-reactive capability matrix. Each tile
 * tilts toward the pointer with a tracking spotlight, turning the capability
 * overview into something you can feel. Behavior-free, transform-only motion.
 *
 * @param {object} props
 * @param {'dark'|'light'} [props.tone='dark']
 */
export default function CapabilityMatrix({ tone = 'dark' }) {
  return (
    <Section tone={tone} className="border-t border-border">
      <Container>
        <SectionHeading
          eyebrow="The matrix"
          title="Six capabilities, one reactive surface."
          description="Hover any tile — the whole grid responds. The same responsiveness runs through the terminal itself."
        />

        <StaggerGroup className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" stagger={0.06}>
          {PLATFORM_FEATURES.map((feature, index) => (
            <StaggerItem key={feature.title} className="h-full">
              <TiltCard className="card-elevated h-full rounded-2xl border border-border-strong bg-surface/50 p-7 backdrop-blur-sm [@media(hover:hover)]:hover:border-border-hover">
                <div className="flex items-center justify-between [transform:translateZ(28px)]">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-surface-2 text-accent-bright">
                    <feature.icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span className="font-mono text-sm text-text-faint">{String(index + 1).padStart(2, '0')}</span>
                </div>
                <h3 className="mt-6 text-lg font-semibold tracking-tight text-text [transform:translateZ(20px)]">
                  {feature.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-text-muted [transform:translateZ(12px)]">
                  {feature.body}
                </p>
              </TiltCard>
            </StaggerItem>
          ))}
        </StaggerGroup>
      </Container>
    </Section>
  )
}
