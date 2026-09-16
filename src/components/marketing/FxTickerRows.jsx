import { ArrowDownRight, ArrowUpRight } from 'lucide-react'
import { cn } from '../../lib/cn'
import { useInstrumentQuotes } from '../../lib/marketData/instrumentQuotes.js'
import { formatInstrumentPrice } from '../../lib/format'

function TickerItem({ quote }) {
  const positive = quote.changePct >= 0
  const Arrow = positive ? ArrowUpRight : ArrowDownRight
  return (
    <span className="flex shrink-0 items-center gap-3 px-6 py-3">
      <span className="text-sm font-medium tabular-nums text-text">{quote.displaySymbol}</span>
      <span className="text-sm tabular-nums text-text-muted">
        {formatInstrumentPrice(quote.price, quote.symbol)}
      </span>
      <span
        className={cn(
          'flex items-center gap-0.5 text-xs tabular-nums',
          positive ? 'text-positive' : 'text-danger'
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
 * The strip's live rows, and everything only they need: the quote stream, the
 * price formatter and the arrows.
 *
 * They sit apart from the strip itself because the strip is in the document the
 * build writes out and these are not. Nothing here is on screen until a read of
 * the whole registry has come back, so keeping it out of the first screen's code
 * costs a reader nothing and spares the arrival the rows, the reads and the
 * render they land on.
 *
 * @param {object} props
 * @param {React.ReactNode} props.pending - the strip stands at its full height
 *   on this until the first read lands
 */
export default function FxTickerRows({ pending }) {
  const { quotes } = useInstrumentQuotes()
  if (quotes.length === 0) return pending

  return (
    // Pausing on hover is what lets a reader hold a quote still long enough
    // to read it instead of chasing it across the screen.
    <div className="ticker-track flex w-max [@media(hover:hover)]:group-hover:[animation-play-state:paused]">
      {[0, 1].map((copy) => (
        <div
          key={copy}
          className="content-enter flex divide-x divide-border"
          aria-hidden={copy === 1}
        >
          {quotes.map((quote) => (
            <TickerItem key={`${copy}-${quote.symbol}`} quote={quote} />
          ))}
        </div>
      ))}
    </div>
  )
}
