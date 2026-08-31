import { useId, useState } from 'react'
import { Check, Trash2, X } from 'lucide-react'
import Badge from '../ui/Badge'
import { INSTRUMENT_META } from '../../data/instruments'
import { computeRealisedR } from '../../data/riskRules'
import { useJournal } from '../../context/JournalContext'
import { cn } from '../../lib/cn'
import { formatCt } from '../../lib/time.js'
import { formatCurrency, formatInstrumentPrice, formatR, signedColor } from '../../lib/format'

function LevelPill({ label, value, tone }) {
  return (
    <span className="bg-surface-2/60 inline-flex items-center gap-1.5 rounded-control border border-border px-2 py-1 text-xs">
      <span className="text-text-faint">{label}</span>
      <span className={cn('font-mono tabular-nums', tone)}>{value}</span>
    </span>
  )
}

/**
 * One open journal position. Closing happens inline: type the exit, see the
 * realized R and dollars it would book, then confirm — the preview uses the
 * same math that will be stored.
 */
export default function OpenTradeCard({ trade }) {
  const { closeTrade, deleteTrade } = useJournal()
  const [closing, setClosing] = useState(false)
  const [exitPrice, setExitPrice] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const exitId = useId()

  const meta = INSTRUMENT_META[trade.symbol]
  const displaySymbol = meta?.displaySymbol ?? trade.symbol

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
              className="press focus-ring inline-flex items-center gap-1 rounded-control border border-border bg-surface-2 px-2.5 py-1.5 text-xs font-medium text-text-muted transition-colors hover:border-border-hover hover:text-text"
            >
              <Check className="h-3.5 w-3.5" aria-hidden="true" />
              Close
            </button>
          )}
          {confirmDelete ? (
            <span className="inline-flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => deleteTrade(trade.id)}
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
              aria-label={`Delete trade ${trade.id}`}
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

      <div className="flex flex-wrap items-center gap-2">
        <LevelPill
          label="Entry"
          value={formatInstrumentPrice(trade.entry, trade.symbol)}
          tone="text-text"
        />
        <LevelPill
          label="SL"
          value={formatInstrumentPrice(trade.stop, trade.symbol)}
          tone="text-danger"
        />
        <LevelPill
          label="TP"
          value={formatInstrumentPrice(trade.target, trade.symbol)}
          tone="text-positive"
        />
        <LevelPill label="R:R" value={trade.plannedRR.toFixed(2)} tone="text-text" />
        <LevelPill
          label="Risk"
          value={`${trade.riskPct.toFixed(2)}% · ${formatCurrency(trade.riskAmount)}`}
          tone="text-text"
        />
      </div>

      {trade.note && <p className="text-xs leading-relaxed text-text-muted">{trade.note}</p>}

      {closing && (
        <form
          onSubmit={submitClose}
          className="flex flex-wrap items-end gap-3 border-t border-border pt-4"
        >
          <div className="flex min-w-40 flex-1 flex-col gap-1.5">
            <label
              htmlFor={exitId}
              className="text-xs font-medium uppercase tracking-wide text-text-faint"
            >
              Exit Price
            </label>
            <input
              id={exitId}
              type="number"
              inputMode="decimal"
              step="any"
              value={exitPrice}
              onChange={(event) => setExitPrice(event.target.value)}
              autoFocus
              className="focus-ring border-border-input h-10 w-full rounded-control border bg-surface-2 px-3 font-mono text-base text-text shadow-[var(--ds-field-inset)] outline-none transition-colors focus:border-accent-bright sm:text-sm"
            />
          </div>
          {previewR != null && (
            <div className="pb-1">
              <p className="text-xs text-text-faint">Books</p>
              <p
                className={cn(
                  'font-mono text-sm font-semibold tabular-nums',
                  signedColor(previewR)
                )}
              >
                {formatR(previewR)} ·{' '}
                {formatCurrency(previewR * trade.riskAmount, { signed: true })}
              </p>
            </div>
          )}
          <div className="ml-auto flex items-center gap-2 pb-0.5">
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
        </form>
      )}
    </div>
  )
}
