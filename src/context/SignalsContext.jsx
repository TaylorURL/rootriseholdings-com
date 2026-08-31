import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { loadSignals, saveSignals, trimHistory } from '../lib/signals/store.js'
import { sweep } from '../lib/signals/engine.js'
import { signalStats } from '../lib/signals/model.js'
import { describeSignal, notificationState, sendNotification } from '../lib/alerts/notify.js'
import { INSTRUMENT_META, decimalsForInstrument } from '../data/instruments.js'
import { formatInstrumentPrice } from '../lib/format.js'

/**
 * The signal record for the whole app, and the sweep that fills it.
 *
 * The sweep runs on the same clock whichever page is open, so a call found
 * while the reader is on the journal is still recorded and still announced.
 * Announcing happens here rather than in the engine because only this layer
 * knows what has already been shown - the engine is pure and would re-announce
 * everything it publishes on a remount.
 */
const SignalsContext = createContext(null)

/**
 * How often the desk re-reads structure. The shortest execution timeframe is
 * fifteen minutes, so a two-minute sweep sees every bar close with room to
 * spare while leaving the cached candle reads to do most of the work.
 */
const SWEEP_MS = 120_000

export function SignalsProvider({ children }) {
  const [ledger, setLedger] = useState(loadSignals)
  const [reads, setReads] = useState({})
  const [sweeping, setSweeping] = useState(true)
  const [lastSweep, setLastSweep] = useState(null)
  const [permission, setPermission] = useState(notificationState)
  const announced = useRef(new Set())

  useEffect(() => {
    saveSignals(ledger)
  }, [ledger])

  const runSweep = useCallback(async (abort) => {
    setSweeping(true)
    try {
      const outcome = await sweep({ signals: loadSignals().signals, abort })
      if (abort?.aborted) return
      setReads(outcome.reads)
      setLedger((previous) => ({ ...previous, signals: trimHistory(outcome.signals) }))
      setLastSweep(Date.now())

      for (const signal of outcome.published) {
        if (announced.current.has(signal.id)) continue
        announced.current.add(signal.id)
        const meta = INSTRUMENT_META[signal.symbol]
        sendNotification(
          describeSignal(signal, meta?.displaySymbol ?? signal.symbol, (value) =>
            formatInstrumentPrice(value, signal.symbol, decimalsForInstrument(signal.symbol))
          )
        )
      }
    } finally {
      if (!abort?.aborted) setSweeping(false)
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    runSweep(controller.signal)
    const timer = setInterval(() => runSweep(controller.signal), SWEEP_MS)
    return () => {
      controller.abort()
      clearInterval(timer)
    }
  }, [runSweep])

  const setNotifications = useCallback((enabled, state) => {
    setPermission(state ?? notificationState())
    setLedger((previous) => ({
      ...previous,
      preferences: { ...previous.preferences, notifications: enabled },
    }))
  }, [])

  const clearHistory = useCallback(() => {
    setLedger((previous) => ({ ...previous, signals: [] }))
    announced.current = new Set()
  }, [])

  const stats = useMemo(() => signalStats(ledger.signals), [ledger.signals])

  const value = useMemo(
    () => ({
      signals: ledger.signals,
      preferences: ledger.preferences,
      permission,
      reads,
      stats,
      sweeping,
      lastSweep,
      refresh: () => runSweep(),
      setNotifications,
      clearHistory,
    }),
    [
      ledger.signals,
      ledger.preferences,
      permission,
      reads,
      stats,
      sweeping,
      lastSweep,
      runSweep,
      setNotifications,
      clearHistory,
    ]
  )

  return <SignalsContext.Provider value={value}>{children}</SignalsContext.Provider>
}

export function useSignals() {
  const context = useContext(SignalsContext)
  if (!context) throw new Error('useSignals must be used within a SignalsProvider')
  return context
}
