import { useEffect, useMemo, useState } from 'react'
import { fxService } from './createFxService'

/**
 * Subscribe to the live FX service and receive a continuously updating list of
 * quotes. Optionally narrow to a subset of pairs.
 *
 * @param {string[]} [pairs] - restrict to these symbols; omit for all pairs
 * @returns {{ quotes: object[], byPair: Record<string, object>, mode: string }}
 */
export function useFxQuotes(pairs) {
  const [quotes, setQuotes] = useState(() => fxService.getQuotes())

  useEffect(() => fxService.subscribe(setQuotes), [])

  const filter = pairs ? new Set(pairs) : null
  const visible = useMemo(
    () => (filter ? quotes.filter((quote) => filter.has(quote.pair)) : quotes),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [quotes, pairs?.join(',')],
  )

  const byPair = useMemo(
    () => visible.reduce((map, quote) => ((map[quote.pair] = quote), map), {}),
    [visible],
  )

  return { quotes: visible, byPair, mode: fxService.getMode() }
}

/**
 * Subscribe to a single pair's live quote.
 *
 * @param {string} pair - e.g. 'EUR/USD'
 * @returns {object | undefined} the live quote, or undefined until first tick
 */
export function useFxQuote(pair) {
  const { byPair } = useFxQuotes([pair])
  return byPair[pair]
}
