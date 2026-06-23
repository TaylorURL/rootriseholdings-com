import { useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Section, Container, SectionHeading } from './Section'
import { StaggerGroup, StaggerItem } from '../motion/Stagger'
import { EASE_OUT } from '../../lib/marketingMotion'
import { cn } from '../../lib/cn'

/** Operational reach, manual workflow vs the terminal. Factual, not performance. */
const ROWS = [
  { metric: 'Pairs watched at once', manual: 'One or two', system: 'All 14', manualPct: 14, systemPct: 100 },
  { metric: 'Market hours covered', manual: 'When you’re awake', system: '24 / 5', manualPct: 34, systemPct: 100 },
  { metric: 'Setups scored & explained', manual: 'By gut', system: 'Every signal', manualPct: 22, systemPct: 100 },
  { metric: 'Time from setup to alert', manual: 'Minutes–hours', system: 'Under 60s', manualPct: 40, systemPct: 100 },
]

/** Animated bar — scaleX from 0 to its target on scroll into view (GPU-only). */
function Meter({ pct, tone }) {
  const reduce = useReducedMotion()
  return (
    <div className="h-2 overflow-hidden rounded-full bg-surface-2" aria-hidden="true">
      <motion.div
        className={cn('h-full origin-left rounded-full', tone)}
        initial={{ scaleX: reduce ? pct / 100 : 0 }}
        whileInView={{ scaleX: pct / 100 }}
        viewport={{ once: true, margin: '-60px' }}
        transition={{ duration: 0.9, ease: EASE_OUT }}
        style={{ width: '100%' }}
      />
    </div>
  )
}

/**
 * Pricing signature section: an animated, hover-reactive comparison of the manual
 * workflow against the terminal. Bars draw in on scroll; rows lift on hover. All
 * claims are operational (coverage/speed), never performance.
 */
export default function PricingComparison() {
  const [active, setActive] = useState(null)

  return (
    <Section className="border-t border-border">
      <Container>
        <SectionHeading
          eyebrow="Why it's worth it"
          title="One screen, the reach of a desk."
          description="Not a promise of profit — a step change in coverage, consistency and speed. That’s what the flat price buys."
          center
        />

        <div className="mx-auto mt-14 max-w-4xl overflow-hidden rounded-2xl border border-border-strong bg-surface/40 backdrop-blur-sm">
          <div className="grid grid-cols-[1.2fr_1fr_1fr] gap-4 border-b border-border px-6 py-4 font-mono text-[11px] uppercase tracking-[0.16em] text-text-faint sm:px-8">
            <span>Capability</span>
            <span>Trading manually</span>
            <span className="text-accent-bright">With Root &amp; Rise</span>
          </div>

          <StaggerGroup>
            {ROWS.map((row, index) => (
              <StaggerItem key={row.metric}>
                <div
                  onPointerEnter={() => setActive(index)}
                  onPointerLeave={() => setActive(null)}
                  className={cn(
                    'grid grid-cols-[1.2fr_1fr_1fr] items-center gap-4 border-b border-border/60 px-6 py-5 transition-colors last:border-b-0 sm:px-8',
                    active === index && 'bg-[var(--ds-accent-softer)]',
                  )}
                >
                  <span className="text-sm font-medium text-text">{row.metric}</span>
                  <div>
                    <p className="mb-2 text-xs text-text-muted">{row.manual}</p>
                    <Meter pct={row.manualPct} tone="bg-surface-3" />
                  </div>
                  <div>
                    <p className="mb-2 text-xs font-medium text-accent-bright">{row.system}</p>
                    <Meter pct={row.systemPct} tone="bg-[var(--ds-accent-face)]" />
                  </div>
                </div>
              </StaggerItem>
            ))}
          </StaggerGroup>
        </div>
      </Container>
    </Section>
  )
}
