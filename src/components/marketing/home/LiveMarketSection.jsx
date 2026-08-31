import { Section, SectionHeading } from '../Section'
import LivePairChart from '../../charts/LivePairChartAsync'
import { PRIMARY_INSTRUMENTS } from '../../../data/instruments'
import { useInstrumentQuotes } from '../../../lib/marketData/instrumentQuotes'
import { StaggerGroup, StaggerItem } from '../../motion/Stagger'

/**
 * The four charts the desk actually carries, priced live. The count in the
 * header reports the feed rather than decorating it: with nothing arriving it
 * says so instead of showing a dot that means nothing.
 */
export default function LiveMarketSection({ ground = 'page' }) {
  const { quotes } = useInstrumentQuotes()
  const priced = quotes.length

  return (
    <Section id="live" ground={ground}>
      <SectionHeading
        title="Four charts carry the whole desk."
        description="XAUUSD on the 1H, NAS100 and SP500 on the 15m, US30 on the 1H, plus an FX watch list read for context and never traded."
        meta={
          <p className="font-mono text-[11px] uppercase tracking-label text-text-faint">
            {priced > 0 ? `Live · ${priced} instruments` : 'Reading the feed'}
          </p>
        }
      />

      <StaggerGroup className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {PRIMARY_INSTRUMENTS.map((instrument) => (
          <StaggerItem key={instrument.symbol}>
            <div className="panel h-full p-4">
              <LivePairChart symbol={instrument.symbol} height={150} compact />
            </div>
          </StaggerItem>
        ))}
      </StaggerGroup>
    </Section>
  )
}
