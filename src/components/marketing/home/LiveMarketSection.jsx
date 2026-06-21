import { ArrowRight } from 'lucide-react'
import { Section, Container, SectionHeading } from '../Section'
import Reveal from '../Reveal'
import MarketingButton from '../MarketingButton'
import LivePairChart from '../LivePairChart'
import { useFxQuotes } from '../../../lib/fxData'

const PREVIEW_PAIRS = ['EUR/USD', 'GBP/USD', 'USD/JPY', 'AUD/USD', 'USD/CAD', 'EUR/JPY']

/** Live FX preview grid — real/near-real streaming charts, straight from the data layer. */
export default function LiveMarketSection() {
  const { mode } = useFxQuotes()
  const sourceLabel =
    mode === 'live' ? 'Live market feed' : mode === 'anchored' ? 'ECB-anchored feed' : 'Simulated feed'

  return (
    <Section id="live" className="border-t border-border">
      <Container>
        <div className="flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-end">
          <SectionHeading
            eyebrow="Live Markets"
            title="The tape, streaming in real time."
            description="A glimpse of what runs behind the paywall — the same live charts the signal engine reads from."
            className="lg:max-w-2xl"
          />
          <Reveal delay={0.1} className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.18em] text-text-faint">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent-bright opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent-bright" />
            </span>
            {sourceLabel}
          </Reveal>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PREVIEW_PAIRS.map((pair, index) => (
            <Reveal
              key={pair}
              delay={(index % 3) * 0.08}
              className="rounded-2xl border border-border bg-surface/40 p-5 transition-colors hover:border-border-hover"
            >
              <LivePairChart pair={pair} height={140} />
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.1} className="mt-12 flex justify-center">
          <MarketingButton to="/signup">
            Unlock the full terminal
            <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
          </MarketingButton>
        </Reveal>
      </Container>
    </Section>
  )
}
