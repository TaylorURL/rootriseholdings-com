import { Container } from '../Section'
import Reveal from '../Reveal'
import CountUp from '../CountUp'
import { PLATFORM_STATS } from '../../../lib/content'

/** Operational metric strip with scroll-triggered count-ups. */
export default function StatsStrip() {
  return (
    <section className="border-t border-border bg-bg-elevated/40">
      <Container className="py-16">
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border bg-border lg:grid-cols-4">
          {PLATFORM_STATS.map((stat, index) => (
            <Reveal key={stat.label} delay={index * 0.08} className="bg-bg px-6 py-10 text-center">
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
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  )
}
