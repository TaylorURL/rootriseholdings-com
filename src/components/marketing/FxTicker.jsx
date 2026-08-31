import { ArrowDownRight, ArrowUpRight } from 'lucide-react'
import { cn } from '../../lib/cn'
import { useInstrumentQuotes } from '../../lib/marketData/instrumentQuotes.js'
import { formatInstrumentPrice } from '../../lib/format'
import { Skeleton, SkeletonRegion } from '../ui/Skeleton'

/** How many placeholder quotes stand in for the strip before any arrive. */
const PENDING_ITEMS = 8

function TickerItem({ quote }) {
  const positive = quote.changePct >= 0
  const Arrow = positive ? ArrowUpRight : ArrowDownRight
  return (
    <span className="flex shrink-0 items-center gap-3 px-6 py-3">
      <span className="font-mono text-sm font-medium text-text">{quote.displaySymbol}</span>
      <span className="font-mono text-sm tabular-nums text-text-muted">
        {formatInstrumentPrice(quote.price, quote.symbol)}
      </span>
      <span
        className={cn(
          'flex items-center gap-0.5 font-mono text-xs tabular-nums',
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
 * One pending quote, built to the same padding and line box as TickerItem so the
 * strip stands at its full height before the first read lands. An empty strip
 * collapses to its two borders and pushes the page down by its own height the
 * moment quotes arrive.
 */
function PendingItem() {
  return (
    <span className="flex shrink-0 items-center gap-3 px-6 py-3">
      <Skeleton className="h-5 w-16 rounded-sm" />
      <Skeleton className="h-5 w-20 rounded-sm" />
      <Skeleton className="h-5 w-12 rounded-sm" />
    </span>
  )
}

/**
 * Edge-to-edge live instrument marquee across the desk's traded and watch sets,
 * reading the shared quote stream.
 *
 * The track is duplicated so the CSS scroll never shows a seam at the loop
 * point; reduced-motion readers get the same strip standing still.
 *
 * @param {object} props
 * @param {string} [props.className]
 */
export default function FxTicker({ className }) {
  const { quotes } = useInstrumentQuotes()
  const pending = quotes.length === 0

  return (
    <div
      className={cn(
        'marquee-fade-x group relative flex overflow-hidden border-y border-border bg-bg-elevated',
        className
      )}
      aria-label="Live instrument rates"
    >
      {pending ? (
        <SkeletonRegion label="Loading live rates" className="flex w-max">
          <div className="flex divide-x divide-border">
            {Array.from({ length: PENDING_ITEMS }, (_, index) => (
              <PendingItem key={index} />
            ))}
          </div>
        </SkeletonRegion>
      ) : (
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
      )}
    </div>
  )
}
