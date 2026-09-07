import { Suspense, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import MarketingLayout from './components/marketing/layout/MarketingLayout'
import ClickRipple from './components/ui/ClickRipple'
import RoutePending from './components/layout/RoutePending'
import { ChunkErrorBoundary } from './lib/routing/lazyRoute.jsx'
import { useRouteMeta } from './lib/routing/routeMeta.js'
import {
  HomePage,
  LoginPage,
  PrivacyPage,
  TermsPage,
  ContactPage,
  RequireAuth,
  DeskProviders,
  AppShell,
  DashboardPage,
  BriefingPage,
  JournalPage,
  MarketsPage,
  SignalsPage,
  DemoAccountPage,
  InsightsPage,
  AccountPage,
} from './routes.jsx'

/**
 * Every route change opens at the top of the page. A jump to a #hash is left
 * alone - MarketingLayout owns scrolling to the section the hash names.
 */
function ScrollToTop() {
  const { pathname, hash } = useLocation()
  useEffect(() => {
    if (!hash) window.scrollTo(0, 0)
  }, [pathname, hash])
  return null
}

/** Keeps the document head describing the route on screen. */
function RouteHead() {
  useRouteMeta()
  return null
}

export function AppRoutes() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ClickRipple />
        <ScrollToTop />
        <RouteHead />
        <ChunkErrorBoundary>
          <Suspense fallback={<RoutePending />}>
            <Routes>
              <Route element={<MarketingLayout />}>
                <Route index element={<HomePage />} />
                <Route path="privacy" element={<PrivacyPage />} />
                <Route path="terms" element={<TermsPage />} />
                <Route path="contact" element={<ContactPage />} />
              </Route>

              <Route path="login" element={<LoginPage />} />

              <Route element={<RequireAuth />}>
                <Route
                  path="app"
                  element={
                    <DeskProviders>
                      <AppShell />
                    </DeskProviders>
                  }
                >
                  <Route index element={<DashboardPage />} />
                  <Route path="briefing" element={<BriefingPage />} />
                  <Route path="journal" element={<JournalPage />} />
                  <Route path="markets" element={<MarketsPage />} />
                  <Route path="signals" element={<SignalsPage />} />
                  <Route path="demo" element={<DemoAccountPage />} />
                  <Route path="insights" element={<InsightsPage />} />
                  <Route path="account" element={<AccountPage />} />
                  <Route path="positions" element={<Navigate to="/app/journal" replace />} />
                  <Route path="history" element={<Navigate to="/app/journal" replace />} />
                </Route>
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </ChunkErrorBoundary>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  )
}
