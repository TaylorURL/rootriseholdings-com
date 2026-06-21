import { ArrowRight, ArrowDownRight, ArrowUpRight } from 'lucide-react'
import { Section, Container, SectionHeading } from '../Section'
import Reveal from '../Reveal'
import MarketingButton from '../MarketingButton'
import Marquee from '../../motion/Marquee'
import { StaggerGroup, StaggerItem } from '../../motion/Stagger'
import { SpotlightCard } from '../../motion/Spotlight'
import LivePairChart from '../../ui/LivePairChart'
import { useFxQuotes } from '../../../lib/fxData'
import { decimalsForPair } from '../../../lib/fxData/pairs'
import { cn } from '../../../lib/cn'

const PREVIEW_PAIRS = ['EUR/USD', 'GBP/USD', 'USD/JPY', 'AUD/USD', 'USD/CAD', 'EUR/JPY']

/** One streaming quote chip for the live wall marquee. */
function QuoteChip({ quote }) {
  const positive = quote.changePct >= 0
  const Arrow = positive ? ArrowUpRight : ArrowDownRight
  return (
    <span className="flex shrink-0 items-center gap-2.5 border-r border-border px-5 py-3">
      <span className="font-mono text-sm font-medium text-text">{quote.pair}</span>
      <span className="font-mono text-sm tabular-nums text-text-muted">{quote.bid.toFixed(decimalsForPair(quote.pair))}</span>
      <span className={cn('flex items-center gap-0.5 font-mono text-xs tabular-nums', positive ? 'text-positive' : 'text-danger')}>
        <Arrow className="h-3 w-3" aria-hidden="true" />
        {positive ? '+' : ''}
        {quote.changePct.toFixed(2)}%
      </span>
    </span>
  )
}

/** Live FX preview wall — streaming charts + a continuously scrolling quote rail. */
export default function LiveMarketSection() {
  const { mode, quotes } = useFxQuotes()
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

        <StaggerGroup className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" stagger={0.06}>
          {PREVIEW_PAIRS.map((pair) => (
            <StaggerItem key={pair} className="h-full">
              <SpotlightCard className="h-full rounded-2xl border border-border bg-surface/40 p-5 transition-colors hover:border-border-hover">
                <LivePairChart pair={pair} height={140} />
              </SpotlightCard>
            </StaggerItem>
          ))}
        </StaggerGroup>
      </Container>

      {/* Edge-to-edge streaming quote wall across every tracked pair */}
      <Reveal className="mt-14 border-y border-border bg-bg-elevated/60">
        <Marquee speed={56} className="py-0">
          {quotes.map((quote) => (
            <QuoteChip key={quote.pair} quote={quote} />
          ))}
        </Marquee>
      </Reveal>

      <Container>
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
