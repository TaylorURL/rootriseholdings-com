import { startTransition, useEffect, useState } from 'react'
import { INSTRUMENTS } from '../../data/instruments.js'
import { fetchQuote } from './chartFeed.js'

/**
 * Live quotes for the desk's instruments.
 *
 * One shared poll serves every subscriber: components read from a single stream
 * rather than each opening its own, so the number of upstream requests is set by
 * the instrument count and not by how many charts happen to be on screen.
 *
 * A quote is either a real price or absent. An instrument the feed cannot serve
 * reports `null` and the surfaces above render that as unavailable, because a
 * number that stands in for a price is worse on a trading desk than no number.
 *
 * @typedef {object} Quote
 * @property {string} symbol - the desk's own instrument symbol
 * @property {number} price
 * @property {number|null} previousClose - the prior session's close
 * @property {number|null} change - move against that close in the instrument's own units
 * @property {number} changePct - the same move as a percentage, 0 where the feed sends none
 * @property {number|null} high - the session's high
 * @property {number|null} low - the session's low
 * @property {string|null} exchange - the venue the feed named
 * @property {number|null} marketTime - when the feed last printed, epoch ms
 * @property {string} providerSymbol - the ticker the price came from
 * @property {object[]} intraday - 5-minute bars for the current session
 */

/**
 * How often the shared poll re-reads the feed.
 *
 * The origin holds a quote at the edge for a minute, so a faster poll asks the
 * same stored copy the same question twice and spends an upstream allowance
 * the desk needs for the instruments it has not read yet.
 */
const POLL_MS = 60_000

/**
 * How many instrument reads are in flight at once.
 *
 * The registry is wide enough that reading it in one burst puts dozens of
 * requests on the wire at the same instant. The browser queues most of them
 * anyway, and the origin's upstream reads the arrival as a flood from a single
 * address, which is what earns a refusal. Bounded groups spread the same work
 * across a few seconds of a minute-long interval.
 */
const READ_WIDTH = 6

const listeners = new Set()

/** @type {{quotes: Quote[], bySymbol: Record<string, Quote>, loading: boolean, at: number|null}} */
let snapshot = { quotes: [], bySymbol: {}, loading: true, at: null }

let timer = null
let inFlight = null

function publish(next) {
  snapshot = next
  startTransition(() => listeners.forEach((listener) => listener(snapshot)))
}

/** One instrument's registry fields with its live quote folded in. */
async function readQuote(meta) {
  const quote = await fetchQuote(meta.providerSymbol)
  if (!quote) return null
  return {
    symbol: meta.symbol,
    displaySymbol: meta.displaySymbol,
    name: meta.name,
    category: meta.category,
    moveLabel: meta.moveLabel,
    primaryTimeframe: meta.primaryTimeframe,
    sideConstraint: meta.sideConstraint,
    isPrimary: meta.isPrimary,
    isWatchOnly: meta.isWatchOnly,
    ...quote,
    changePct: quote.changePct ?? 0,
  }
}

/**
 * Reads every instrument once and publishes the result as one snapshot, so the
 * interface never shows half a refresh.
 */
async function poll() {
  if (inFlight) return inFlight
  inFlight = (async () => {
    const settled = []
    for (let index = 0; index < INSTRUMENTS.length; index += READ_WIDTH) {
      const group = INSTRUMENTS.slice(index, index + READ_WIDTH)
      settled.push(...(await Promise.all(group.map(readQuote))))
    }
    const quotes = settled.filter(Boolean)
    publish({
      quotes,
      bySymbol: Object.fromEntries(quotes.map((quote) => [quote.symbol, quote])),
      loading: false,
      at: Date.now(),
    })
  })()
  try {
    await inFlight
  } finally {
    inFlight = null
  }
  return undefined
}

function start() {
  if (timer) return
  poll()
  timer = setInterval(poll, POLL_MS)
}

function stop() {
  if (!timer) return
  clearInterval(timer)
  timer = null
}

/**
 * Subscribes to the shared quote stream. The poll runs while at least one
 * component is listening and stops when the last one leaves.
 *
 * @returns {{quotes: Quote[], bySymbol: Record<string, Quote>, loading: boolean, at: number|null}}
 */
export function useInstrumentQuotes() {
  const [state, setState] = useState(snapshot)

  useEffect(() => {
    listeners.add(setState)
    start()
    setState(snapshot)
    return () => {
      listeners.delete(setState)
      if (!listeners.size) stop()
    }
  }, [])

  return state
}

/**
 * One instrument off the shared stream.
 *
 * @param {string} symbol - the desk's instrument symbol, e.g. XAUUSD
 * @returns {Quote|null} null while the first read is in flight, or when the
 *   feed does not serve this instrument
 */
export function useInstrumentQuote(symbol) {
  const { bySymbol } = useInstrumentQuotes()
  return bySymbol[symbol] ?? null
}

/** Forces a read outside the poll interval, for a manual refresh control. */
export function refreshQuotes() {
  return poll()
}
