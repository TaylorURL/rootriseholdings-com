import { useEffect, useState } from 'react'

/**
 * When the page is past its own arrival.
 *
 * Every public route is written out at build time, so the first screen owes the
 * bundle nothing: the reader has the page before a line of it has run. What the
 * page still owes is everything its live surfaces ask for the moment they are
 * adopted - a read of every instrument the desk prices, the rows those reads
 * build, and the chart engine that draws them. All of it starts inside
 * hydration, which is the one stretch where the main thread is already spoken
 * for, and on a phone the page a reader is looking at stops answering while it
 * runs.
 *
 * Held until the load event and the idle callback after it, the same work lands
 * on a thread with nothing else on it. Nothing about what any of it draws
 * changes; only when the browser is asked to start.
 */

/** How long the idle callback is given before the work is taken anyway. */
const IDLE_TIMEOUT_MS = 2_000

/** The wait that stands in for an idle callback where a browser has none. */
const IDLE_FALLBACK_MS = 200

function whenIdle(run) {
  if (typeof window.requestIdleCallback === 'function') {
    const handle = window.requestIdleCallback(run, { timeout: IDLE_TIMEOUT_MS })
    return () => window.cancelIdleCallback(handle)
  }
  const handle = window.setTimeout(run, IDLE_FALLBACK_MS)
  return () => window.clearTimeout(handle)
}

/**
 * Runs `start` once the document has loaded and the main thread has gone quiet
 * after it. A page restored from the back-forward cache, or one whose effects
 * run after the load event has already fired, waits only for the idle callback.
 *
 * @param {() => void} start
 * @returns {() => void} cancels whichever wait is still outstanding
 */
export function afterArrival(start) {
  let cancelIdle = null
  let cancelled = false
  const queue = () => {
    if (cancelled) return
    cancelIdle = whenIdle(() => {
      if (!cancelled) start()
    })
  }
  if (document.readyState === 'complete') queue()
  else window.addEventListener('load', queue, { once: true })
  return () => {
    cancelled = true
    window.removeEventListener('load', queue)
    if (cancelIdle) cancelIdle()
  }
}

/**
 * Whether the page is past its own arrival.
 *
 * False on the first render on both sides, so a surface that waits on it writes
 * the same markup into the document as the browser's first commit renders and
 * hydration has nothing to reconcile.
 */
export function useArrived() {
  const [arrived, setArrived] = useState(false)
  useEffect(() => afterArrival(() => setArrived(true)), [])
  return arrived
}
