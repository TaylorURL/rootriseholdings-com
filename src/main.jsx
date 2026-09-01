import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import App from './App.jsx'
import { preloadRoute } from './lib/preloadRoute.js'
import { reloadOnce } from './lib/lazyRoute.jsx'
import './styles/index.css'

/**
 * Public routes are written out at build time, so the element the app mounts
 * into already holds the page. Hydrating adopts that markup and leaves it on
 * screen; creating a root would throw it away and rebuild it, which is a blank
 * frame in place of a page that had already arrived.
 *
 * The route's own code is fetched before that happens. Adopting the markup
 * with the route still loading puts React on the pending state instead, which
 * takes the page off the screen until the chunk lands and then puts it back -
 * the page shifting under a reader who was already reading it.
 *
 * The chunk can also refuse to load - a stale content-hashed filename, a cold
 * cache in an in-app browser, a network hiccup. Hydrating on a rejection is
 * the same hazard as hydrating early: the enclosing Suspense boundary's
 * `<RoutePending>` fallback stands in for the route the server wrote, React
 * refuses the mismatch (error #425), and the boundary switches into client
 * rendering (error #422). Hydration below waits on the preload's resolution,
 * with a single retry to cover the transient case; a failure past that
 * reloads the document so the browser fetches the chunks the server actually
 * holds, and the reload guard keeps a broken server from looping.
 */
const container = document.getElementById('root')
const tree = (
  <StrictMode>
    <App />
  </StrictMode>
)

function hydrate() {
  hydrateRoot(container, tree)
}

/**
 * Render into a container whose server markup can no longer be trusted to
 * match what the client would produce. The contents are cleared first so
 * React does not attempt to reconcile against them, since the whole reason
 * we reached here is that reconciliation would mismatch.
 */
function renderFromScratch() {
  container.replaceChildren()
  createRoot(container).render(tree)
}

async function bootHydrated() {
  const path = window.location.pathname
  try {
    await preloadRoute(path)
    hydrate()
    return
  } catch {
    // First attempt failed. Give the network a beat and try once more; a
    // cold cache on an in-app browser lands on this branch and recovers on
    // the retry rather than throwing the page away.
  }
  try {
    await new Promise((resolve) => setTimeout(resolve, 300))
    await preloadRoute(path)
    hydrate()
    return
  } catch {
    // Still no chunk. Reloading fetches the current HTML whose script tags
    // name the chunks the server actually holds. The 30-second stamp inside
    // `reloadOnce` keeps a broken server from looping; when it refuses, the
    // last resort is to render from a cleared container, which cannot
    // mismatch and still gives the reader a working page.
    if (reloadOnce()) return
    renderFromScratch()
  }
}

if (container.hasChildNodes()) bootHydrated()
else renderFromScratch()
