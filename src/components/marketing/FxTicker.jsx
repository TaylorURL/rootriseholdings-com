import { ArrowDownRight, ArrowUpRight } from 'lucide-react'
import { cn } from '../../lib/cn'
import { useInstrumentQuotes } from '../../data/instruments'
import { formatInstrumentPrice } from '../../lib/format'

/** One ticker cell: instrument, live price, signed change. */
function TickerItem({ quote }) {
  const positive = quote.changePct >= 0
  const Arrow = positive ? ArrowUpRight : ArrowDownRight
  return (
    <span className="flex shrink-0 items-center gap-3 px-6 py-3">
      <span className="font-mono text-sm font-medium text-text">{quote.displaySymbol}</span>
      <span className="font-mono text-sm tabular-nums text-text-muted">
        {formatInstrumentPrice(quote.bid, quote.symbol)}
      </span>
      <span
        className={cn(
          'flex items-center gap-0.5 font-mono text-xs tabular-nums',
          positive ? 'text-positive' : 'text-danger',
        )}
      >
        <Arrow className="h-3 w-3" aria-hidden="true" />
        {positive ? '+' : ''}
        {quote.changePct.toFixed(2)}%
      </span>
    </span>
  )
}

/**
 * Edge-to-edge live instrument marquee across the desk's traded + watch set.
 * Pulls quotes from the swappable simulated data layer and loops seamlessly.
 * The track is duplicated so the CSS scroll never shows a seam; reduced-motion
 * users get a static, scrollable strip.
 *
 * @param {object} props
 * @param {string} [props.className]
 */
export default function FxTicker({ className }) {
  const { quotes } = useInstrumentQuotes()

  return (
    <div
      className={cn(
        'relative flex overflow-hidden border-y border-border bg-bg-elevated/60',
        '[mask-image:linear-gradient(to_right,transparent,#000_8%,#000_92%,transparent)]',
        className,
      )}
      aria-label="Live instrument rates"
    >
      <div className="ticker-track flex w-max">
        {[0, 1].map((copy) => (
          <div key={copy} className="flex divide-x divide-border" aria-hidden={copy === 1}>
            {quotes.map((quote) => (
              <TickerItem key={`${copy}-${quote.symbol}`} quote={quote} />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
