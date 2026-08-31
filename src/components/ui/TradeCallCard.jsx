import { ArrowDownRight, ArrowUpRight, MinusCircle } from 'lucide-react'
import Badge from './Badge'
import { Figure, FigureRow } from './Figures'
import { cn } from '../../lib/cn'
import { decimalsForInstrument, INSTRUMENT_META } from '../../data/instruments'
import { formatInstrumentPrice } from '../../lib/format'

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
 * @param {object|null} props.call - from deriveTradeCall
 * @param {string|null} [props.standDown] - why there is no call
 * @param {string} [props.timeframe]
 * @param {boolean} [props.compact] - drop the reasons list
 */
export default function TradeCallCard({ symbol, call, standDown, timeframe, compact = false }) {
  const meta = INSTRUMENT_META[symbol]

  if (!call) {
    return (
      <div className="rounded-control border border-dashed border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <MinusCircle className="h-4 w-4 text-text-faint" aria-hidden="true" />
          <span className="text-sm font-medium text-text">No Trade</span>
        </div>
        <p className="mt-1.5 text-xs leading-relaxed text-text-muted">
          {standDown ?? 'The read does not describe a trade right now.'}
        </p>
      </div>
    )
  }

  const isBuy = call.side === 'BUY'
  const Arrow = isBuy ? ArrowUpRight : ArrowDownRight

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
          {call.side} {meta?.displaySymbol ?? symbol}
        </span>
        <Badge variant="neutral">{call.grade}</Badge>
        <Badge variant="neutral">{call.setup}</Badge>
        {call.continuation != null && (
          <Badge variant="neutral">
            {Math.round(call.continuation)} / {Math.round(call.reversalRisk)}
          </Badge>
        )}
        {timeframe && <span className="ml-auto text-xs text-text-faint">{timeframe}</span>}
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

      {!compact && call.reasons.length > 0 && (
        <ul className="mt-3 space-y-1 border-t border-border pt-3">
          {call.reasons.map((reason) => (
            <li key={reason} className="text-xs leading-relaxed text-text-muted">
              {reason}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
