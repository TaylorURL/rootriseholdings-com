import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { loadJournal, saveJournal, currentEquity } from '../lib/journal/store.js'
import {
  createTrade,
  closeTrade as closeTradeModel,
  validateTradeDraft,
  deriveTradeNumbers,
} from '../lib/journal/model.js'
import { computeDayState, evaluateTradeGate } from '../lib/journal/rules.js'
import { ctDateKey } from '../lib/time.js'

/**
 * Journal state for the whole app: trades, account settings, day plans, and
 * the live day-state the rule book derives from them. Mutations validate and
 * gate here — at the data boundary — so the verdict is the same whatever page
 * renders the form: a blocked ticket cannot be saved, and one that departs
 * from a rule saves only once the departure is acknowledged and marked.
 */
const JournalContext = createContext(null)

/** Re-derives "today" once a minute so day boundaries and session labels roll over. */
function useMinuteTick() {
  const [, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick((value) => value + 1), 60000)
    return () => clearInterval(id)
  }, [])
}

export function JournalProvider({ children }) {
  const [journal, setJournal] = useState(loadJournal)
  useMinuteTick()

  useEffect(() => {
    saveJournal(journal)
  }, [journal])

  const equity = currentEquity(journal)
  const dayState = useMemo(
    () => computeDayState({ trades: journal.trades, equity: equity ?? 0, now: new Date() }),
    [journal.trades, equity]
  )

  const addTrade = useCallback(
    (draft) => {
      const errors = validateTradeDraft(draft)
      if (Object.keys(errors).length > 0) return { ok: false, errors, blocks: [] }
      if (equity == null)
        return {
          ok: false,
          errors: {},
          blocks: ['Set the account equity under Account before logging trades.'],
        }
      const { plannedRR } = deriveTradeNumbers(draft, equity)
      const gate = evaluateTradeGate({
        draft,
        plannedRR,
        dayState: computeDayState({ trades: journal.trades, equity, now: new Date() }),
      })
      if (!gate.allowed) {
        const blocks = gate.blocks.length
          ? gate.blocks
          : gate.unacknowledged.map((departure) => `${departure.label} — ${departure.detail}`)
        return { ok: false, errors: {}, blocks }
      }
      const trade = createTrade(draft, { equity })
      setJournal((previous) => ({ ...previous, trades: [...previous.trades, trade] }))
      return { ok: true, trade, warnings: gate.warnings }
    },
    [journal.trades, equity]
  )

  const closeTrade = useCallback((tradeId, exitPrice) => {
    setJournal((previous) => ({
      ...previous,
      trades: previous.trades.map((trade) =>
        trade.id === tradeId && trade.status === 'open'
          ? closeTradeModel(trade, { exitPrice })
          : trade
      ),
    }))
  }, [])

  const deleteTrade = useCallback((tradeId) => {
    setJournal((previous) => ({
      ...previous,
      trades: previous.trades.filter((trade) => trade.id !== tradeId),
    }))
  }, [])

  const updateSettings = useCallback((patch) => {
    setJournal((previous) => ({ ...previous, settings: { ...previous.settings, ...patch } }))
  }, [])

  const saveFirm = useCallback((firm) => {
    setJournal((previous) => {
      const firms = previous.settings.firms.some((entry) => entry.id === firm.id)
        ? previous.settings.firms.map((entry) => (entry.id === firm.id ? firm : entry))
        : [...previous.settings.firms, firm]
      return {
        ...previous,
        settings: {
          ...previous.settings,
          firms,
          activeFirmId: previous.settings.activeFirmId ?? firm.id,
        },
      }
    })
  }, [])

  const removeFirm = useCallback((firmId) => {
    setJournal((previous) => {
      const firms = previous.settings.firms.filter((entry) => entry.id !== firmId)
      return {
        ...previous,
        settings: {
          ...previous.settings,
          firms,
          activeFirmId:
            previous.settings.activeFirmId === firmId
              ? (firms[0]?.id ?? null)
              : previous.settings.activeFirmId,
        },
      }
    })
  }, [])

  const savePlan = useCallback((plan) => {
    const dateKey = ctDateKey(new Date())
    setJournal((previous) => ({
      ...previous,
      plans: { ...previous.plans, [dateKey]: { ...plan, updatedAt: new Date().toISOString() } },
    }))
  }, [])

  const todayPlan = journal.plans[ctDateKey(new Date())] ?? null

  const value = useMemo(
    () => ({
      trades: journal.trades,
      settings: journal.settings,
      equity,
      dayState,
      todayPlan,
      addTrade,
      closeTrade,
      deleteTrade,
      updateSettings,
      saveFirm,
      removeFirm,
      savePlan,
    }),
    [
      journal,
      equity,
      dayState,
      todayPlan,
      addTrade,
      closeTrade,
      deleteTrade,
      updateSettings,
      saveFirm,
      removeFirm,
      savePlan,
    ]
  )

  return <JournalContext.Provider value={value}>{children}</JournalContext.Provider>
}

export function useJournal() {
  const context = useContext(JournalContext)
  if (!context) throw new Error('useJournal must be used within a JournalProvider')
  return context
}
