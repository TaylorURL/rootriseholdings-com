import { Section, SectionHeading } from '../Section'
import ChartInView from '../../charts/ChartInView'
import LivePairChart from '../../charts/LivePairChartAsync'
import { PRIMARY_INSTRUMENTS } from '../../../data/instruments'
import { useInstrumentQuotes } from '../../../lib/marketData/instrumentQuotes'
import { StaggerGroup, StaggerItem } from '../../motion/Stagger'
import { useArrived } from '../../../lib/arrival.js'

/**
 * The four charts the desk actually carries, priced live. The count in the
 * header reports the feed rather than decorating it: with nothing arriving it
 * says so instead of showing a dot that means nothing.
 *
 * The stream is opened once the page is past its own arrival, which is what the
 * count already waited on: it reads the feed rather than the clock, and the feed
 * has never answered before then.
 */
export default function LiveMarketSection({ ground = 'page' }) {
  const arrived = useArrived()
  const { quotes } = useInstrumentQuotes({ enabled: arrived })
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
              <ChartInView height={150} label={`${instrument.displaySymbol} price`}>
                {() => <LivePairChart symbol={instrument.symbol} height={150} compact />}
              </ChartInView>
            </div>
          </StaggerItem>
        ))}
      </StaggerGroup>
    </Section>
  )
}
