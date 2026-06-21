import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import MarketingNav from '../components/marketing/MarketingNav'
import MarketingFooter from '../components/marketing/MarketingFooter'
import ScrollProgress from '../components/motion/ScrollProgress'

/** Scroll to the top whenever the marketing route changes. */
function useScrollToTopOnNavigate() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
}

/**
 * Public marketing shell. Always renders in the stark dark Anduril theme,
 * independent of the in-app theme toggle. Provides the public nav + footer
 * around routed marketing pages.
 */
export default function MarketingLayout() {
  useScrollToTopOnNavigate()

  return (
    <div className="ds-root flex min-h-screen flex-col bg-bg" data-theme="dark">
      <ScrollProgress />
      <MarketingNav />
      <main className="flex-1">
        <Outlet />
      </main>
      <MarketingFooter />
    </div>
  )
}
