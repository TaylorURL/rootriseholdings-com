import { useMemo, useRef, useState } from 'react'
import { AlertTriangle, CheckCircle2, OctagonAlert, Plus } from 'lucide-react'
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
import { formatCurrency, formatInstrumentPrice, NO_VALUE } from '../../lib/format'

const SIDE_OPTIONS = ['BUY', 'SELL']

/** The fields whose value a departure acknowledgement is answering. */
const PRICE_FIELDS = new Set(['symbol', 'side', 'entry', 'stop', 'target', 'riskPct'])

/** The fields that hold a number, typed as text so a scroll wheel cannot move them. */
const NUMERIC_FIELDS = new Set(['entry', 'stop', 'target', 'riskPct', 'size'])

/** The heading each instrument sits under in the menu. */
const GROUP_LABELS = { Commodity: 'Commodities', Index: 'Indices', FX: 'FX', Crypto: 'Crypto' }

const INSTRUMENT_OPTIONS = TRADED_INSTRUMENTS.map((entry) => ({
  value: entry.symbol,
  label: entry.displaySymbol,
  group: entry.isPrimary ? 'Primary' : (GROUP_LABELS[entry.category] ?? entry.category),
}))

const SETUP_OPTIONS = SETUP_TYPES.map((entry) => ({ value: entry.id, label: entry.id }))
const TIMEFRAME_OPTIONS = ['15m', '1H', '4H', 'Daily'].map((value) => ({ value, label: value }))
const GRADE_OPTIONS = TRADE_GRADES.map((grade) => ({ value: grade, label: grade }))
const SESSION_OPTIONS = [
  ...SESSIONS.map((entry) => ({ value: entry.id, label: entry.label })),
  { value: 'Off-Session', label: 'Off-Session' },
]

const LABEL = 'mb-1.5 block text-[13px] font-medium text-text'

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

/** A number as typed, with the thousands separators a price is often read with taken out. */
function cleanNumber(value) {
  return value.replace(/[,\s]/g, '')
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
 *
 * The prices are typed into text fields rather than number fields. A number
 * field answers the scroll wheel while it has focus, and a page scrolled with
 * the entry still focused moves the price without a keystroke, which on a
 * ticket is the one thing a control must not do.
 */
export default function TradeForm({ onLogged }) {
  const { addTrade, equity, dayState, settings } = useJournal()
  const [draft, setDraft] = useState(emptyDraft)
  const [touched, setTouched] = useState(false)
  const [lastResult, setLastResult] = useState(null)
  const [logged, setLogged] = useState(null)
  const formRef = useRef(null)

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

  const update = (field) => (raw) => {
    const value = NUMERIC_FIELDS.has(field) ? cleanNumber(raw) : raw
    setLogged(null)
    setDraft((previous) => {
      const next = { ...previous, [field]: value }
      if (field === 'symbol') {
        const meta = INSTRUMENT_META[value]
        next.timeframe = meta?.primaryTimeframe ?? previous.timeframe
        // A restricted instrument answers the side question itself, so the
        // form does not offer a ticket the validator is about to refuse.
        if (meta?.sideConstraint === 'SHORT') next.side = 'SELL'
        else if (meta?.sideConstraint === 'LONG') next.side = 'BUY'
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
    setLogged(null)
    if (Object.keys(errors).length > 0 || !gate.allowed) {
      // The message sits beside its field; focus goes there too, so a reader
      // who pressed Log at the foot of the form is taken to what stopped it.
      requestAnimationFrame(() => {
        formRef.current?.querySelector('[aria-invalid="true"]')?.focus()
      })
      return
    }
    const result = addTrade(draft)
    setLastResult(result)
    if (result.ok) {
      setDraft(emptyDraft())
      setTouched(false)
      setLogged({ trade: result.trade, warnings: result.warnings ?? [] })
      onLogged?.(result.trade)
    }
  }

  const meta = INSTRUMENT_META[draft.symbol]
  const setupMeta = SETUP_TYPES.find((entry) => entry.id === draft.setup)
  const fieldError = (field) => (touched ? errors[field] : undefined)
  const hasNumbers = draft.entry && draft.stop && draft.target
  const numeric = { type: 'text', inputMode: 'decimal', autoComplete: 'off', spellCheck: false }

  return (
    <Card
      title="New Trade"
      action={
        <span className="text-xs text-text-faint">
          {equity != null ? `Equity ${formatCurrency(equity)}` : 'Equity not set'}
        </span>
      }
    >
      <form ref={formRef} onSubmit={handleSubmit} noValidate className="space-y-2">
        <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
          <Select
            label="Instrument"
            value={draft.symbol}
            onChange={update('symbol')}
            options={INSTRUMENT_OPTIONS}
            hint={meta?.sideConstraint ? meta.note : undefined}
          />
          <div>
            <span id="trade-side-label" className={LABEL}>
              Side
            </span>
            <SegmentedTabs
              kind="choice"
              options={SIDE_OPTIONS}
              value={draft.side}
              onChange={update('side')}
              ariaLabel="Side"
              className="h-10 w-full"
            />
            <p className="min-h-4 pt-1 text-xs text-danger" role="alert">
              {fieldError('side') ?? ''}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-x-3 sm:gap-x-4">
          <AuthField
            label="Entry"
            {...numeric}
            value={draft.entry}
            onChange={(event) => update('entry')(event.target.value)}
            error={fieldError('entry')}
            required
          />
          <AuthField
            label="Stop"
            {...numeric}
            value={draft.stop}
            onChange={(event) => update('stop')(event.target.value)}
            error={fieldError('stop')}
            required
          />
          <AuthField
            label="Target"
            {...numeric}
            value={draft.target}
            onChange={(event) => update('target')(event.target.value)}
            error={fieldError('target')}
            required
          />
        </div>

        <div className="grid grid-cols-3 gap-x-3 sm:gap-x-4">
          <AuthField
            label={`Risk % (Max ${RISK_RULES.maxRiskPerTradePct}%)`}
            {...numeric}
            value={draft.riskPct}
            onChange={(event) => update('riskPct')(event.target.value)}
            error={fieldError('riskPct')}
            required
          />
          <AuthField
            label="Size (Optional)"
            {...numeric}
            placeholder={sizeHint != null ? sizeHint.toFixed(2) : undefined}
            value={draft.size}
            onChange={(event) => update('size')(event.target.value)}
            error={fieldError('size')}
          />
          <Select
            label="Timeframe"
            value={draft.timeframe ?? ''}
            onChange={update('timeframe')}
            options={TIMEFRAME_OPTIONS}
          />
        </div>

        <div className="grid grid-cols-2 gap-x-3 sm:grid-cols-3 sm:gap-x-4">
          <Select
            label="Setup"
            value={draft.setup}
            onChange={update('setup')}
            options={SETUP_OPTIONS}
            hint={setupMeta?.longLabel}
          />
          <Select
            label="Grade"
            value={draft.grade}
            onChange={update('grade')}
            options={GRADE_OPTIONS}
          />
          <Select
            label="Session"
            value={draft.session}
            onChange={update('session')}
            options={SESSION_OPTIONS}
            className="col-span-2 sm:col-span-1"
          />
        </div>

        <AuthField
          label="Note (Optional)"
          value={draft.note}
          onChange={(event) => update('note')(event.target.value)}
          placeholder="Context for the entry"
        />

        {hasNumbers && (
          <div className="grid grid-cols-2 gap-3 pt-2 sm:grid-cols-4">
            <DerivedStat
              label="Planned R:R"
              value={plannedRR > 0 ? `${plannedRR.toFixed(2)} : 1` : NO_VALUE}
              tone={plannedRR >= RISK_RULES.minRewardToRisk ? 'text-positive' : 'text-warning'}
            />
            <DerivedStat
              label="Risk"
              value={equity != null ? formatCurrency(riskAmount) : NO_VALUE}
            />
            <DerivedStat
              label="At Target"
              value={
                equity != null && plannedRR > 0
                  ? formatCurrency(riskAmount * plannedRR, { signed: true })
                  : NO_VALUE
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
            className="border-danger/50 bg-[var(--ds-danger-soft)]/40 mt-2 space-y-1.5 rounded-control border p-3"
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
          <ul className="border-warning/40 bg-[var(--ds-warning-soft)]/40 mt-2 space-y-2 rounded-control border p-3">
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
        {/* A warning is about this ticket, so it waits for the ticket to have
            numbers. Shown against an empty form it is on screen every time the
            form is, and a warning that is always there is one nobody reads. */}
        {hasNumbers && gate.blocks.length === 0 && gate.warnings.length > 0 && (
          <ul className="border-warning/40 bg-[var(--ds-warning-soft)]/40 mt-2 space-y-1.5 rounded-control border p-3">
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

        {/* The ticket that just landed, said where the form is, because on a
            narrow screen the book it landed on is a screen further down. */}
        {logged && (
          <p
            role="status"
            className="mt-2 flex items-start gap-2 rounded-control bg-[var(--ds-positive-soft)] px-3 py-2.5 text-sm text-text"
          >
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-positive" aria-hidden="true" />
            <span>
              Logged the{' '}
              {INSTRUMENT_META[logged.trade.symbol]?.displaySymbol ?? logged.trade.symbol}{' '}
              {logged.trade.side === 'BUY' ? 'long' : 'short'} at{' '}
              {formatInstrumentPrice(logged.trade.entry, logged.trade.symbol)}. It is on the book.
              {logged.warnings.map((warning) => ` ${warning}`).join('')}{' '}
              <a
                href="#on-the-book"
                className="focus-ring rounded-sm font-medium text-accent underline decoration-from-font underline-offset-2 xl:hidden"
              >
                View
              </a>
            </span>
          </p>
        )}

        <div className="pt-3">
          <MarketingButton
            type="submit"
            size="md"
            disabled={!gate.allowed}
            className="w-full sm:w-auto"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            {gate.departures.length > 0 ? 'Log Trade Anyway' : 'Log Trade'}
          </MarketingButton>
        </div>
      </form>
    </Card>
  )
}
