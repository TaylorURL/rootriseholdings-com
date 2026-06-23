import { Container } from '../Section'
import CountUp from '../CountUp'
import { StaggerGroup, StaggerItem } from '../../motion/Stagger'
import { SpotlightCard } from '../../motion/Spotlight'
import { PLATFORM_STATS } from '../../../lib/content'

/**
 * Operational metric strip with scroll-triggered count-ups.
 *
 * @param {object} props
 * @param {'dark'|'light'} [props.tone='dark']
 */
export default function StatsStrip({ tone = 'dark' }) {
  return (
    <section
      data-theme={tone}
      className="relative overflow-hidden border-t border-border bg-bg text-text"
    >
      <div className="bg-mesh pointer-events-none absolute inset-0 opacity-60" aria-hidden="true" />
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
