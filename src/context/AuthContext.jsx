import { createContext, useCallback, useContext, useMemo, useState } from 'react'

/**
 * DESIGN-ONLY auth stub.
 *
 * TODO(auth): Replace this entire module with a real auth provider (Supabase)
 * when backend wiring lands. The signIn/signUp/signOut handlers below are no-op
 * stubs that only flip a locally-persisted "session" flag so the gated app and
 * sign-in/sign-up flows are demoable end-to-end. No credentials are validated,
 * stored securely, or sent anywhere.
 */
const STORAGE_KEY = 'rr.demo.session'

const AuthContext = createContext(null)

function readStoredSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function persistSession(session) {
  try {
    if (session) localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
    else localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Storage may be unavailable (private mode); session simply stays in memory.
  }
}

/** Provider that exposes the stubbed session and auth actions. */
export function AuthProvider({ children }) {
  const [session, setSession] = useState(readStoredSession)

  const authenticate = useCallback((email, name) => {
    // TODO(auth): swap for `supabase.auth.signInWithPassword` / `signUp`.
    const nextSession = {
      email: email || 'trader@riseandroot.com',
      name: name || email?.split('@')[0] || 'Trader',
      createdAt: new Date().toISOString(),
    }
    setSession(nextSession)
    persistSession(nextSession)
    return nextSession
  }, [])

  const signOut = useCallback(() => {
    // TODO(auth): swap for `supabase.auth.signOut`.
    setSession(null)
    persistSession(null)
  }, [])

  const value = useMemo(
    () => ({
      session,
      isAuthenticated: Boolean(session),
      signIn: authenticate,
      signUp: authenticate,
      signOut,
    }),
    [session, authenticate, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

/** Access the stubbed auth context. */
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within an AuthProvider')
  return context
}
