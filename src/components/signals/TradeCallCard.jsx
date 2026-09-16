import { ArrowDownRight, ArrowUpRight, MinusCircle } from 'lucide-react'
import Badge from '../ui/Badge'
import { Figure, FigureRow, RULE_LABEL } from '../ui/Figures'
import { cn } from '../../lib/cn'
import { decimalsForInstrument, INSTRUMENT_META } from '../../data/instruments'
import { SETUP_NAMES } from '../../data/riskRules'
import { formatInstrumentPrice } from '../../lib/format'
import { formatCt } from '../../lib/time'

/**
 * A structure read stated as an order ticket.
 *
 * One number decides whether a reader acts in the next thirty seconds, and it
 * is the entry: the side, the instrument and the price a trade is taken at are
 * the whole of the first glance, so they share the top line at display size and
 * everything else is drawn under them. The stop, the target and the
 * reward-to-risk are what the ticket is written from and sit together beneath,
 * still tabular and still aligned, because they are read against each other.
 *
 * Every call shown here already cleared the desk's gate, so the card states
 * the scores it cleared on rather than warning about the ones it did not - and
 * it states them with the words they mean. A pair of numbers with a slash
 * between them is a note the desk left itself, not a reading.
 */

/** What a call from the record is doing, as a badge. */
const STATUS = {
  live: { label: 'Live', variant: 'warning' },
  filled: { label: 'In Trade', variant: 'buy' },
  target: { label: 'Target', variant: 'positive' },
  stop: { label: 'Stopped', variant: 'danger' },
  expired: { label: 'Expired', variant: 'neutral' },
}

function Level({ label, value, symbol, tone, title }) {
  return (
    <Figure
      label={label}
      title={title}
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
          <span className="text-sm font-semibold tabular-nums text-text">{name}</span>
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
  const setupName = SETUP_NAMES[call.setup]

  return (
    <div
      className={cn(
        'rounded-control border px-4 py-3',
        isBuy
          ? 'bg-[var(--ds-accent-soft)]/25 border-[var(--ds-accent-soft)]'
          : 'bg-[var(--ds-danger-soft)]/25 border-[var(--ds-danger-soft)]'
      )}
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span
          className={cn(
            'inline-flex items-center gap-1 text-base font-semibold tabular-nums',
            isBuy ? 'text-accent-bright' : 'text-danger'
          )}
        >
          <Arrow className="h-4 w-4" aria-hidden="true" />
          {call.side} {name}
        </span>
        <span className="inline-flex items-baseline gap-1.5">
          <span className={RULE_LABEL}>Entry</span>
          <span className="text-xl font-semibold tabular-nums leading-none text-text">
            {formatInstrumentPrice(call.entry, symbol, decimalsForInstrument(symbol))}
          </span>
        </span>
        <span className="ml-auto whitespace-nowrap text-xs text-text-faint">
          {publishedAt ? `${formatCt(publishedAt)} CT` : timeframe}
          {publishedAt && timeframe ? ` · ${timeframe}` : ''}
        </span>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Badge variant="accent" title="The grade this setup cleared the desk's gate at">
          {call.grade}
        </Badge>
        {/* The long name at every width, not from `sm` up. The reader this card
            was rewritten for reports problems by text message, which is to say
            he is holding a phone, and a phone was the one place the setup stayed
            a three-letter code. `title` is a desktop extra and can never be the
            only thing carrying a word. */}
        <Badge variant="neutral">{setupName ? `${call.setup} · ${setupName}` : call.setup}</Badge>
        {badge && <Badge variant={badge.variant}>{badge.label}</Badge>}
      </div>

      {/* Three figures rather than four: the scores are named in words on the
          line beneath instead, because a fourth column narrow enough to fit a
          card in a rail is too narrow to hold the word 'Continuation'. */}
      <FigureRow className="mt-3" min="5.25rem">
        <Level label="Stop" value={call.stop} symbol={symbol} tone="text-danger" />
        <Level label="Target" value={call.target} symbol={symbol} tone="text-positive" />
        <Figure
          label="R:R"
          note="Reward to risk"
          value={`${call.rewardToRisk.toFixed(2)}R`}
          tone="text-positive"
        />
      </FigureRow>

      {call.continuation != null && (
        <p className="mt-2 text-xs tabular-nums text-text-faint">
          Continuation {Math.round(call.continuation)}, reversal risk{' '}
          {Math.round(call.reversalRisk)}
        </p>
      )}

      {call.target2 != null && (
        <p className="mt-1 text-xs tabular-nums text-text-faint">
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
