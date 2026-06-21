import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import MarketingLayout from './layouts/MarketingLayout'
import HomePage from './pages/marketing/HomePage'
import PricingPage from './pages/marketing/PricingPage'
import HowItWorksPage from './pages/marketing/HowItWorksPage'
import FeaturesPage from './pages/marketing/FeaturesPage'
import AboutPage from './pages/marketing/AboutPage'
import LoginPage from './pages/marketing/LoginPage'
import SignupPage from './pages/marketing/SignupPage'
import RequireAuth from './components/auth/RequireAuth'
import AppShell from './components/layout/AppShell'
import DashboardPage from './pages/DashboardPage'
import MarketsPage from './pages/MarketsPage'
import PositionsPage from './pages/PositionsPage'
import HistoryPage from './pages/HistoryPage'
import InsightsPage from './pages/InsightsPage'
import AccountPage from './pages/AccountPage'

/**
 * Two cleanly separated route groups:
 *  - Public marketing site (MarketingLayout) at `/`
 *  - Gated product terminal (AppShell behind RequireAuth) at `/app`
 * Auth pages (`/login`, `/signup`) render standalone, outside both layouts.
 */
export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public marketing site */}
          <Route element={<MarketingLayout />}>
            <Route index element={<HomePage />} />
            <Route path="how-it-works" element={<HowItWorksPage />} />
            <Route path="features" element={<FeaturesPage />} />
            <Route path="pricing" element={<PricingPage />} />
            <Route path="about" element={<AboutPage />} />
          </Route>

          {/* Standalone design-only auth */}
          <Route path="login" element={<LoginPage />} />
          <Route path="signup" element={<SignupPage />} />

          {/* Gated product terminal */}
          <Route element={<RequireAuth />}>
            <Route path="app" element={<AppShell />}>
              <Route index element={<DashboardPage />} />
              <Route path="markets" element={<MarketsPage />} />
              <Route path="positions" element={<PositionsPage />} />
              <Route path="history" element={<HistoryPage />} />
              <Route path="insights" element={<InsightsPage />} />
              <Route path="account" element={<AccountPage />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
