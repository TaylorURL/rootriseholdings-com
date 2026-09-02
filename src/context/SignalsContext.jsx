import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { PUBLISHED_INSTRUMENTS, readInstrument } from '../lib/signals/engine.js'
import { SETTLED, signalStats } from '../lib/signals/model.js'
import { fetchSignals } from '../lib/signals/remote.js'
import { loadPreferences, savePreferences } from '../lib/signals/store.js'
import { describeSignal, notificationState, sendNotification } from '../lib/alerts/notify.js'
import { INSTRUMENT_META, decimalsForInstrument } from '../data/instruments.js'
import { formatInstrumentPrice } from '../lib/format.js'

/**
 * The record, and the live read of structure beside it.
 *
 * These are two different things and used to be one, which is what made the
 * record unreliable. The record - what was called, and what it did - is
 * produced by the host's sweep and only read here, so every device shows the
 * same history and a call found while nobody was looking is still found. The
 * structure read is the opposite: it is what the desk looks like this minute,
 * it is worth recomputing in the tab, and nothing depends on it later.
 *
 * Announcing stays here because only this layer knows what this reader has
 * already been shown.
 */
const SignalsContext = createContext(null)

/**
 * How often the tab re-reads structure for the live panels. The shortest
 * execution timeframe is fifteen minutes, so a two-minute pass sees every bar
 * close with room to spare.
 */
const READ_MS = 120_000

/**
 * How often the tab re-reads the record. The host sweeps on its own clock, so
 * this only decides how quickly a call it published shows up here.
 */
const RECORD_MS = 60_000

export function SignalsProvider({ children }) {
  const [signals, setSignals] = useState([])
  const [recordError, setRecordError] = useState(null)
  const [reads, setReads] = useState({})
  const [sweeping, setSweeping] = useState(true)
  const [lastSweep, setLastSweep] = useState(null)
  const [preferences, setPreferences] = useState(loadPreferences)
  const [permission, setPermission] = useState(notificationState)
  const announced = useRef(new Set())
  const seededAnnouncements = useRef(false)

  useEffect(() => {
    savePreferences(preferences)
  }, [preferences])

  const readRecord = useCallback(async (abort) => {
    const { signals: record, error } = await fetchSignals({ signal: abort })
    if (abort?.aborted) return
    setRecordError(error)
    setSignals(record)

    // The first read is the record as it already stood. Announcing it would
    // mean a reader opening the tab gets a notification for every call
    // published while they were away, which is noise rather than an alert.
    // A failed read is not that first read: seeding on one would leave the
    // set empty and announce the entire history on the next read that works.
    if (!seededAnnouncements.current) {
      if (error) return
      for (const entry of record) announced.current.add(entry.id)
      seededAnnouncements.current = true
      return
    }

    for (const entry of record) {
      if (announced.current.has(entry.id)) continue
      announced.current.add(entry.id)
      // The host may have found and scored a call between two of this tab's
      // reads, so a new arrival is not always still live. What it must not be
      // is finished: a call the tape has already answered is history, and
      // history does not buzz a phone.
      if (SETTLED.has(entry.status)) continue
      const meta = INSTRUMENT_META[entry.symbol]
      sendNotification(
        describeSignal(entry, meta?.displaySymbol ?? entry.symbol, (value) =>
          formatInstrumentPrice(value, entry.symbol, decimalsForInstrument(entry.symbol))
        )
      )
    }
  }, [])

  const readStructure = useCallback(async (abort) => {
    setSweeping(true)
    try {
      const results = await Promise.all(
        PUBLISHED_INSTRUMENTS.map((meta) => readInstrument(meta, abort).catch(() => null))
      )
      if (abort?.aborted) return
      const next = {}
      for (const result of results) {
        if (result) next[result.symbol] = result
      }
      setReads(next)
      setLastSweep(Date.now())
    } finally {
      if (!abort?.aborted) setSweeping(false)
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    readRecord(controller.signal)
    const timer = setInterval(() => readRecord(controller.signal), RECORD_MS)
    return () => {
      controller.abort()
      clearInterval(timer)
    }
  }, [readRecord])

  useEffect(() => {
    const controller = new AbortController()
    readStructure(controller.signal)
    const timer = setInterval(() => readStructure(controller.signal), READ_MS)
    return () => {
      controller.abort()
      clearInterval(timer)
    }
  }, [readStructure])

  const setNotifications = useCallback((enabled, state) => {
    setPermission(state ?? notificationState())
    setPreferences((previous) => ({ ...previous, notifications: enabled }))
  }, [])

  const refresh = useCallback(() => {
    readRecord()
    readStructure()
  }, [readRecord, readStructure])

  const stats = useMemo(() => signalStats(signals), [signals])

  const value = useMemo(
    () => ({
      signals,
      recordError,
      preferences,
      permission,
      reads,
      stats,
      sweeping,
      lastSweep,
      refresh,
      setNotifications,
    }),
    [
      signals,
      recordError,
      preferences,
      permission,
      reads,
      stats,
      sweeping,
      lastSweep,
      refresh,
      setNotifications,
    ]
  )

  return <SignalsContext.Provider value={value}>{children}</SignalsContext.Provider>
}

export function useSignals() {
  const context = useContext(SignalsContext)
  if (!context) throw new Error('useSignals must be used within a SignalsProvider')
  return context
}
