import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import MarketingNav from '../components/marketing/MarketingNav'
import MarketingFooter from '../components/marketing/MarketingFooter'
import ScrollProgress from '../components/motion/ScrollProgress'
import { useTheme } from '../context/ThemeContext'

/** Scroll to the top whenever the marketing route changes. */
function useScrollToTopOnNavigate() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
}

/**
 * Public marketing shell. Renders in the persisted light/dark theme and provides
 * the public nav + footer around routed marketing pages.
 */
export default function MarketingLayout() {
  const { theme } = useTheme()
  useScrollToTopOnNavigate()

  return (
    <div className="ds-root flex min-h-screen flex-col bg-bg" data-theme={theme}>
      <ScrollProgress />
      <MarketingNav />
      <main className="flex-1">
        <Outlet />
      </main>
      <MarketingFooter />
    </div>
  )
}
