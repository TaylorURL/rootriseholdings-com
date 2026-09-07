import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { CHART_CREDIT } from '../lib/copy/brand'
import {
  ChevronDown,
  ChevronUp,
  Download,
  OctagonAlert,
  Save,
  ShieldAlert,
  Trash2,
  Undo2,
  Upload,
} from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import { RuleLabel } from '../components/ui/Figures'
import Select from '../components/ui/Select'
import { useJournal } from '../context/JournalContext'
import { useAuth } from '../context/AuthContext'
import { RISK_RULES_DESCRIPTIONS } from '../data/riskRules'
import { INSTRUMENTS, TRADED_INSTRUMENTS } from '../data/instruments'
import { closedTrades } from '../lib/journal/stats.js'
import { parseJournal, serializeJournal } from '../lib/journal/store.js'
import { formatCurrency } from '../lib/format'
import { ctDateKey, formatCt } from '../lib/time.js'
import { useInstrumentQuotes } from '../lib/marketData/instrumentQuotes.js'
import { cn } from '../lib/cn'

/**
 * Labelled field wrapper. The label is bound with htmlFor rather than by
 * wrapping, so the association survives whatever control the caller passes.
 *
 * The slot under the control holds its height whether it carries an error, a
 * hint or nothing, so a form never jumps as it is validated. A field with an
 * error renders the message beside its cause with role=alert, and hands the
 * control the aria attributes that announce it - the caller spreads them onto
 * whatever it renders. `name` marks the control so a failed submit can move
 * focus to the first invalid field.
 *
 * @param {object} props
 * @param {string} props.label
 * @param {boolean} [props.required] - marks the label and the control
 * @param {string|null} [props.error] - what is wrong and what to do about it
 * @param {string} [props.hint] - what the field is for, shown until an error replaces it
 * @param {string} [props.name] - stamped on the control as data-field
 * @param {(id: string, aria: object) => React.ReactNode} props.children - render-prop
 *   given the control id and the aria attributes to spread
 */
function Field({ label, required = false, error = null, hint, name, children }) {
  const id = useId()
  const messageId = `${id}-message`
  const aria = {
    'data-field': name,
    'aria-required': required || undefined,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': error || hint ? messageId : undefined,
  }
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-[13px] font-medium text-text">
        {label}
        {required && (
          <span aria-hidden="true" className="ml-1 text-accent-bright">
            *
          </span>
        )}
      </label>
      {children(id, aria)}
      <p
        id={messageId}
        role={error ? 'alert' : undefined}
        className={cn(
          'flex min-h-4 items-start gap-1.5 pt-1 text-xs leading-relaxed',
          error ? 'text-danger' : 'text-text-faint'
        )}
      >
        {error ? (
          <>
            <OctagonAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {error}
          </>
        ) : (
          (hint ?? '')
        )}
      </p>
    </div>
  )
}

/** Moves focus to the first control a failed submit marked invalid. */
function focusFirstInvalid(form) {
  requestAnimationFrame(() => {
    form?.querySelector('[aria-invalid="true"]')?.focus()
  })
}

const INPUT_CLASS = 'field font-mono'

/**
 * A number is typed into a text field. A number field answers the scroll
 * wheel while it has focus, and a page scrolled with a balance still focused
 * moves the balance without a keystroke.
 */
const NUMERIC = { type: 'text', inputMode: 'decimal', autoComplete: 'off', spellCheck: false }

const PRIMARY_BUTTON =
  'press focus-ring btn-accent inline-flex items-center gap-2 rounded-control px-4 py-2 text-sm font-semibold text-on-accent'
const SECONDARY_BUTTON =
  'press focus-ring inline-flex items-center gap-2 rounded-control border border-border bg-surface-2 px-4 py-2 text-sm font-medium text-text transition-colors hover:border-border-hover'
const SMALL_BUTTON =
  'press focus-ring rounded-control border border-border bg-surface-2 px-2 py-1 text-xs font-medium text-text-muted transition-colors hover:text-text'

const EQUITY_ERROR = 'Enter a starting equity above zero.'

function EquityCard() {
  const { settings, equity, updateSettings, trades } = useJournal()
  const { hash } = useLocation()
  const [value, setValue] = useState(settings.startingEquity ?? '')
  const [error, setError] = useState(null)
  const [savedAt, setSavedAt] = useState(null)
  const inputRef = useRef(null)
  const realized = useMemo(
    () => closedTrades(trades).reduce((sum, trade) => sum + (trade.pnl ?? 0), 0),
    [trades]
  )

  // A reader sent here to set the equity lands on the field rather than at
  // the top of a page they then have to read to find it.
  useEffect(() => {
    if (hash !== '#equity') return undefined
    const timer = setTimeout(() => inputRef.current?.focus(), 60)
    return () => clearTimeout(timer)
  }, [hash])

  const validate = (raw) => {
    const parsed = Number(raw)
    return raw !== '' && Number.isFinite(parsed) && parsed > 0 ? null : EQUITY_ERROR
  }

  const save = (event) => {
    event.preventDefault()
    const fault = validate(value)
    setError(fault)
    if (fault) {
      focusFirstInvalid(event.currentTarget)
      return
    }
    updateSettings({ startingEquity: Number(value) })
    setSavedAt(new Date())
  }

  return (
    <Card title="Account Equity">
      <form onSubmit={save} noValidate className="space-y-3">
        <Field
          label="Starting Equity (USD)"
          required
          name="startingEquity"
          error={error}
          hint="The balance the account started with. Realized results are added on top."
        >
          {(id, aria) => (
            <input
              id={id}
              ref={inputRef}
              {...aria}
              {...NUMERIC}
              value={value}
              onChange={(event) => {
                setValue(event.target.value.replace(/[,\s]/g, ''))
                setSavedAt(null)
              }}
              onBlur={() => setError(value === '' ? null : validate(value))}
              className={INPUT_CLASS}
            />
          )}
        </Field>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="bg-surface-2/40 rounded-control border border-border px-3 py-2">
            <p className="text-xs text-text-faint">Realized P&L</p>
            <p className="font-mono tabular-nums text-text">
              {formatCurrency(realized, { signed: true })}
            </p>
          </div>
          <div className="bg-surface-2/40 rounded-control border border-border px-3 py-2">
            <p className="text-xs text-text-faint">Current Equity</p>
            <p className="font-mono tabular-nums text-text">
              {equity != null ? formatCurrency(equity) : 'Not set'}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button type="submit" className={PRIMARY_BUTTON}>
            <Save className="h-4 w-4" aria-hidden="true" />
            Save Equity
          </button>
          <span role="status" className="text-xs text-text-faint">
            {savedAt ? `Saved ${formatCt(savedAt, { timeStyle: 'short' })} CT.` : ''}
          </span>
        </div>
        <p className="max-w-[72ch] text-xs leading-relaxed text-text-faint">
          Risk math sizes every trade from this number plus realized results.
        </p>
      </form>
    </Card>
  )
}

const POINT_VALUE_ERROR = 'Enter a dollars-per-point figure above zero, or clear the field.'

/**
 * Dollars per point, per instrument.
 *
 * The book runs to dozens of instruments and the desk sizes on four of them,
 * so the form opens on the primaries and anything already set, and the rest
 * of the registry is a press away rather than a screen of empty boxes.
 */
function PointValuesCard() {
  const { settings, updateSettings } = useJournal()
  const [values, setValues] = useState(() =>
    TRADED_INSTRUMENTS.reduce((map, meta) => {
      map[meta.symbol] = settings.pointValues[meta.symbol] ?? ''
      return map
    }, {})
  )
  const [errors, setErrors] = useState({})
  const [showAll, setShowAll] = useState(false)
  const [savedAt, setSavedAt] = useState(null)

  const shown = useMemo(
    () =>
      TRADED_INSTRUMENTS.filter(
        (meta) => showAll || meta.isPrimary || settings.pointValues[meta.symbol] != null
      ),
    [showAll, settings.pointValues]
  )
  const hidden = TRADED_INSTRUMENTS.length - shown.length

  const faultFor = (raw) => {
    if (raw === '') return null
    const parsed = Number(raw)
    return Number.isFinite(parsed) && parsed > 0 ? null : POINT_VALUE_ERROR
  }

  const save = (event) => {
    event.preventDefault()
    const faults = {}
    const pointValues = {}
    for (const [symbol, raw] of Object.entries(values)) {
      const fault = faultFor(raw)
      if (fault) faults[symbol] = fault
      else if (raw !== '') pointValues[symbol] = Number(raw)
    }
    setErrors(faults)
    if (Object.keys(faults).length > 0) {
      focusFirstInvalid(event.currentTarget)
      return
    }
    updateSettings({ pointValues })
    setSavedAt(new Date())
  }

  return (
    <Card
      title="Point Values"
      action={<span className="text-xs text-text-faint">Dollars per point, per 1.0 unit</span>}
    >
      <form onSubmit={save} noValidate className="space-y-3">
        <p className="max-w-[68ch] text-xs leading-relaxed text-text-faint">
          What one unit gains or loses per point on your platform. With it set, the trade form
          suggests a size from the risk percent; without it, risk is in dollars only.
        </p>
        <div className="grid grid-cols-2 gap-x-4 sm:grid-cols-3">
          {shown.map((meta) => (
            <Field
              key={meta.symbol}
              label={meta.displaySymbol}
              name={meta.symbol}
              error={errors[meta.symbol] ?? null}
            >
              {(id, aria) => (
                <input
                  id={id}
                  {...aria}
                  {...NUMERIC}
                  value={values[meta.symbol]}
                  onChange={(event) => {
                    const next = event.target.value.replace(/[,\s]/g, '')
                    setValues((previous) => ({ ...previous, [meta.symbol]: next }))
                    setSavedAt(null)
                  }}
                  onBlur={() =>
                    setErrors((previous) => ({
                      ...previous,
                      [meta.symbol]: faultFor(values[meta.symbol]),
                    }))
                  }
                  className={INPUT_CLASS}
                />
              )}
            </Field>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" className={SECONDARY_BUTTON}>
            <Save className="h-4 w-4" aria-hidden="true" />
            Save Point Values
          </button>
          <button
            type="button"
            onClick={() => setShowAll((open) => !open)}
            aria-expanded={showAll}
            className={cn(SMALL_BUTTON, 'inline-flex items-center gap-1.5')}
          >
            {showAll ? (
              <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            {showAll ? 'Show Fewer' : `Show All Instruments (${hidden} More)`}
          </button>
          <span role="status" className="text-xs text-text-faint">
            {savedAt ? `Saved ${formatCt(savedAt, { timeStyle: 'short' })} CT.` : ''}
          </span>
        </div>
      </form>
    </Card>
  )
}

function emptyFirm() {
  return {
    id: `firm-${Date.now().toString(36)}`,
    firmName: '',
    programName: '',
    startingBalance: '',
    profitTarget: '',
    maxDrawdown: '',
    drawdownType: 'trailing',
    startedAt: '',
    dailyLossLimit: '',
    consistencyCapPct: '30',
    minTradingDays: '',
  }
}

/** The firm form's own checks: field to what is wrong and how to fix it. */
function firmFaults(draft) {
  const faults = {}
  if (!draft.firmName.trim()) faults.firmName = 'Enter the firm name.'
  const balance = Number(draft.startingBalance)
  if (draft.startingBalance === '' || !Number.isFinite(balance) || balance <= 0) {
    faults.startingBalance = 'Enter a starting balance above zero.'
  }
  if (draft.profitTarget === '' || !Number.isFinite(Number(draft.profitTarget))) {
    faults.profitTarget = 'Enter the profit target in dollars.'
  }
  if (draft.maxDrawdown === '' || !Number.isFinite(Number(draft.maxDrawdown))) {
    faults.maxDrawdown = 'Enter the max drawdown in dollars.'
  }
  for (const optional of ['dailyLossLimit', 'consistencyCapPct', 'minTradingDays']) {
    if (draft[optional] !== '' && !Number.isFinite(Number(draft[optional]))) {
      faults[optional] = 'Enter a number, or clear the field.'
    }
  }
  if (draft.startedAt !== '' && !/^\d{4}-\d{2}-\d{2}$/.test(draft.startedAt)) {
    faults.startedAt = 'Pick a date, or clear the field.'
  }
  return faults
}

const FIRM_FIELD_LABELS = {
  firmName: 'Firm',
  startingBalance: 'Starting Balance',
  profitTarget: 'Profit Target ($)',
  maxDrawdown: 'Max Drawdown ($)',
  startedAt: 'Evaluation Start',
  dailyLossLimit: 'Daily Loss Limit',
  consistencyCapPct: 'Consistency Cap',
  minTradingDays: 'Min Trading Days',
}

/** A stored day key as a reader writes the date. */
function formatDay(key) {
  return formatCt(`${key}T12:00:00-05:00`, { dateStyle: 'medium' })
}

function PropFirmsCard() {
  const { settings, saveFirm, removeFirm, updateSettings } = useJournal()
  const [draft, setDraft] = useState(emptyFirm)
  const [errors, setErrors] = useState({})
  const [confirmingId, setConfirmingId] = useState(null)
  const [removed, setRemoved] = useState(null)

  const update = (field) => (event) => {
    const raw = event?.target ? event.target.value : event
    const value = typeof raw === 'string' && field !== 'startedAt' ? raw.replace(/,/g, '') : raw
    setDraft((previous) => ({ ...previous, [field]: value }))
  }

  const checkOnBlur = (field) => () => {
    setErrors((previous) => ({ ...previous, [field]: firmFaults(draft)[field] ?? null }))
  }

  const save = (event) => {
    event.preventDefault()
    const faults = firmFaults(draft)
    setErrors(faults)
    if (Object.keys(faults).length > 0) {
      focusFirstInvalid(event.currentTarget)
      return
    }
    saveFirm({
      id: draft.id,
      firmName: draft.firmName.trim(),
      programName: draft.programName.trim(),
      startingBalance: Number(draft.startingBalance),
      profitTarget: Number(draft.profitTarget),
      maxDrawdown: Number(draft.maxDrawdown),
      drawdownType: draft.drawdownType,
      startedAt: draft.startedAt === '' ? null : draft.startedAt,
      dailyLossLimit: draft.dailyLossLimit === '' ? null : Number(draft.dailyLossLimit),
      consistencyCapPct: draft.consistencyCapPct === '' ? null : Number(draft.consistencyCapPct),
      minTradingDays: draft.minTradingDays === '' ? null : Number(draft.minTradingDays),
    })
    setDraft(emptyFirm())
    setErrors({})
  }

  const faultEntries = Object.entries(errors).filter(([, message]) => message)

  return (
    <Card
      title="Prop Firms"
      action={<span className="text-xs text-text-faint">Tracked on Insights</span>}
    >
      <div className="space-y-4">
        {settings.firms.length > 0 && (
          <ul className="space-y-2">
            {settings.firms.map((firm) => (
              <li
                key={firm.id}
                className="bg-surface-2/40 flex flex-wrap items-center justify-between gap-3 rounded-control border border-border px-3 py-2.5"
              >
                <div className="max-w-[72ch] leading-tight">
                  <p className="text-sm font-medium text-text">
                    {firm.firmName}
                    {firm.programName ? (
                      <span className="text-text-faint"> · {firm.programName}</span>
                    ) : null}
                  </p>
                  <p className="text-xs text-text-faint">
                    {formatCurrency(firm.startingBalance)} · {firm.drawdownType} drawdown{' '}
                    {formatCurrency(firm.maxDrawdown)} · target {formatCurrency(firm.profitTarget)}
                    {firm.startedAt ? ` · since ${formatDay(firm.startedAt)}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {settings.activeFirmId === firm.id ? (
                    <Badge variant="accent">Active</Badge>
                  ) : (
                    <button
                      type="button"
                      onClick={() => updateSettings({ activeFirmId: firm.id })}
                      className={SMALL_BUTTON}
                    >
                      Set Active
                    </button>
                  )}
                  {confirmingId === firm.id ? (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          removeFirm(firm.id)
                          setRemoved(firm)
                          setConfirmingId(null)
                        }}
                        className="press focus-ring border-danger/50 rounded-control border bg-[var(--ds-danger-soft)] px-2 py-1 text-xs font-medium text-danger transition-colors hover:border-danger"
                      >
                        Confirm Remove
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmingId(null)}
                        className={SMALL_BUTTON}
                      >
                        Keep
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmingId(firm.id)}
                      aria-label={`Remove ${firm.firmName}`}
                      className="press focus-ring rounded-control border border-border bg-surface-2 p-1.5 text-text-muted transition-colors hover:text-danger"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}

        {removed && (
          <div
            role="status"
            className="bg-surface-2/40 flex items-center justify-between gap-3 rounded-control border border-border px-3 py-2.5 text-sm"
          >
            <span className="text-text-muted">
              Removed {removed.firmName}
              {removed.programName ? ` · ${removed.programName}` : ''}.
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  saveFirm(removed)
                  setRemoved(null)
                }}
                className={cn(SMALL_BUTTON, 'inline-flex items-center gap-1.5')}
              >
                <Undo2 className="h-3.5 w-3.5" aria-hidden="true" />
                Undo
              </button>
              <button type="button" onClick={() => setRemoved(null)} className={SMALL_BUTTON}>
                Dismiss
              </button>
            </div>
          </div>
        )}

        <form onSubmit={save} noValidate className="space-y-3 border-t border-border pb-1 pt-4">
          <h3 className="text-[13px] font-semibold text-text">Add a Firm</h3>
          {faultEntries.length > 1 && (
            <div
              role="alert"
              className="border-danger/50 rounded-control border bg-[var(--ds-danger-soft)] px-3 py-2.5 text-sm text-danger"
            >
              <p className="font-medium">Fix these to add the firm:</p>
              <ul className="mt-1.5 space-y-1">
                {faultEntries.map(([field, message]) => (
                  <li key={field}>
                    <button
                      type="button"
                      onClick={(event) =>
                        event.currentTarget
                          .closest('form')
                          ?.querySelector(`[data-field="${field}"]`)
                          ?.focus()
                      }
                      className="press focus-ring rounded-control text-left text-xs underline underline-offset-2 transition-colors hover:text-text"
                    >
                      {FIRM_FIELD_LABELS[field] ?? field}: {message}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
            <Field label="Firm" required name="firmName" error={errors.firmName ?? null}>
              {(id, aria) => (
                <input
                  id={id}
                  {...aria}
                  value={draft.firmName}
                  onChange={update('firmName')}
                  onBlur={checkOnBlur('firmName')}
                  autoComplete="organization"
                  className={INPUT_CLASS}
                />
              )}
            </Field>
            <Field label="Program" name="programName">
              {(id, aria) => (
                <input
                  id={id}
                  {...aria}
                  value={draft.programName}
                  onChange={update('programName')}
                  className={INPUT_CLASS}
                />
              )}
            </Field>
            <Field
              label="Starting Balance ($)"
              required
              name="startingBalance"
              error={errors.startingBalance ?? null}
            >
              {(id, aria) => (
                <input
                  id={id}
                  {...aria}
                  {...NUMERIC}
                  value={draft.startingBalance}
                  onChange={update('startingBalance')}
                  onBlur={checkOnBlur('startingBalance')}
                  className={INPUT_CLASS}
                />
              )}
            </Field>
            <Field
              label="Profit Target ($)"
              required
              name="profitTarget"
              error={errors.profitTarget ?? null}
            >
              {(id, aria) => (
                <input
                  id={id}
                  {...aria}
                  {...NUMERIC}
                  value={draft.profitTarget}
                  onChange={update('profitTarget')}
                  onBlur={checkOnBlur('profitTarget')}
                  className={INPUT_CLASS}
                />
              )}
            </Field>
            <Field
              label="Max Drawdown ($)"
              required
              name="maxDrawdown"
              error={errors.maxDrawdown ?? null}
            >
              {(id, aria) => (
                <input
                  id={id}
                  {...aria}
                  {...NUMERIC}
                  value={draft.maxDrawdown}
                  onChange={update('maxDrawdown')}
                  onBlur={checkOnBlur('maxDrawdown')}
                  className={INPUT_CLASS}
                />
              )}
            </Field>
            <Select
              label="Drawdown Type"
              value={draft.drawdownType}
              onChange={update('drawdownType')}
              options={[
                { value: 'trailing', label: 'Trailing (follows high-water mark)' },
                { value: 'static', label: 'Static (from starting balance)' },
              ]}
            />
            <Field
              label="Evaluation Start (Optional)"
              name="startedAt"
              error={errors.startedAt ?? null}
              hint="Trades closed before this day do not count toward the firm."
            >
              {(id, aria) => (
                <input
                  id={id}
                  {...aria}
                  type="date"
                  value={draft.startedAt}
                  onChange={update('startedAt')}
                  onBlur={checkOnBlur('startedAt')}
                  className={INPUT_CLASS}
                />
              )}
            </Field>
            <Field
              label="Daily Loss Limit ($, Optional)"
              name="dailyLossLimit"
              error={errors.dailyLossLimit ?? null}
            >
              {(id, aria) => (
                <input
                  id={id}
                  {...aria}
                  {...NUMERIC}
                  value={draft.dailyLossLimit}
                  onChange={update('dailyLossLimit')}
                  onBlur={checkOnBlur('dailyLossLimit')}
                  className={INPUT_CLASS}
                />
              )}
            </Field>
            <Field
              label="Consistency Cap (%, Optional)"
              name="consistencyCapPct"
              error={errors.consistencyCapPct ?? null}
              hint="The most of total profit one day may hold."
            >
              {(id, aria) => (
                <input
                  id={id}
                  {...aria}
                  {...NUMERIC}
                  value={draft.consistencyCapPct}
                  onChange={update('consistencyCapPct')}
                  onBlur={checkOnBlur('consistencyCapPct')}
                  className={INPUT_CLASS}
                />
              )}
            </Field>
            <Field
              label="Min Trading Days (Optional)"
              name="minTradingDays"
              error={errors.minTradingDays ?? null}
            >
              {(id, aria) => (
                <input
                  id={id}
                  {...aria}
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  value={draft.minTradingDays}
                  onChange={update('minTradingDays')}
                  onBlur={checkOnBlur('minTradingDays')}
                  className={INPUT_CLASS}
                />
              )}
            </Field>
          </div>
          <button type="submit" className={SECONDARY_BUTTON}>
            <Save className="h-4 w-4" aria-hidden="true" />
            Add Firm
          </button>
        </form>
      </div>
    </Card>
  )
}

/**
 * The feeds, as one line and a list behind it.
 *
 * What a reader needs at a glance is whether the book is priced and by whom.
 * The per-instrument list is diagnostics, opened when a price looks wrong,
 * and kept behind a press so the account page is not a column of badges.
 */
function DataCard() {
  const { quotes, at, loading } = useInstrumentQuotes()
  const [open, setOpen] = useState(false)
  const venues = [...new Set(quotes.map((quote) => quote.exchange).filter(Boolean))]
  const missing = INSTRUMENTS.filter(
    (meta) => !quotes.some((entry) => entry.symbol === meta.symbol)
  )

  return (
    <Card
      title="Data Feeds"
      action={
        at ? (
          <span className="text-xs text-text-faint">
            Last read {formatCt(at, { timeStyle: 'medium' })}
          </span>
        ) : null
      }
    >
      <p className="text-sm text-text">
        {loading && quotes.length === 0
          ? 'Reading the feed.'
          : `${quotes.length} of ${INSTRUMENTS.length} instruments priced${
              venues.length ? `, from ${venues.join(', ')}` : ''
            }.`}
      </p>
      {missing.length > 0 && !loading ? (
        <p className="mt-1 text-xs text-text-faint">
          No feed for {missing.map((meta) => meta.displaySymbol).join(', ')}.
        </p>
      ) : null}
      <p className="mt-3 max-w-[68ch] text-xs leading-relaxed text-text-faint">
        Prices reach the desk through this site&rsquo;s own origin, and no reader account, key or
        subscription sits in that path. Index and FX quotes carry the venue&rsquo;s own delay, so
        confirm a level on the execution platform before working it. An instrument no feed can serve
        reads as No Feed rather than falling back to a number.
      </p>
      <p className="mt-2 max-w-[68ch] text-xs leading-relaxed text-text-faint">
        {CHART_CREDIT.notice.replace(/\.$/, '')}, used under the Apache 2.0 licence.{' '}
        <a
          href={CHART_CREDIT.href}
          target="_blank"
          rel="noreferrer noopener"
          className="focus-ring rounded-sm underline underline-offset-2 transition-colors [@media(hover:hover)]:hover:text-text"
        >
          tradingview.com
        </a>
      </p>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className={cn(SMALL_BUTTON, 'mt-3 inline-flex items-center gap-1.5')}
      >
        {open ? (
          <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
        )}
        {open ? 'Hide Instruments' : 'Show All Instruments'}
      </button>
      {open ? (
        <ul className="mt-3 space-y-2 border-t border-border pt-3 text-sm">
          {INSTRUMENTS.map((meta) => {
            const quote = quotes.find((entry) => entry.symbol === meta.symbol)
            return (
              <li key={meta.symbol} className="flex items-center justify-between gap-3">
                <span className="text-text-muted">
                  {meta.displaySymbol}
                  <span className="ml-2 font-mono text-xs text-text-faint">
                    {meta.providerSymbol}
                  </span>
                </span>
                <Badge variant={quote ? 'positive' : 'warning'}>
                  {quote?.exchange ?? 'No Feed'}
                </Badge>
              </li>
            )
          })}
          <li className="flex items-center justify-between gap-3 border-t border-border pt-3">
            <span className="text-text-muted">Economic Calendar</span>
            <Badge variant="neutral">Weekly Feed</Badge>
          </li>
        </ul>
      ) : null}
    </Card>
  )
}

/**
 * The journal as a file, and a file as the journal.
 *
 * The record follows the account now, so a new machine signs in and finds its
 * own journal waiting. A download is still the copy that answers to nobody -
 * the one a reader keeps whatever happens to this desk - and a restore is that
 * copy read back, confirmed before it replaces anything, because a restore is
 * the one action here that cannot be undone.
 */
function BackupCard() {
  const { journal, trades, replaceJournal } = useJournal()
  const [pending, setPending] = useState(null)
  const [message, setMessage] = useState(null)
  const [fault, setFault] = useState(null)
  const fileId = useId()
  const closed = closedTrades(trades).length

  const download = () => {
    const blob = new Blob([serializeJournal(journal)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `root-and-rise-journal-${ctDateKey(new Date())}.json`
    anchor.click()
    URL.revokeObjectURL(url)
    setFault(null)
    setMessage(`Downloaded a copy with ${trades.length} trades.`)
  }

  const onFile = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setMessage(null)
    const record = parseJournal(await file.text())
    if (!record) {
      setFault('That file is not a journal this desk can read.')
      return
    }
    setFault(null)
    setPending({ record, name: file.name })
  }

  const restore = () => {
    replaceJournal(pending.record)
    setMessage(`Restored ${pending.name}.`)
    setPending(null)
  }

  const pendingClosed = pending
    ? pending.record.trades.filter((t) => t.status === 'closed').length
    : 0

  return (
    <Card title="Backup">
      <div className="space-y-4">
        <p className="max-w-[72ch] text-sm leading-relaxed text-text-muted">
          The journal is saved to your account, so it follows you to any browser you sign in on. A
          downloaded copy does not depend on the account, so it is still worth taking after a
          session.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={download} className={PRIMARY_BUTTON}>
            <Download className="h-4 w-4" aria-hidden="true" />
            Download Journal
          </button>
          <label htmlFor={fileId} className={cn(SECONDARY_BUTTON, 'cursor-pointer')}>
            <Upload className="h-4 w-4" aria-hidden="true" />
            Restore from File
          </label>
          <input
            id={fileId}
            type="file"
            accept="application/json,.json"
            onChange={onFile}
            className="sr-only"
          />
          <span className="text-xs text-text-faint">
            {trades.length} trades on file, {closed} closed.
          </span>
        </div>
        {message ? (
          <p role="status" className="text-sm text-text-muted">
            {message}
          </p>
        ) : null}
        {fault ? (
          <p
            role="alert"
            className="flex items-start gap-2 rounded-control bg-[var(--ds-danger-soft)] px-3 py-2.5 text-sm text-danger"
          >
            <OctagonAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            {fault}
          </p>
        ) : null}
        {pending ? (
          <div
            role="alertdialog"
            aria-label="Replace the journal"
            className="border-warning/40 bg-[var(--ds-warning-soft)]/40 space-y-3 rounded-control border p-3"
          >
            <p className="text-sm text-text">
              <span className="font-medium">{pending.name}</span> holds{' '}
              {pending.record.trades.length} trades, {pendingClosed} closed, and{' '}
              {pending.record.settings.firms.length}{' '}
              {pending.record.settings.firms.length === 1 ? 'firm' : 'firms'}. Restoring it replaces
              the whole journal on this account, and that cannot be undone.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={restore}
                className="press focus-ring border-danger/50 rounded-control border bg-[var(--ds-danger-soft)] px-3 py-2 text-sm font-medium text-danger transition-colors hover:border-danger"
              >
                Replace Journal
              </button>
              <button type="button" onClick={() => setPending(null)} className={SECONDARY_BUTTON}>
                Cancel
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </Card>
  )
}

const SECTIONS = [
  { id: 'equity', label: 'Equity and Feeds' },
  { id: 'points', label: 'Point Values' },
  { id: 'firms', label: 'Prop Firms' },
  { id: 'backup', label: 'Backup' },
  { id: 'rules', label: 'Risk Rules' },
  { id: 'session', label: 'Session' },
]

/**
 * Settings, read as a contents page against its sections.
 *
 * The index holds the left column and stays put while the sections run down the
 * right, so a page this long can be crossed without scrolling back to find out
 * what is on it.
 */
export default function AccountPage() {
  const { email, signOut } = useAuth()

  return (
    <div className="grid gap-x-10 gap-y-6 lg:grid-cols-[13rem_minmax(0,1fr)]">
      <div className="lg:col-span-2">
        <PageHeader title="Account" subtitle={email ?? ''} />
      </div>

      <nav aria-label="Account sections" className="hidden lg:block">
        <ol className="sticky top-4 space-y-0.5 border-l border-border">
          {SECTIONS.map((section) => (
            <li key={section.id}>
              <a
                href={`#${section.id}`}
                className="focus-ring -ml-px block border-l border-transparent py-1.5 pl-4 text-[13px] text-text-muted transition-colors duration-200 ease-out [@media(hover:hover)]:hover:border-[color:var(--ds-accent-fill)] [@media(hover:hover)]:hover:text-text"
              >
                {section.label}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <div className="min-w-0 space-y-6">
        <section id="equity" className="grid scroll-mt-6 gap-5 xl:grid-cols-2">
          <EquityCard />
          <DataCard />
        </section>

        <section id="points" className="scroll-mt-6">
          <PointValuesCard />
        </section>

        <section id="firms" className="scroll-mt-6">
          <PropFirmsCard />
        </section>

        <section id="backup" className="scroll-mt-6">
          <BackupCard />
        </section>

        <section id="rules" className="panel-static scroll-mt-6 overflow-hidden">
          <header className="flex items-center gap-3 border-b border-border bg-surface-2 px-5 py-3">
            <RuleLabel as="h2">Risk Rules</RuleLabel>
            <div className="min-w-2 flex-1" />
            <span className="text-[11px] text-text-faint">Non-negotiable</span>
          </header>
          <ul>
            {RISK_RULES_DESCRIPTIONS.map((rule) => (
              <li
                key={rule.id}
                className="flex items-start gap-3 border-b border-border px-5 py-3.5 last:border-b-0"
              >
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
                <div className="max-w-[70ch]">
                  <p className="text-[13px] font-medium text-text">{rule.label}</p>
                  <p className="mt-0.5 text-[13px] leading-relaxed text-text-muted">
                    {rule.detail}
                  </p>
                </div>
              </li>
            ))}
          </ul>
          <p className="border-t border-border px-5 py-3 text-[11px] text-text-faint">
            Enforced at trade entry: the journal refuses tickets that break them.
          </p>
        </section>

        <section id="session" className="panel-static scroll-mt-6 overflow-hidden">
          <header className="border-b border-border bg-surface-2 px-5 py-3">
            <RuleLabel as="h2">Session</RuleLabel>
          </header>
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
            <p className="text-[13px] text-text-muted">Signed in as {email}.</p>
            <button
              type="button"
              onClick={signOut}
              className="press focus-ring rounded-control bg-surface-2 px-3 py-2 text-[13px] font-medium text-text-muted shadow-[var(--ds-edge)] transition-colors duration-200 ease-out [@media(hover:hover)]:hover:text-danger"
            >
              Sign Out
            </button>
          </div>
        </section>
      </div>
    </div>
  )
}
