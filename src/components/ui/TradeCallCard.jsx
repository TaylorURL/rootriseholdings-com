import { ArrowDownRight, ArrowUpRight, MinusCircle } from 'lucide-react'
import Badge from './Badge'
import { Figure, FigureRow } from './Figures'
import { cn } from '../../lib/cn'
import { decimalsForInstrument, INSTRUMENT_META } from '../../data/instruments'
import { formatInstrumentPrice } from '../../lib/format'
import { formatCt } from '../../lib/time'

/**
 * A structure read stated as an order ticket.
 *
 * The three prices carry equal weight in the layout because a trade needs all
 * three, and the reward-to-risk sits beside them rather than under the fold:
 * it is the number that decides whether the ticket is worth writing.
 *
 * Every call shown here already cleared the desk's gate, so the card states
 * the scores it cleared on rather than warning about the ones it did not.
 */

/** What a call from the record is doing, as a badge. */
const STATUS = {
  live: { label: 'Live', variant: 'warning' },
  filled: { label: 'In Trade', variant: 'buy' },
  target: { label: 'Target', variant: 'positive' },
  stop: { label: 'Stopped', variant: 'danger' },
  expired: { label: 'Expired', variant: 'neutral' },
}

function Level({ label, value, symbol, tone }) {
  return (
    <Figure
      label={label}
      tone={tone}
      value={formatInstrumentPrice(value, symbol, decimalsForInstrument(symbol))}
    />
  )
}

/**
 * @param {object} props
 * @param {string} props.symbol
 * @param {object|null} props.call - from deriveTradeCall, or a signal off the record
 * @param {string|null} [props.standDown] - why there is no call
 * @param {string} [props.timeframe]
 * @param {string} [props.status] - a record status, drawn as a badge
 * @param {number} [props.publishedAt] - epoch ms, drawn beside the status
 * @param {boolean} [props.compact] - drop the reasons list
 */
export default function TradeCallCard({
  symbol,
  call,
  standDown,
  timeframe,
  status,
  publishedAt,
  compact = false,
}) {
  const meta = INSTRUMENT_META[symbol]
  const name = meta?.displaySymbol ?? symbol

  if (!call) {
    // The instrument is named on the card, because nine of these in a row
    // with nothing but a reason on each is nine cards nobody can tell apart.
    return (
      <div className="rounded-control border border-dashed border-border px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-sm font-semibold text-text">{name}</span>
          {timeframe && <Badge variant="neutral">{timeframe}</Badge>}
          <span className="ml-auto inline-flex items-center gap-1.5 text-xs text-text-faint">
            <MinusCircle className="h-3.5 w-3.5" aria-hidden="true" />
            No Trade
          </span>
        </div>
        <p className="mt-1.5 text-xs leading-relaxed text-text-muted">
          {standDown ?? 'The read does not describe a trade right now.'}
        </p>
      </div>
    )
  }

  const isBuy = call.side === 'BUY'
  const Arrow = isBuy ? ArrowUpRight : ArrowDownRight
  const badge = status ? STATUS[status] : null
  const reasons = call.reasons ?? []

  return (
    <div
      className={cn(
        'rounded-control border px-4 py-3',
        isBuy
          ? 'bg-[var(--ds-accent-soft)]/25 border-[var(--ds-accent-soft)]'
          : 'bg-[var(--ds-danger-soft)]/25 border-[var(--ds-danger-soft)]'
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={cn(
            'inline-flex items-center gap-1 font-mono text-base font-semibold',
            isBuy ? 'text-accent-bright' : 'text-danger'
          )}
        >
          <Arrow className="h-4 w-4" aria-hidden="true" />
          {call.side} {name}
        </span>
        <Badge variant="neutral">{call.grade}</Badge>
        <Badge variant="neutral">{call.setup}</Badge>
        {call.continuation != null && (
          <Badge variant="neutral">
            {Math.round(call.continuation)} / {Math.round(call.reversalRisk)}
          </Badge>
        )}
        {badge && <Badge variant={badge.variant}>{badge.label}</Badge>}
        <span className="ml-auto text-xs text-text-faint">
          {publishedAt ? `${formatCt(publishedAt)} CT` : timeframe}
          {publishedAt && timeframe ? ` · ${timeframe}` : ''}
        </span>
      </div>

      <FigureRow className="mt-3" min="5.25rem">
        <Level label="Entry" value={call.entry} symbol={symbol} />
        <Level label="Stop" value={call.stop} symbol={symbol} tone="text-danger" />
        <Level label="Target" value={call.target} symbol={symbol} tone="text-positive" />
        <Figure label="R:R" value={`${call.rewardToRisk.toFixed(2)}R`} tone="text-positive" />
      </FigureRow>

      {call.target2 != null && (
        <p className="mt-2 font-mono text-[11px] tabular-nums text-text-faint">
          Runners {formatInstrumentPrice(call.target2, symbol, decimalsForInstrument(symbol))} and{' '}
          {formatInstrumentPrice(call.target3, symbol, decimalsForInstrument(symbol))}
        </p>
      )}

      {!compact && reasons.length > 0 && (
        <ul className="mt-3 space-y-1 border-t border-border pt-3">
          {reasons.map((reason) => (
            <li key={reason} className="text-xs leading-relaxed text-text-muted">
              {reason}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
