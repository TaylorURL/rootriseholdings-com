import { Suspense, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import { JournalProvider } from './context/JournalContext'
import { SignalsProvider } from './context/SignalsContext'
import MarketingLayout from './layouts/MarketingLayout'
import ClickRipple from './components/ui/ClickRipple'
import RoutePending from './components/layout/RoutePending'
import { ChunkErrorBoundary } from './lib/lazyRoute.jsx'
import { useRouteMeta } from './lib/routeMeta.js'
import {
  HomePage,
  LoginPage,
  PrivacyPage,
  TermsPage,
  ContactPage,
  RequireAuth,
  AppShell,
  DashboardPage,
  BriefingPage,
  JournalPage,
  MarketsPage,
  SignalsPage,
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

/**
 * The journal and the signal sweep belong to the terminal alone. Both open on
 * mount - the sweep reads every instrument the desk follows and runs the
 * structure pass over each one, the journal re-reads its store on a timer - and
 * nothing on a public page reads a line of either, so they are opened by the
 * gated frame rather than by the tree above it.
 */
function DeskProviders({ children }) {
  return (
    <JournalProvider>
      <SignalsProvider>{children}</SignalsProvider>
    </JournalProvider>
  )
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
