import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { PRIMARY_INSTRUMENTS } from '../../data/instruments.js'
import { fetchTodayCalendar } from '../marketData/calendar.js'
import { DXY_SYMBOL, fetchDxy } from '../marketData/dxy.js'
import { fetchCandles } from '../marketData/candles.js'
import { analyzeStructure } from '../smc/structure.js'
import { presetFor } from '../smc/presets.js'
import { useInstrumentQuotes } from '../marketData/instrumentQuotes.js'
import { ctDateKey } from '../time.js'
import { composeBriefing, editionForMoment } from './compose.js'

/**
 * Fetch-and-compose hook behind the briefing page. Fetched resources cache in
 * browser storage per edition and day, so reopening the page renders the last
 * read instantly while a background refresh replaces it; the rules and
 * day-plan sections always recompose from live journal state and are never
 * cached.
 */
const CACHE_KEY = 'rr.briefing.cache.v1'
const REFRESH_AFTER_MS = 10 * 60 * 1000

/**
 * One instrument's structure read: the execution timeframe it is traded on, and
 * the higher timeframe its bias is taken from.
 *
 * Both timeframes read on the instrument's own preset, which is the same one
 * the signal engine uses. A second threshold table here would put the written
 * read and the published call on different swings.
 */
async function readFor({ symbol, providerSymbol, executionTimeframe, htfTimeframe, signal }) {
  const execution = await fetchCandles({ providerSymbol, timeframe: executionTimeframe, signal })
  if (!execution.ok) return null
  const htf = htfTimeframe
    ? await fetchCandles({ providerSymbol, timeframe: htfTimeframe, signal })
    : null
  const preset = presetFor(symbol)
  return {
    executionTimeframe,
    htfTimeframe: htf?.ok ? htfTimeframe : null,
    execution: analyzeStructure(execution.candles, { preset }),
    htf: htf?.ok ? analyzeStructure(htf.candles, { preset }) : null,
    candles: execution.candles,
    providerSymbol: execution.providerSymbol,
    exchange: execution.exchange,
  }
}

async function fetchResources({ now, signal }) {
  const [calendar, dxy] = await Promise.all([fetchTodayCalendar({ signal, now }), fetchDxy(signal)])

  const targets = [
    ...PRIMARY_INSTRUMENTS.map((meta) => ({
      symbol: meta.symbol,
      providerSymbol: meta.providerSymbol,
      executionTimeframe: meta.primaryTimeframe,
      htfTimeframe: meta.biasTimeframes[0],
    })),
    { symbol: 'DXY', providerSymbol: DXY_SYMBOL, executionTimeframe: '4H', htfTimeframe: 'Daily' },
  ]
  const settled = await Promise.all(
    targets.map((target) => readFor({ ...target, signal }).catch(() => null))
  )
  const reads = {}
  targets.forEach((target, index) => {
    if (settled[index]) reads[target.symbol] = settled[index]
  })

  return { calendar, dxy, reads }
}

function loadCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function saveCache(record) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(record))
  } catch {
    // Cache is a convenience; composing from fresh fetches still works.
  }
}

/**
 * @param {object} args
 * @param {object} args.dayState - journal day state
 * @param {object | null} args.plan - today's day plan
 * @returns {{briefing:object|null, loading:boolean, refreshing:boolean, refresh:() => void}}
 */
export function useBriefing({ dayState, plan }) {
  const { quotes, bySymbol } = useInstrumentQuotes()
  const [record, setRecord] = useState(loadCache)
  const [refreshing, setRefreshing] = useState(false)
  const controllerRef = useRef(null)

  const now = new Date()
  const dateKey = ctDateKey(now)
  const editionId = editionForMoment(now).current.id
  const cacheValid = record && record.dateKey === dateKey && record.editionId === editionId

  // Pending from the first paint when there is nothing valid to show, so the
  // placeholder is the first thing rendered rather than an empty briefing that
  // is replaced a frame later.
  const [loading, setLoading] = useState(() => !cacheValid)

  const refresh = useCallback(() => {
    controllerRef.current?.abort(new DOMException('briefing refresh superseded', 'AbortError'))
    const controller = new AbortController()
    controllerRef.current = controller
    if (cacheValid) setRefreshing(true)
    else setLoading(true)
    const at = Date.now()
    const fetchedAt = new Date()
    fetchResources({ now: fetchedAt, signal: controller.signal })
      .then((resources) => {
        if (controller.signal.aborted) return
        const next = {
          at,
          dateKey: ctDateKey(fetchedAt),
          editionId: editionForMoment(fetchedAt).current.id,
          resources,
        }
        setRecord(next)
        saveCache(next)
      })
      .finally(() => {
        if (controller.signal.aborted) return
        setLoading(false)
        setRefreshing(false)
      })
  }, [cacheValid])

  useEffect(() => {
    const stale = !cacheValid || Date.now() - (record?.at ?? 0) > REFRESH_AFTER_MS
    if (stale) refresh()
    return () => controllerRef.current?.abort(new DOMException('briefing unmounted', 'AbortError'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateKey, editionId])

  // A record from an earlier day or edition is never composed: its calendar,
  // DXY, and structure reads describe a session that has ended, and the empty
  // set renders as "no data" rather than as yesterday's numbers.
  const briefing = useMemo(() => {
    const resources = cacheValid ? record.resources : { calendar: null, dxy: null, reads: {} }
    return composeBriefing({
      now: new Date(),
      resources: { ...resources, quotes: bySymbol },
      dayState,
      plan,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [record, cacheValid, dayState, plan, quotes])

  return { briefing, loading: loading && !cacheValid, refreshing, refresh }
}
