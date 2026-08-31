import { HomePage, LoginPage, PrivacyPage, TermsPage, ContactPage } from '../routes.jsx'

/**
 * The route component each written-out document needs in hand before the app
 * adopts its markup.
 */
const PRELOAD = {
  '/': HomePage,
  '/login': LoginPage,
  '/privacy': PrivacyPage,
  '/terms': TermsPage,
  '/contact': ContactPage,
}

/** Loads the code for a path, where that path is one written out at build time. */
export function preloadRoute(pathname) {
  const route = PRELOAD[pathname]
  return route ? route.preload() : Promise.resolve()
}
