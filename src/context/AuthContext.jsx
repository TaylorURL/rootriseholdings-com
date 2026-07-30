import { createContext, useCallback, useContext, useMemo, useState } from 'react'

/**
 * DESIGN-ONLY auth stub.
 *
 * signIn and signUp accept whatever they are given and write a session straight
 * to localStorage, which is what makes the gated app and the sign-in/sign-up
 * flows demoable end-to-end. Nothing is validated, hashed, or sent anywhere, so
 * treat any "session" this issues as decoration. This module is the whole seam:
 * a real provider replaces it without touching the consumers.
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

export function AuthProvider({ children }) {
  const [session, setSession] = useState(readStoredSession)

  const authenticate = useCallback((email, name) => {
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

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within an AuthProvider')
  return context
}
