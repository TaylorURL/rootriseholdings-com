import { Container } from './Section'
import MarketingButton from './MarketingButton'
import Reveal from '../motion/Reveal'
import { COMPLIANCE } from '../../lib/brand'

/**
 * The closing slab. Pinned dark like the masthead, so the page opens and shuts
 * on the same ground and the bands between them read as the rhythm.
 */
export default function ClosingCta({
  title = 'The desk is behind the door.',
  subtitle = 'Briefing, journal, and the rule book. The terminal is where the day starts and ends.',
}) {
  return (
    <section
      data-ground="dark"
      className="section-defer relative overflow-hidden border-t border-border bg-bg py-24 text-text sm:py-32"
    >
      <div className="grid-blueprint absolute inset-0 opacity-60" aria-hidden="true" />
      <div className="rule-accent absolute inset-x-0 top-0 h-px" aria-hidden="true" />
      <div
        className="accent-glow-strong absolute left-1/2 top-1/2 h-[26rem] w-[54rem] -translate-x-1/2 -translate-y-1/2 opacity-30"
        aria-hidden="true"
      />

      <Container className="relative">
        <Reveal variant="blur">
          <div className="mx-auto max-w-[34ch] text-center">
            <h2 className="t-h1 text-text">{title}</h2>
            <p className="t-lede mx-auto mt-5 max-w-[46ch] text-text-muted">{subtitle}</p>
            <div className="mt-9 flex justify-center">
              <MarketingButton to="/login" size="lg">
                Sign In
              </MarketingButton>
            </div>
            <p className="t-meta mx-auto mt-8 max-w-[52ch] text-text-faint">{COMPLIANCE.short}</p>
          </div>
        </Reveal>
      </Container>
    </section>
  )
}
