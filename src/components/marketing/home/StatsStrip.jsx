import { useRef } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Container } from '../Section'
import CountUp from '../CountUp'
import { StaggerGroup, StaggerItem } from '../../motion/Stagger'
import { SpotlightCard } from '../../motion/Spotlight'
import { PLATFORM_STATS } from '../../../lib/content'
import { useScrollLerp } from '../../../lib/useScrollLerp'

/**
 * Operational metric strip with scroll-triggered count-ups and a scroll-driven
 * mesh backdrop that drifts as the section moves through the viewport. The
 * drift is the page's second scroll-driven moment (the hero owns the first),
 * keeping the lower half of the home feed alive while the user reads stats.
 *
 * @param {object} props
 * @param {'dark'|'light'} [props.tone='dark']
 */
export default function StatsStrip({ tone = 'dark' }) {
  const ref = useRef(null)
  const reduce = useReducedMotion()
  // Decorative scroll-driven moment: the mesh wash drifts up and the opacity
  // breathes from 0.4 → 0.85 → 0.4 as the section crosses the viewport. The
  // spring lag from useScrollLerp keeps it feeling cinematic, not stuck-glued.
  const meshY = useScrollLerp(ref, [0, 1], [reduce ? 0 : 80, reduce ? 0 : -80])
  const meshOpacity = useScrollLerp(ref, [0, 0.5, 1], [0.4, 0.85, 0.4])

  return (
    <section
      ref={ref}
      data-theme={tone}
      className="band-seam relative overflow-hidden border-t border-border bg-bg text-text"
    >
      <motion.div
        style={{ y: meshY, opacity: meshOpacity }}
        className="bg-mesh pointer-events-none absolute inset-0"
        aria-hidden="true"
      />
      <Container className="relative py-20 sm:py-24">
        <StaggerGroup className="card-elevated grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border bg-border lg:grid-cols-4" stagger={0.07}>
          {PLATFORM_STATS.map((stat) => (
            <StaggerItem key={stat.label} className="h-full">
              <SpotlightCard className="h-full bg-bg px-6 py-10 text-center">
                <p className="font-mono text-4xl font-semibold tracking-tight text-text sm:text-5xl">
                  {stat.raw ? (
                    <>
                      {stat.prefix ?? ''}
                      {stat.value}
                      {stat.suffix}
                    </>
                  ) : (
                    <CountUp
                      value={stat.value}
                      decimals={stat.decimals ?? 0}
                      prefix={stat.prefix ?? ''}
                      suffix={stat.suffix ?? ''}
                    />
                  )}
                </p>
                <p className="mt-3 text-xs uppercase tracking-[0.18em] text-text-faint">{stat.label}</p>
              </SpotlightCard>
            </StaggerItem>
          ))}
        </StaggerGroup>
      </Container>
    </section>
  )
}
