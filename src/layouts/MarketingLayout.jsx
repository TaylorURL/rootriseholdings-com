import { Suspense, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import MarketingNav from '../components/marketing/MarketingNav'
import MarketingFooter from '../components/marketing/MarketingFooter'
import SkipLink from '../components/layout/SkipLink'
import RoutePending from '../components/layout/RoutePending'
import SplitRail from '@taylorurl/split-rail'
import { useTheme } from '../context/ThemeContext'
import { useRouteFocus } from '../lib/useRouteFocus'

/** Scroll to the top on route change, or to the section a #hash names. */
function useScrollOnNavigate() {
  const { pathname, hash } = useLocation()
  useEffect(() => {
    if (hash) {
      const target = document.getElementById(hash.slice(1))
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' })
        return
      }
    }
    window.scrollTo(0, 0)
  }, [pathname, hash])
}

/**
 * Public marketing shell: the site nav and footer around whichever marketing
 * page is routed, painted in the theme the reader has kept.
 *
 * The chrome is fixed, and the strip above the bar is the part of it that has
 * to hold its own space in flow - the bar itself rides transparent over each
 * page's navy masthead, which is why the offset here is the strip's height and
 * not the whole header's.
 */
export default function MarketingLayout() {
  const { shellTheme } = useTheme()
  const mainRef = useRouteFocus()
  useScrollOnNavigate()

  return (
    <div className="ds-root flex min-h-dvh flex-col bg-bg" data-theme={shellTheme}>
      <SkipLink />
      <MarketingNav />
      <main
        id="main-content"
        ref={mainRef}
        tabIndex={-1}
        className="flex-1 pt-[var(--ds-rail-height)] outline-none"
      >
        <Suspense fallback={<RoutePending />}>
          <Outlet />
        </Suspense>
      </main>
      <MarketingFooter>
        <SplitRail />
      </MarketingFooter>
    </div>
  )
}
