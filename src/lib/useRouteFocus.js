import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * Keeps focus with the content across a client-side route change.
 *
 * A router swaps the page without a document load, so focus stays on whatever
 * was pressed and a screen reader goes on reading the old page. Moving it to the
 * new main region is what a full page load would have done. The first render is
 * skipped: focus already belongs wherever the browser put it.
 *
 * Attach the returned ref to a main element carrying tabIndex={-1}.
 */
export function useRouteFocus() {
  const { pathname } = useLocation()
  const ref = useRef(null)
  const mounted = useRef(false)

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true
      return
    }
    ref.current?.focus({ preventScroll: true })
  }, [pathname])

  return ref
}
