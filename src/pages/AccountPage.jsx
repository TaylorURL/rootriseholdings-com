import { useId, useMemo, useState } from 'react'
import { OctagonAlert, Save, ShieldAlert, Trash2, Undo2 } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Select from '../components/ui/Select'
import { useJournal } from '../context/JournalContext'
import { useAuth } from '../context/AuthContext'
import { RISK_RULES_DESCRIPTIONS } from '../data/riskRules'
import { INSTRUMENTS, TRADED_INSTRUMENTS } from '../data/instruments'
import { closedTrades } from '../lib/journal/stats.js'
import { formatCurrency } from '../lib/format'
import { formatCt } from '../lib/time.js'
import { useInstrumentQuotes } from '../lib/marketData/instrumentQuotes.js'

/**
 * Labelled field wrapper. The label is bound with htmlFor rather than by
 * wrapping, so the association survives whatever control the caller passes.
 *
 * A field with an error renders the message beside its cause with role=alert,
 * and hands the control the aria attributes that announce it - the caller
 * spreads them onto whatever it renders. `name` marks the control so a failed
 * submit can move focus to the first invalid field.
 *
 * @param {object} props
 * @param {string} props.label
 * @param {boolean} [props.required] - marks the label and the control
 * @param {string|null} [props.error] - what is wrong and what to do about it
 * @param {string} [props.name] - stamped on the control as data-field
 * @param {(id: string, aria: object) => React.ReactNode} props.children - render-prop
 *   given the control id and the aria attributes to spread
 */
function Field({ label, required = false, error = null, name, children }) {
  const id = useId()
  const errorId = `${id}-error`
  const aria = {
    'data-field': name,
    'aria-required': required || undefined,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': error ? errorId : undefined,
  }
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-xs font-medium uppercase tracking-wide text-text-faint">
        {label}
        {required && (
          <span aria-hidden="true" className="ml-1 text-accent-bright">
            *
          </span>
        )}
      </label>
      {children(id, aria)}
      {error && (
        <p
          id={errorId}
          role="alert"
          className="flex items-start gap-1.5 text-xs leading-relaxed text-danger"
        >
          <OctagonAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}
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

const EQUITY_ERROR = 'Enter a starting equity above zero.'

function EquityCard() {
  const { settings, equity, updateSettings, trades } = useJournal()
  const [value, setValue] = useState(settings.startingEquity ?? '')
  const [error, setError] = useState(null)
  const realized = useMemo(
    () => closedTrades(trades).reduce((sum, trade) => sum + (trade.pnl ?? 0), 0),
    [trades]
  )

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
  }

  return (
    <Card title="Account Equity">
      <form onSubmit={save} noValidate className="space-y-4">
        <Field label="Starting Equity (USD)" required name="startingEquity" error={error}>
          {(id, aria) => (
            <input
              id={id}
              {...aria}
              type="number"
              inputMode="decimal"
              step="any"
              value={value}
              onChange={(event) => setValue(event.target.value)}
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
        <button
          type="submit"
          className="press focus-ring btn-accent inline-flex items-center gap-2 rounded-control px-4 py-2 text-sm font-semibold text-on-accent"
        >
          <Save className="h-4 w-4" aria-hidden="true" />
          Save Equity
        </button>
        <p className="max-w-[72ch] text-xs leading-relaxed text-text-faint">
          Risk math sizes every trade from this number plus realized results. Journal data lives in
          this browser's storage.
        </p>
      </form>
    </Card>
  )
}

const POINT_VALUE_ERROR = 'Enter a dollars-per-point figure above zero, or clear the field.'

function PointValuesCard() {
  const { settings, updateSettings } = useJournal()
  const [values, setValues] = useState(() =>
    TRADED_INSTRUMENTS.reduce((map, meta) => {
      map[meta.symbol] = settings.pointValues[meta.symbol] ?? ''
      return map
    }, {})
  )
  const [errors, setErrors] = useState({})

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
  }

  return (
    <Card
      title="Point Values"
      action={<span className="text-xs text-text-faint">Dollars per point, per 1.0 unit</span>}
    >
      <form onSubmit={save} noValidate className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          {TRADED_INSTRUMENTS.map((meta) => (
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
                  type="number"
                  inputMode="decimal"
                  step="any"
                  value={values[meta.symbol]}
                  onChange={(event) =>
                    setValues((previous) => ({ ...previous, [meta.symbol]: event.target.value }))
                  }
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
        <button
          type="submit"
          className="press focus-ring inline-flex items-center gap-2 rounded-control border border-border bg-surface-2 px-4 py-2 text-sm font-medium text-text transition-colors hover:border-border-hover"
        >
          <Save className="h-4 w-4" aria-hidden="true" />
          Save Point Values
        </button>
        <p className="max-w-[68ch] text-xs leading-relaxed text-text-faint">
          What one unit gains or loses per point. With it set, the form sizes from risk percent;
          without it, risk is in dollars.
        </p>
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
  return faults
}

const FIRM_FIELD_LABELS = {
  firmName: 'Firm',
  startingBalance: 'Starting Balance',
  profitTarget: 'Profit Target ($)',
  maxDrawdown: 'Max Drawdown ($)',
  dailyLossLimit: 'Daily Loss Limit',
  consistencyCapPct: 'Consistency Cap',
  minTradingDays: 'Min Trading Days',
}

function PropFirmsCard() {
  const { settings, saveFirm, removeFirm, updateSettings } = useJournal()
  const [draft, setDraft] = useState(emptyFirm)
  const [errors, setErrors] = useState({})
  const [confirmingId, setConfirmingId] = useState(null)
  const [removed, setRemoved] = useState(null)

  const update = (field) => (event) => {
    const value = event?.target ? event.target.value : event
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
                className="bg-surface-2/40 flex items-center justify-between gap-3 rounded-control border border-border px-3 py-2.5"
              >
                <div className="max-w-[72ch] leading-tight">
                  <p className="text-sm font-medium text-text">
                    {firm.firmName} <span className="text-text-faint">· {firm.programName}</span>
                  </p>
                  <p className="text-xs text-text-faint">
                    {formatCurrency(firm.startingBalance)} · {firm.drawdownType} DD{' '}
                    {formatCurrency(firm.maxDrawdown)} · target {formatCurrency(firm.profitTarget)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {settings.activeFirmId === firm.id ? (
                    <Badge variant="accent">Active</Badge>
                  ) : (
                    <button
                      type="button"
                      onClick={() => updateSettings({ activeFirmId: firm.id })}
                      className="press focus-ring rounded-control border border-border bg-surface-2 px-2 py-1 text-xs font-medium text-text-muted transition-colors hover:text-text"
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
                        className="press focus-ring rounded-control border border-border bg-surface-2 px-2 py-1 text-xs font-medium text-text-muted transition-colors hover:text-text"
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
                className="press focus-ring inline-flex items-center gap-1.5 rounded-control border border-border bg-surface-2 px-2 py-1 text-xs font-medium text-text-muted transition-colors hover:text-text"
              >
                <Undo2 className="h-3.5 w-3.5" aria-hidden="true" />
                Undo
              </button>
              <button
                type="button"
                onClick={() => setRemoved(null)}
                className="press focus-ring rounded-control border border-border bg-surface-2 px-2 py-1 text-xs font-medium text-text-muted transition-colors hover:text-text"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        <form onSubmit={save} noValidate className="space-y-4 border-t border-border pb-1 pt-4">
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Firm" required name="firmName" error={errors.firmName ?? null}>
              {(id, aria) => (
                <input
                  id={id}
                  {...aria}
                  value={draft.firmName}
                  onChange={update('firmName')}
                  onBlur={checkOnBlur('firmName')}
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
              label="Starting Balance"
              required
              name="startingBalance"
              error={errors.startingBalance ?? null}
            >
              {(id, aria) => (
                <input
                  id={id}
                  {...aria}
                  type="number"
                  inputMode="decimal"
                  step="any"
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
                  type="number"
                  inputMode="decimal"
                  step="any"
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
                  type="number"
                  inputMode="decimal"
                  step="any"
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
              label="Daily Loss Limit ($, Optional)"
              name="dailyLossLimit"
              error={errors.dailyLossLimit ?? null}
            >
              {(id, aria) => (
                <input
                  id={id}
                  {...aria}
                  type="number"
                  inputMode="decimal"
                  step="any"
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
            >
              {(id, aria) => (
                <input
                  id={id}
                  {...aria}
                  type="number"
                  inputMode="decimal"
                  step="any"
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
                  type="number"
                  inputMode="numeric"
                  value={draft.minTradingDays}
                  onChange={update('minTradingDays')}
                  onBlur={checkOnBlur('minTradingDays')}
                  className={INPUT_CLASS}
                />
              )}
            </Field>
          </div>
          <button
            type="submit"
            className="press focus-ring inline-flex items-center gap-2 rounded-control border border-border bg-surface-2 px-4 py-2 text-sm font-medium text-text transition-colors hover:border-border-hover"
          >
            <Save className="h-4 w-4" aria-hidden="true" />
            Add Firm
          </button>
        </form>
      </div>
    </Card>
  )
}

function DataCard() {
  const { quotes, at } = useInstrumentQuotes()
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
      <ul className="space-y-3 text-sm">
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
              <Badge variant={quote ? 'positive' : 'warning'}>{quote?.exchange ?? 'No Feed'}</Badge>
            </li>
          )
        })}
        <li className="flex items-center justify-between gap-3 border-t border-border pt-3">
          <span className="text-text-muted">Economic Calendar</span>
          <Badge variant="neutral">Weekly Feed</Badge>
        </li>
      </ul>
      <p className="mt-4 max-w-[68ch] text-xs leading-relaxed text-text-faint">
        Prices reach the desk through this site&rsquo;s own origin, and each badge names the venue
        that answered.
      </p>
      <ul className="mt-3 max-w-[68ch] space-y-2 border-t border-border pt-3 text-xs leading-relaxed text-text-faint">
        <li>No reader account, key or subscription sits anywhere in that path.</li>
        <li>
          Gold is the COMEX front month rebased onto a spot print, so every level shifts by the same
          carry and the prices match a spot platform.
        </li>
        <li>
          Index and FX quotes carry the venue&rsquo;s own delay. Confirm a level on the execution
          platform before working it.
        </li>
        <li>
          An instrument no feed can serve reads as No Feed rather than falling back to a number.
        </li>
      </ul>
    </Card>
  )
}

const SECTIONS = [
  { id: 'equity', label: 'Equity and Feeds' },
  { id: 'points', label: 'Point Values' },
  { id: 'firms', label: 'Prop Firms' },
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

        <section id="rules" className="panel-static scroll-mt-6 overflow-hidden">
          <header className="flex items-center gap-3 border-b border-border px-5 py-3">
            <h2 className="font-mono text-[10px] uppercase tracking-label text-text-faint">
              Risk Rules
            </h2>
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
          <header className="border-b border-border px-5 py-3">
            <h2 className="font-mono text-[10px] uppercase tracking-label text-text-faint">
              Session
            </h2>
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
