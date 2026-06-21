import { Section, Container } from '../Section'
import Eyebrow from '../Eyebrow'
import Reveal from '../Reveal'
import Parallax from '../../motion/Parallax'
import { StaggerGroup, StaggerItem } from '../../motion/Stagger'
import { SpotlightCard } from '../../motion/Spotlight'

const POINTS = [
  {
    stat: '$7.5T',
    label: 'Traded daily',
    body: 'The FX market is the largest, fastest-moving market on earth. Opportunity is constant — and so is the noise.',
  },
  {
    stat: '24/5',
    label: 'Always open',
    body: 'Sessions roll from Sydney to London to New York. No human can watch every pair, every candle, without missing the setup.',
  },
  {
    stat: '∞',
    label: 'Conflicting signals',
    body: 'Indicators contradict each other. Emotion overrides discipline. Most decisions are made on gut, late, or not at all.',
  },
]

/** Framing the problem the product solves before introducing the solution. */
export default function ProblemSection() {
  return (
    <Section className="relative overflow-hidden border-t border-border">
      <Parallax speed={70} className="pointer-events-none absolute -right-32 top-10 h-[420px] w-[420px]">
        <div className="accent-glow h-full w-full opacity-50" aria-hidden="true" />
      </Parallax>
      <Container>
        <Reveal variant="blur" className="max-w-4xl">
          <Eyebrow>The Problem</Eyebrow>
          <h2 className="mt-6 text-balance text-3xl font-semibold leading-tight tracking-tight text-text sm:text-4xl lg:text-5xl">
            The edge isn't more screens. It's knowing the exact moment to act —{' '}
            <span className="text-text-faint">and most traders miss it.</span>
          </h2>
        </Reveal>

        <StaggerGroup className="mt-16 grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-border bg-border md:grid-cols-3">
          {POINTS.map((point) => (
            <StaggerItem key={point.label}>
              <SpotlightCard className="h-full bg-bg p-8">
                <p className="font-mono text-4xl font-semibold tracking-tight text-accent-bright transition-[letter-spacing] duration-500 group-hover:tracking-tight sm:text-5xl">
                  {point.stat}
                </p>
                <p className="mt-3 font-mono text-xs uppercase tracking-[0.2em] text-text-faint">
                  {point.label}
                </p>
                <p className="mt-4 text-sm leading-relaxed text-text-muted">{point.body}</p>
              </SpotlightCard>
            </StaggerItem>
          ))}
        </StaggerGroup>
      </Container>
    </Section>
  )
}
