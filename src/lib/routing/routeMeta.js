import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import {
  ORIGIN,
  DEFAULT_META,
  ROUTE_META,
  BREADCRUMB_TRAILS,
  BREADCRUMB_SCRIPT_ID,
} from './routeMeta.data.js'

export { BREADCRUMB_TRAILS }

function setMeta(selector, value) {
  const tag = document.head.querySelector(selector)
  if (tag) tag.setAttribute('content', value)
}

function setBreadcrumb(pathname) {
  const trail = BREADCRUMB_TRAILS[pathname]
  const existing = document.getElementById(BREADCRUMB_SCRIPT_ID)
  if (!trail) {
    existing?.remove()
    return
  }
  const script = existing ?? document.createElement('script')
  script.id = BREADCRUMB_SCRIPT_ID
  script.type = 'application/ld+json'
  script.textContent = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      item: `${ORIGIN}${crumb.path}`,
    })),
  })
  if (!existing) document.head.appendChild(script)
}

/**
 * Keeps the document head describing the route on screen.
 *
 * Each public route is served as its own document with this metadata already in
 * the head, so a crawler that never runs the bundle reads the right title and
 * card. Moving between routes after that happens without a reload, and this is
 * what keeps the head in step with the page.
 */
export function useRouteMeta() {
  const { pathname } = useLocation()
  useEffect(() => {
    const meta = ROUTE_META[pathname] ?? DEFAULT_META
    const description = meta.description ?? DEFAULT_META.description
    const url = `${ORIGIN}${pathname === '/' ? '/' : pathname}`
    document.title = meta.title
    setMeta('meta[name="description"]', description)
    setMeta('meta[property="og:title"]', meta.title)
    setMeta('meta[property="og:description"]', description)
    setMeta('meta[property="og:url"]', url)
    setMeta('meta[name="twitter:title"]', meta.title)
    setMeta('meta[name="twitter:description"]', description)
    document.head.querySelector('link[rel="canonical"]')?.setAttribute('href', url)
    setBreadcrumb(pathname)
  }, [pathname])
}
