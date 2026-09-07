import { Component, lazy } from 'react'

const RELOAD_KEY = 'rr.chunk-reload'

/**
 * True when the failure is from a content-hashed filename the server no longer
 * has -- the signature of a deployment that changed chunk names while a tab
 * was still open with the previous build's HTML. iOS Safari 26 surfaces the
 * same underlying failure through the lazy component's internal payload
 * access rather than the fetch layer, so `_result` in the message is treated
 * the same way.
 */
function isStaleChunkError(error) {
  if (!error) return false
  const msg = String(error.message || error || '')
  return (
    msg.includes('Failed to fetch dynamically imported module') ||
    msg.includes('Importing a module script failed') ||
    msg.includes('error loading dynamically imported module') ||
    msg.includes('Failed to load') ||
    msg.includes('Load failed') ||
    msg.includes('MIME type') ||
    msg.includes('module script') ||
    msg.includes('Unexpected token') ||
    msg.includes('without a default export') ||
    msg.includes('_result') ||
    (error instanceof TypeError && (msg.includes("reading 'default'") || msg.includes(".default'")))
  )
}

/**
 * Reload the page once so the browser fetches the current HTML, whose script
 * tags name the chunks the server actually holds. A sessionStorage timestamp
 * prevents a loop when the server itself is broken.
 *
 * Returns true when the reload was scheduled, false when the recent-reload
 * stamp refused it. The entry boot in `main.jsx` reads the same signal to
 * decide between reloading and rendering from a cleared container, so it is
 * exported here rather than duplicated there.
 */
export function reloadOnce() {
  try {
    const stamp = sessionStorage.getItem(RELOAD_KEY)
    if (stamp && Date.now() - Number(stamp) < 30_000) return false
    sessionStorage.setItem(RELOAD_KEY, String(Date.now()))
  } catch {
    // Private browsing or storage full -- try the reload anyway; the worst
    // case is one extra attempt when the server is down rather than the chunk
    // stale.
  }
  const url = new URL(window.location.href)
  url.searchParams.set('_cr', Date.now())
  window.location.replace(url)
  return true
}

export class ChunkErrorBoundary extends Component {
  state = { tripped: false }

  static getDerivedStateFromError(error) {
    if (isStaleChunkError(error)) {
      reloadOnce()
      return { tripped: true }
    }
    throw error
  }

  render() {
    if (this.state.tripped) return null
    return this.props.children
  }
}

export function withChunkReload(load) {
  return () =>
    load()
      .then((module) => {
        if (!module || typeof module.default === 'undefined') {
          if (reloadOnce()) return new Promise(() => {})
          throw new TypeError('Chunk resolved without a default export')
        }
        return module
      })
      .catch((error) => {
        // Any failure at the module-import layer means the chunk this build
        // pointed at is unusable in this tab. Reloading fetches the current
        // HTML whose script tags name the chunks the server holds; the
        // sessionStorage stamp keeps a broken server from looping.
        if (reloadOnce()) return new Promise(() => {})
        throw error
      })
}

/**
 * A route that loads its own code, and renders without a pending state when
 * that code is already in hand.
 *
 * `React.lazy` alone always suspends on its first render: the module registry
 * may hold the module, but the lazy wrapper only learns that from a promise,
 * and a promise resolves a tick later. On a document written out at build time
 * that tick is expensive - the page is already on screen, and React replaces it
 * with the pending state until the chunk reports in, so the reader watches the
 * page they were reading disappear and come back.
 *
 * Preloading records the module as it arrives, so a route that has been asked
 * for ahead of time renders straight from it and the markup in the document
 * stands. Anything not preloaded behaves exactly as `React.lazy` does.
 *
 * When a chunk fails because a deployment changed the content-hashed filenames,
 * the page reloads once so the browser picks up the current HTML and its
 * matching chunks.
 */
export function lazyRoute(loader) {
  const safeLoader = withChunkReload(loader)
  let loaded = null
  const Pending = lazy(() =>
    safeLoader().then((module) => {
      loaded = module
      return module
    })
  )

  function Route(props) {
    if (loaded) {
      const Resolved = loaded.default
      return <Resolved {...props} />
    }
    return <Pending {...props} />
  }

  Route.preload = () =>
    safeLoader().then((module) => {
      loaded = module
      return module
    })

  return Route
}
