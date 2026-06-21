import { useRef, useState } from 'react'
import { motion, useMotionValueEvent, useReducedMotion, useScroll, useTransform } from 'framer-motion'
import { Compass, Radar, ScrollText, Route } from 'lucide-react'
import { Section, Container, SectionHeading } from './Section'
import { cn } from '../../lib/cn'

/** Company ethos beats — compliance-safe (process & roadmap, never returns). */
const MILESTONES = [
  { icon: Compass, title: 'Built around one rule', body: 'The decision stays with the person who carries the risk. Everything else serves that.' },
  { icon: Radar, title: 'A focused universe', body: 'Gold, the indices and a tight FX watch list, read for structure on every candle — depth over breadth, coverage no manual desk can match.' },
  { icon: ScrollText, title: 'Every signal shows its work', body: 'Structure, setup type, levels and catalysts. No black boxes — you interrogate the call before you take it.' },
  { icon: Route, title: 'Roadmap: optional execution', body: 'Broker integrations are coming as an opt-in convenience. The signal stays ours; the trigger stays yours.' },
]

/**
 * About signature section: a vertical timeline whose accent spine draws in with
 * scroll, lighting each milestone as the line reaches it. Reduced-motion shows a
 * fully-drawn spine with all milestones active.
 */
export default function MissionTimeline() {
  const ref = useRef(null)
  const reduce = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 70%', 'end 60%'] })
  const lineScaleY = useTransform(scrollYProgress, [0, 1], [0, 1])
  const [reached, setReached] = useState(reduce ? MILESTONES.length : 0)

  useMotionValueEvent(scrollYProgress, 'change', (value) => {
    if (reduce) return
    setReached(Math.round(value * MILESTONES.length))
  })

  return (
    <Section className="border-t border-border">
      <Container>
        <SectionHeading
          eyebrow="The throughline"
          title="One rule, held all the way down."
          description="How the principle that the trader decides shapes everything we build — and where it goes next."
        />

        <div ref={ref} className="relative mx-auto mt-16 max-w-3xl pl-10 sm:pl-14">
          {/* Static rail + scroll-drawn accent overlay */}
          <div className="absolute left-[14px] top-2 bottom-2 w-px bg-border sm:left-[22px]" aria-hidden="true" />
          <motion.div
            className="absolute left-[14px] top-2 bottom-2 w-px origin-top bg-[var(--ds-accent-face)] shadow-[0_0_10px_var(--ds-accent-glow)] sm:left-[22px]"
            style={{ scaleY: reduce ? 1 : lineScaleY }}
            aria-hidden="true"
          />

          <ol className="space-y-12">
            {MILESTONES.map((milestone, index) => {
              const active = index < reached
              return (
                <motion.li
                  key={milestone.title}
                  initial={{ opacity: 0, x: reduce ? 0 : 16 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: '-60px' }}
                  transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
                  className="relative"
                >
                  <span
                    className={cn(
                      'absolute -left-10 flex h-7 w-7 items-center justify-center rounded-full border transition-colors duration-500 sm:-left-14 sm:h-9 sm:w-9',
                      active
                        ? 'border-[var(--ds-accent-soft)] bg-[var(--ds-accent-soft)] text-accent-bright'
                        : 'border-border bg-surface-2 text-text-faint',
                    )}
                  >
                    <milestone.icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <h3 className={cn('text-lg font-semibold tracking-tight transition-colors duration-500', active ? 'text-text' : 'text-text-muted')}>
                    {milestone.title}
                  </h3>
                  <p className="mt-2 max-w-xl text-pretty text-sm leading-relaxed text-text-muted">{milestone.body}</p>
                </motion.li>
              )
            })}
          </ol>
        </div>
      </Container>
    </Section>
  )
}
