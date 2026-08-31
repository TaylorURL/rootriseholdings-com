import { useMemo, useState } from 'react'
import { AlertTriangle, OctagonAlert, Plus } from 'lucide-react'
import Card from '../ui/Card'
import Select from '../ui/Select'
import SegmentedTabs from '../ui/SegmentedTabs'
import AuthField from '../marketing/AuthField'
import MarketingButton from '../marketing/MarketingButton'
import { TRADED_INSTRUMENTS, INSTRUMENT_META } from '../../data/instruments'
import { RISK_RULES, SETUP_TYPES, SESSIONS } from '../../data/riskRules'
import {
  TRADE_GRADES,
  deriveTradeNumbers,
  validateTradeDraft,
  suggestedSize,
} from '../../lib/journal/model.js'
import { evaluateTradeGate } from '../../lib/journal/rules.js'
import { sessionForMoment } from '../../lib/time.js'
import { useJournal } from '../../context/JournalContext'
import { cn } from '../../lib/cn'
import { formatCurrency } from '../../lib/format'

const SIDE_OPTIONS = ['BUY', 'SELL']

/** The fields whose value a departure acknowledgement is answering. */
const PRICE_FIELDS = new Set(['symbol', 'side', 'entry', 'stop', 'target', 'riskPct'])

function emptyDraft() {
  return {
    symbol: 'XAUUSD',
    side: 'BUY',
    entry: '',
    stop: '',
    target: '',
    riskPct: '1',
    size: '',
    setup: 'OTE',
    grade: 'A',
    session: sessionForMoment(new Date()) ?? 'Off-Session',
    timeframe: INSTRUMENT_META.XAUUSD.primaryTimeframe,
    note: '',
    acknowledged: [],
  }
}

function DerivedStat({ label, value, tone }) {
  return (
    <div className="bg-surface-2/40 rounded-control border border-border px-3 py-2">
      <p className="text-xs text-text-faint">{label}</p>
      <p className={cn('font-mono text-sm font-semibold tabular-nums text-text', tone)}>{value}</p>
    </div>
  )
}

/**
 * Trade entry. The derived panel recomputes on every keystroke and the same
 * gate that guards the data layer renders its verdict here, so a blocked
 * ticket is visibly blocked before submit is even possible.
 *
 * A rule the ticket departs from is a tick rather than a wall. The journal is
 * only worth reading if it holds every trade the desk actually took, so a
 * setup outside the book still gets logged - it just gets logged as one.
 */
export default function TradeForm({ onLogged }) {
  const { addTrade, equity, dayState, settings } = useJournal()
  const [draft, setDraft] = useState(emptyDraft)
  const [touched, setTouched] = useState(false)
  const [lastResult, setLastResult] = useState(null)

  const errors = useMemo(() => validateTradeDraft(draft), [draft])
  const { plannedRR, riskAmount } = useMemo(
    () => deriveTradeNumbers(draft, equity ?? 0),
    [draft, equity]
  )
  const gate = useMemo(
    () => evaluateTradeGate({ draft, plannedRR, dayState }),
    [draft, plannedRR, dayState]
  )
  const sizeHint = suggestedSize(draft, equity ?? 0, settings.pointValues[draft.symbol])

  const update = (field) => (value) => {
    setDraft((previous) => {
      const next = { ...previous, [field]: value }
      if (field === 'symbol') {
        const meta = INSTRUMENT_META[value]
        next.timeframe = meta?.primaryTimeframe ?? previous.timeframe
        if (meta?.sideConstraint === 'SHORT') next.side = 'SELL'
      }
      // A tick answers one set of numbers. Changing any of them retires it, so
      // an acknowledgement can never carry over to a ticket nobody read.
      if (PRICE_FIELDS.has(field)) next.acknowledged = []
      return next
    })
  }

  const toggleDeparture = (id) => {
    setDraft((previous) => {
      const held = previous.acknowledged ?? []
      return {
        ...previous,
        acknowledged: held.includes(id) ? held.filter((entry) => entry !== id) : [...held, id],
      }
    })
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    setTouched(true)
    if (Object.keys(errors).length > 0 || !gate.allowed) return
    const result = addTrade(draft)
    setLastResult(result)
    if (result.ok) {
      setDraft(emptyDraft())
      setTouched(false)
      onLogged?.(result.trade)
    }
  }

  const meta = INSTRUMENT_META[draft.symbol]
  const fieldError = (field) => (touched ? errors[field] : undefined)
  const hasNumbers = draft.entry && draft.stop && draft.target

  return (
    <Card
      title="New Trade"
      action={
        <span className="text-xs text-text-faint">
          {equity != null ? `Equity ${formatCurrency(equity)}` : 'Equity not set'}
        </span>
      }
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Select
            label="Instrument"
            value={draft.symbol}
            onChange={update('symbol')}
            options={TRADED_INSTRUMENTS.map((entry) => ({
              value: entry.symbol,
              label: entry.displaySymbol,
            }))}
          />
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium uppercase tracking-wide text-text-faint">
              Side
            </span>
            <SegmentedTabs
              options={SIDE_OPTIONS}
              value={draft.side}
              onChange={update('side')}
              ariaLabel="Trade side"
            />
            {fieldError('side') && <p className="text-xs text-danger">{errors.side}</p>}
          </div>
        </div>

        {meta?.sideConstraint === 'SHORT' && (
          <p className="border-warning/40 bg-[var(--ds-warning-soft)]/40 rounded-control border px-3 py-2 text-xs text-text-muted">
            {meta.displaySymbol} — {meta.note}
          </p>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <AuthField
            label="Entry"
            type="number"
            inputMode="decimal"
            step="any"
            value={draft.entry}
            onChange={(event) => update('entry')(event.target.value)}
            error={fieldError('entry')}
            required
          />
          <AuthField
            label="Stop"
            type="number"
            inputMode="decimal"
            step="any"
            value={draft.stop}
            onChange={(event) => update('stop')(event.target.value)}
            error={fieldError('stop')}
            required
          />
          <AuthField
            label="Target"
            type="number"
            inputMode="decimal"
            step="any"
            value={draft.target}
            onChange={(event) => update('target')(event.target.value)}
            error={fieldError('target')}
            required
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <AuthField
            label={`Risk % (max ${RISK_RULES.maxRiskPerTradePct}%)`}
            type="number"
            inputMode="decimal"
            step="0.05"
            value={draft.riskPct}
            onChange={(event) => update('riskPct')(event.target.value)}
            error={fieldError('riskPct')}
            required
          />
          <AuthField
            label="Size (Optional)"
            type="number"
            inputMode="decimal"
            step="any"
            placeholder={sizeHint != null ? sizeHint.toFixed(2) : undefined}
            value={draft.size}
            onChange={(event) => update('size')(event.target.value)}
            error={fieldError('size')}
          />
          <Select
            label="Timeframe"
            value={draft.timeframe ?? ''}
            onChange={update('timeframe')}
            options={['15m', '1H', '4H', 'Daily'].map((value) => ({ value, label: value }))}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Select
            label="Setup"
            value={draft.setup}
            onChange={update('setup')}
            options={SETUP_TYPES.map((entry) => ({
              value: entry.id,
              label: `${entry.id} — ${entry.longLabel}`,
            }))}
          />
          <Select
            label="Grade"
            value={draft.grade}
            onChange={update('grade')}
            options={TRADE_GRADES.map((grade) => ({ value: grade, label: grade }))}
          />
          <Select
            label="Session"
            value={draft.session}
            onChange={update('session')}
            options={[
              ...SESSIONS.map((entry) => ({ value: entry.id, label: entry.label })),
              { value: 'Off-Session', label: 'Off-Session' },
            ]}
          />
        </div>

        <AuthField
          label="Note (Optional)"
          value={draft.note}
          onChange={(event) => update('note')(event.target.value)}
          placeholder="Context for the entry"
        />

        {hasNumbers && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <DerivedStat
              label="Planned R:R"
              value={plannedRR > 0 ? `${plannedRR.toFixed(2)} : 1` : '—'}
              tone={plannedRR >= RISK_RULES.minRewardToRisk ? 'text-positive' : 'text-warning'}
            />
            <DerivedStat label="Risk" value={equity != null ? formatCurrency(riskAmount) : '—'} />
            <DerivedStat
              label="At Target"
              value={
                equity != null && plannedRR > 0
                  ? formatCurrency(riskAmount * plannedRR, { signed: true })
                  : '—'
              }
              tone="text-positive"
            />
            <DerivedStat
              label="Suggested Size"
              value={sizeHint != null ? sizeHint.toFixed(2) : 'Set point value'}
              tone={sizeHint == null ? 'text-text-faint' : undefined}
            />
          </div>
        )}

        {gate.blocks.length > 0 && (
          <ul
            className="border-danger/50 bg-[var(--ds-danger-soft)]/40 space-y-1.5 rounded-control border p-3"
            role="alert"
          >
            {gate.blocks.map((block) => (
              <li key={block} className="flex items-start gap-2 text-sm text-text">
                <OctagonAlert className="mt-0.5 h-4 w-4 shrink-0 text-danger" aria-hidden="true" />
                {block}
              </li>
            ))}
          </ul>
        )}
        {gate.blocks.length === 0 && gate.departures.length > 0 && (
          <ul className="border-warning/40 bg-[var(--ds-warning-soft)]/40 space-y-2 rounded-control border p-3">
            {gate.departures.map((departure) => {
              const ticked = (draft.acknowledged ?? []).includes(departure.id)
              return (
                <li key={departure.id}>
                  <label className="flex cursor-pointer items-start gap-2.5">
                    <input
                      type="checkbox"
                      checked={ticked}
                      onChange={() => toggleDeparture(departure.id)}
                      className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-[var(--ds-warning)]"
                    />
                    <span className="text-sm text-text">
                      <span className="font-medium">{departure.label}</span>
                      <span className="mt-0.5 block text-xs leading-relaxed text-text-muted">
                        {departure.detail}
                      </span>
                    </span>
                  </label>
                </li>
              )
            })}
          </ul>
        )}
        {gate.blocks.length === 0 && gate.warnings.length > 0 && (
          <ul className="border-warning/40 bg-[var(--ds-warning-soft)]/40 space-y-1.5 rounded-control border p-3">
            {gate.warnings.map((warning) => (
              <li key={warning} className="flex items-start gap-2 text-sm text-text">
                <AlertTriangle
                  className="mt-0.5 h-4 w-4 shrink-0 text-warning"
                  aria-hidden="true"
                />
                {warning}
              </li>
            ))}
          </ul>
        )}
        {lastResult &&
          !lastResult.ok &&
          lastResult.blocks.length > 0 &&
          gate.blocks.length === 0 && (
            <p className="text-sm text-danger" role="alert">
              {lastResult.blocks[0]}
            </p>
          )}

        <MarketingButton
          type="submit"
          size="md"
          disabled={!gate.allowed}
          className="w-full sm:w-auto"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          {gate.departures.length > 0 ? 'Log Trade Anyway' : 'Log Trade'}
        </MarketingButton>
      </form>
    </Card>
  )
}
