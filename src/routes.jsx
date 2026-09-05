import { lazyRoute } from './lib/lazyRoute.jsx'

/**
 * Every route loads its own code, the brand page included. Keeping the home
 * page in the entry made every visitor to the terminal or the sign-in page
 * download it first; the home document preloads its chunk instead, so a first
 * visit fetches it alongside the entry rather than after it.
 */
export const HomePage = lazyRoute(() => import('./pages/marketing/HomePage'))
export const LoginPage = lazyRoute(() => import('./pages/marketing/LoginPage'))
export const PrivacyPage = lazyRoute(() =>
  import('./pages/marketing/LegalPage').then((m) => ({ default: m.PrivacyPage }))
)
export const TermsPage = lazyRoute(() =>
  import('./pages/marketing/LegalPage').then((m) => ({ default: m.TermsPage }))
)
export const ContactPage = lazyRoute(() => import('./pages/marketing/ContactPage'))

/**
 * The terminal's guard, its stores and its frame. None of them renders anywhere
 * but under /app; the frame carries the sidebar, the header and the desk rail
 * with it, and the stores carry the structure engine, the rule book and the
 * journal, so a reader on a public page pays for none of it.
 */
export const RequireAuth = lazyRoute(() => import('./components/auth/RequireAuth'))
export const DeskProviders = lazyRoute(() => import('./components/layout/DeskProviders'))
export const AppShell = lazyRoute(() => import('./components/layout/AppShell'))

export const DashboardPage = lazyRoute(() => import('./pages/DashboardPage'))
export const BriefingPage = lazyRoute(() => import('./pages/BriefingPage'))
export const JournalPage = lazyRoute(() => import('./pages/JournalPage'))
export const MarketsPage = lazyRoute(() => import('./pages/MarketsPage'))
export const SignalsPage = lazyRoute(() => import('./pages/SignalsPage'))
export const DemoAccountPage = lazyRoute(() => import('./pages/DemoAccountPage'))
export const InsightsPage = lazyRoute(() => import('./pages/InsightsPage'))
export const AccountPage = lazyRoute(() => import('./pages/AccountPage'))
