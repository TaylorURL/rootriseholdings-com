import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import App from './App.jsx'
import { preloadRoute } from './lib/preloadRoute.js'
import './styles/index.css'

/**
 * Public routes are written out at build time, so the element the app mounts
 * into already holds the page. Hydrating adopts that markup and leaves it on
 * screen; creating a root would throw it away and rebuild it, which is a blank
 * frame in place of a page that had already arrived.
 *
 * The route's own code is fetched before that happens. Adopting the markup with
 * the route still loading puts React on the pending state instead, which takes
 * the page off the screen until the chunk lands and then puts it back - the
 * page shifting under a reader who was already reading it.
 */
const container = document.getElementById('root')
const tree = (
  <StrictMode>
    <App />
  </StrictMode>
)

function start() {
  if (container.hasChildNodes()) hydrateRoot(container, tree)
  else createRoot(container).render(tree)
}

if (container.hasChildNodes()) preloadRoute(window.location.pathname).then(start, start)
else start()
