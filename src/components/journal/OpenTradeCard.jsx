import { useId, useState } from 'react'
import { Check, Trash2, X } from 'lucide-react'
import Badge from '../ui/Badge'
import { Figure, FigureRow } from '../ui/Figures'
import { INSTRUMENT_META } from '../../data/instruments'
import { computeRealisedR } from '../../data/riskRules'
import { useJournal } from '../../context/JournalContext'
import { cn } from '../../lib/cn'
import { formatCt } from '../../lib/time.js'
import { formatCurrency, formatInstrumentPrice, formatR, signedColor } from '../../lib/format'

const SMALL_BUTTON =
  'press focus-ring rounded-control border border-border bg-surface-2 px-2.5 py-1.5 text-xs font-medium text-text-muted transition-colors hover:border-border-hover hover:text-text'

/**
 * One open journal position. Closing happens inline: type the exit, or take
 * the target or the stop in one press since those are how most trades end,
 * see the realized R and dollars it would book, then confirm. The preview
 * uses the same math that will be stored.
 *
 * @param {object} props
 * @param {object} props.trade
 * @param {(trade: object) => void} [props.onDeleted] - told after a delete, so
 *   the page can offer the trade back
 */
export default function OpenTradeCard({ trade, onDeleted }) {
  const { closeTrade, deleteTrade } = useJournal()
  const [closing, setClosing] = useState(false)
  const [exitPrice, setExitPrice] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const exitId = useId()

  const meta = INSTRUMENT_META[trade.symbol]
  const displaySymbol = meta?.displaySymbol ?? trade.symbol
  const sideWord = trade.side === 'BUY' ? 'long' : 'short'
  const price = (value) => formatInstrumentPrice(value, trade.symbol)

  const exitValue = Number(exitPrice)
  const previewR =
    Number.isFinite(exitValue) && exitPrice !== ''
      ? computeRealisedR({
          entry: trade.entry,
          stop: trade.stop,
          exit: exitValue,
          side: trade.side,
        })
      : null

  const submitClose = (event) => {
    event.preventDefault()
    if (previewR == null) return
    closeTrade(trade.id, exitValue)
  }

  const remove = () => {
    deleteTrade(trade.id)
    setConfirmDelete(false)
    onDeleted?.(trade)
  }

  return (
    <div className="flex flex-col gap-4 rounded-card border border-border bg-surface p-5 shadow-sm transition-colors hover:border-border-hover">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="font-mono text-base font-semibold text-text">{displaySymbol}</span>
          <Badge variant={trade.side === 'BUY' ? 'buy' : 'sell'}>{trade.side}</Badge>
          {trade.grade === 'A+' && (
            <span className="rounded-control bg-[var(--ds-accent-soft)] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-accent-bright">
              A+
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!closing && (
            <button
              type="button"
              onClick={() => setClosing(true)}
              className={cn(SMALL_BUTTON, 'inline-flex items-center gap-1')}
            >
              <Check className="h-3.5 w-3.5" aria-hidden="true" />
              Close
            </button>
          )}
          {confirmDelete ? (
            <span className="inline-flex items-center gap-1.5">
              <button
                type="button"
                onClick={remove}
                className="press focus-ring border-danger/50 rounded-control border bg-[var(--ds-danger-soft)] px-2 py-1.5 text-xs font-medium text-danger transition-colors hover:border-danger"
              >
                Delete
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                aria-label="Keep the trade"
                className="press focus-ring rounded-control border border-border bg-surface-2 p-1.5 text-text-muted transition-colors hover:text-text"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              aria-label={`Delete the ${displaySymbol} ${sideWord}`}
              className="press focus-ring rounded-control border border-border bg-surface-2 p-1.5 text-text-muted transition-colors hover:text-danger"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
        <span className="rounded-control bg-surface-2 px-1.5 py-0.5 font-mono uppercase tracking-wide text-text-muted">
          {trade.setup}
        </span>
        {trade.timeframe && (
          <span className="rounded-control bg-surface-2 px-1.5 py-0.5 font-mono uppercase tracking-wide text-text-muted">
            {trade.timeframe}
          </span>
        )}
        <span className="rounded-control bg-surface-2 px-1.5 py-0.5 uppercase tracking-wide text-text-faint">
          {trade.session}
        </span>
        <span className="ml-auto font-mono text-text-faint">{formatCt(trade.openedAt)} CT</span>
      </div>

      {/* The same five readings the call card draws, in the same words and the
          same order. A trade moving from the record to the book should not
          change vocabulary on the way. */}
      <FigureRow min="6rem">
        <Figure label="Entry" value={price(trade.entry)} />
        <Figure label="Stop" value={price(trade.stop)} tone="text-danger" />
        <Figure label="Target" value={price(trade.target)} tone="text-positive" />
        <Figure label="R:R" note="Reward to risk" value={trade.plannedRR.toFixed(2)} />
        <Figure
          label="Risk"
          value={`${trade.riskPct.toFixed(2)}%`}
          note={formatCurrency(trade.riskAmount)}
        />
      </FigureRow>

      {trade.note && <p className="text-xs leading-relaxed text-text-muted">{trade.note}</p>}

      {closing && (
        <form onSubmit={submitClose} className="space-y-3 border-t border-border pt-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-40 flex-1">
              <label htmlFor={exitId} className="mb-1.5 block text-[13px] font-medium text-text">
                Exit Price
              </label>
              <input
                id={exitId}
                type="text"
                inputMode="decimal"
                autoComplete="off"
                spellCheck={false}
                value={exitPrice}
                onChange={(event) => setExitPrice(event.target.value.replace(/[,\s]/g, ''))}
                autoFocus
                className="field font-mono"
              />
            </div>
            <div className="flex items-center gap-1.5 pb-0.5">
              <button
                type="button"
                onClick={() => setExitPrice(String(trade.target))}
                className={SMALL_BUTTON}
              >
                At Target
              </button>
              <button
                type="button"
                onClick={() => setExitPrice(String(trade.stop))}
                className={SMALL_BUTTON}
              >
                At Stop
              </button>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-xs text-text-faint" aria-live="polite">
              {previewR != null ? (
                <>
                  Books{' '}
                  <span
                    className={cn(
                      'font-mono text-sm font-semibold tabular-nums',
                      signedColor(previewR)
                    )}
                  >
                    {formatR(previewR)} ·{' '}
                    {formatCurrency(previewR * trade.riskAmount, { signed: true })}
                  </span>
                </>
              ) : (
                'Type the exit, or take the target or the stop.'
              )}
            </p>
            <div className="ml-auto flex items-center gap-2">
              <button
                type="submit"
                disabled={previewR == null}
                className="press focus-ring btn-accent rounded-control px-3 py-2 text-xs font-semibold text-on-accent disabled:opacity-50"
              >
                Confirm Close
              </button>
              <button
                type="button"
                onClick={() => {
                  setClosing(false)
                  setExitPrice('')
                }}
                className="press focus-ring rounded-control border border-border bg-surface-2 px-3 py-2 text-xs font-medium text-text-muted transition-colors hover:text-text"
              >
                Cancel
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  )
}
