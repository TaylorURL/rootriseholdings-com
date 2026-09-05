import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { loadJournal, saveJournal, backupJournalOnce, currentEquity } from '../lib/journal/store.js'
import { reconcile, sameRecord } from '../lib/journal/merge.js'
import { fetchJournal, pushJournal } from '../lib/journal/remote.js'
import { loadSupabase } from '../lib/supabase'
import { useAuth } from './AuthContext.jsx'
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

/** How long a burst of edits settles for before the account is written to. */
const PUSH_DEBOUNCE_MS = 1500

export function JournalProvider({ children }) {
  const [journal, setJournal] = useState(loadJournal)
  const { user } = useAuth()
  const userId = user?.id ?? null
  useMinuteTick()

  /**
   * What the account is known to hold.
   *
   * Until the first sync answers, this is null and nothing is written up - a
   * browser that pushed before it had read would overwrite an account it had
   * never looked at, which on a new device is every trade the reader owns.
   */
  const syncedFor = useRef(null)
  /** The record the account is known to be holding, so an unchanged one is not resent. */
  const lastPushed = useRef(null)
  const [sync, setSync] = useState({ state: 'idle', outcome: null, error: null })

  useEffect(() => {
    saveJournal(journal)
  }, [journal])

  /**
   * Bring the account's journal and this browser's together, once per sign-in.
   *
   * Signed out, this does nothing at all and the desk works exactly as it did:
   * one record in local storage, no network, no account. Signed in, the account
   * becomes the record - the browser copy stays underneath it as a cache that
   * survives a refresh and an aeroplane - and the first sign-in on an account
   * that has never held a journal carries the browser's up rather than starting
   * empty, which is what stops this change losing anybody's history.
   */
  useEffect(() => {
    if (!userId) {
      syncedFor.current = null
      lastPushed.current = null
      setSync({ state: 'idle', outcome: null, error: null })
      return
    }
    if (syncedFor.current === userId) return

    let active = true
    setSync({ state: 'syncing', outcome: null, error: null })

    const run = async () => {
      const supabase = await loadSupabase()
      const remote = await fetchJournal(supabase, userId)
      if (!active) return

      // Read against the record as it stands now rather than the one this
      // effect closed over: an edit made while the fetch was in flight is work
      // somebody just did, and it has to be on the side that gets merged.
      let decision = null
      setJournal((current) => {
        decision = reconcile(current, remote)
        if (!decision.adopt) return current
        // The untouched copy goes down before anything replaces it.
        backupJournalOnce(current)
        return decision.adopt
      })

      if (!active || !decision) return

      if (decision.push) {
        const written = await pushJournal(supabase, userId, decision.push, {
          migrated: decision.migrated,
        })
        if (!active) return
        if (!written.ok) {
          setSync({ state: 'failed', outcome: decision.outcome, error: written.error })
          return
        }
      }

      lastPushed.current = decision.push ?? decision.adopt ?? remote.record
      syncedFor.current = userId
      setSync({
        state: remote.state === 'unavailable' || remote.state === 'error' ? 'failed' : 'synced',
        outcome: decision.outcome,
        error: remote.error,
      })
    }

    run()
    return () => {
      active = false
    }
  }, [userId])

  /**
   * Every later change, carried up after the typing stops.
   *
   * Debounced because a trade form writes on each keystroke that reaches the
   * record, and a request per keystroke is a request per keystroke. It waits on
   * the first sync having answered, so an edit can never land on the account
   * before the merge that decided what the account should hold.
   */
  useEffect(() => {
    if (!userId || syncedFor.current !== userId) return
    // The sync that just ran already wrote whatever it decided to write, and a
    // journal nobody has touched since is not a change. Without this the first
    // render after a sign-in posts the record straight back.
    if (lastPushed.current !== null && sameRecord(lastPushed.current, journal)) return

    let active = true
    const timer = setTimeout(async () => {
      const supabase = await loadSupabase()
      if (!active) return
      const written = await pushJournal(supabase, userId, journal)
      if (!active) return
      if (written.ok) lastPushed.current = journal
      setSync((previous) =>
        written.ok
          ? { state: 'synced', outcome: previous.outcome, error: null }
          : { state: 'failed', outcome: previous.outcome, error: written.error }
      )
    }, PUSH_DEBOUNCE_MS)
    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [journal, userId, sync.state])

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
          : gate.unacknowledged.map((departure) => `${departure.label}. ${departure.detail}`)
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

  /**
   * Puts a deleted trade back where it was. The record is kept in the order
   * trades were opened, so the restored one is slotted by that stamp rather
   * than appended, and a second restore of the same trade is a no-op.
   */
  const restoreTrade = useCallback((trade) => {
    setJournal((previous) => {
      if (previous.trades.some((entry) => entry.id === trade.id)) return previous
      const trades = [...previous.trades, trade].sort(
        (a, b) => new Date(a.openedAt) - new Date(b.openedAt)
      )
      return { ...previous, trades }
    })
  }, [])

  /** Replaces the whole record, which is what restoring a backup file is. */
  const replaceJournal = useCallback((record) => {
    setJournal(record)
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
      journal,
      trades: journal.trades,
      settings: journal.settings,
      equity,
      dayState,
      todayPlan,
      sync,
      addTrade,
      closeTrade,
      deleteTrade,
      restoreTrade,
      replaceJournal,
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
      sync,
      addTrade,
      closeTrade,
      deleteTrade,
      restoreTrade,
      replaceJournal,
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
