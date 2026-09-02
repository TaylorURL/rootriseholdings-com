import {
  createContext,
  startTransition,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { useLocation } from 'react-router-dom'
import { hasStoredSession, isSessionKey, loadSupabase } from '../lib/supabase'

/**
 * Account state for the terminal, backed by Supabase auth.
 *
 * Sign-in and sign-up both go to the identity provider and both return a real
 * session, which the client persists and refreshes on its own. Consumers read
 * `session`, `user` and `isAuthenticated`, so nothing above this module knows
 * which provider is behind it.
 *
 * Nothing here sends mail. Sign-up uses email and password only - no magic
 * link, no confirmation step, no recovery flow - so the account is usable the
 * moment it is created.
 */
const AuthContext = createContext(null)

/** What the interface shows instead of the provider's own wording. */
const MESSAGES = {
  invalid_credentials: 'That email and password do not match an account.',
  user_already_exists: 'An account already exists for that email. Sign in instead.',
  email_address_invalid: 'That email address was rejected. Try another.',
  weak_password: 'Choose a password of at least 8 characters.',
  over_request_rate_limit: 'Too many attempts. Wait a moment and try again.',
  no_session: 'The account was created but could not be signed in. Try signing in with it.',
}

/**
 * The provider names a failure two ways: sign-up errors carry a code, while
 * sign-in errors carry only the sentence. Both are matched so a reader gets the
 * desk's wording either way, and an unrecognised failure still says something
 * true rather than nothing.
 */
const MESSAGE_BY_PROVIDER_TEXT = {
  'invalid login credentials': MESSAGES.invalid_credentials,
  'user already registered': MESSAGES.user_already_exists,
}

function toMessage(error) {
  if (!error) return null
  const byCode = MESSAGES[error.code]
  if (byCode) return byCode
  const byText = MESSAGE_BY_PROVIDER_TEXT[error.message?.trim().toLowerCase()]
  if (byText) return byText
  return error.message ?? 'Something went wrong. Try again.'
}

/** How long a call to the provider is given before it is reported unreachable. */
const CALL_TIMEOUT_MS = 15_000

/**
 * Bounds a provider call. A network that swallows the request rather than
 * refusing it would otherwise leave the form submitting with nothing to show,
 * which reads as the site being broken rather than the connection.
 */
async function withTimeout(promise) {
  let timer
  const timeout = new Promise((resolve) => {
    timer = setTimeout(
      () =>
        resolve({
          error: {
            message: 'Could not reach the account service. Check the connection and try again.',
          },
        }),
      CALL_TIMEOUT_MS
    )
  })
  try {
    return await Promise.race([promise, timeout])
  } finally {
    clearTimeout(timer)
  }
}

/**
 * The signed-in identity, read from claims the client has verified.
 *
 * What the browser has in storage is user input: a token can be edited there
 * and the stored copy still parses. Verifying the claims is what makes the
 * answer mean something, so every decision below is taken on this rather than
 * on the stored session.
 */
async function readIdentity(supabase) {
  const { data, error } = await supabase.auth.getClaims()
  if (error || !data?.claims) return null
  return { id: data.claims.sub, email: data.claims.email ?? null }
}

export function AuthProvider({ children }) {
  const [identity, setIdentity] = useState(null)
  const [loading, setLoading] = useState(true)
  const { pathname } = useLocation()

  // The terminal and the sign-in page decide what they show on the answer, so
  // they ask the provider for it whatever storage says. A public page spends it
  // on one button's label, and a browser holding no session has already
  // answered that.
  const mustVerify = pathname === '/login' || pathname.startsWith('/app')

  useEffect(() => {
    let active = true
    let unsubscribe = null

    // The provider's client is asked for rather than imported, so the two
    // hundred kilobytes it weighs are never in the entry every reader has to run
    // before the page can be adopted, and on a public page a reader who has
    // never signed in does not fetch it at all.
    const attach = async () => {
      const supabase = await loadSupabase()
      if (!active || unsubscribe) return

      // On a warm session the claim read resolves inside the same commit that is
      // hydrating the tree. An urgent update reaching a Suspense boundary that is
      // still adopting the server markup leaves React no way to reconcile it, so
      // the boundary is torn out and rebuilt on the client -- the page a reader is
      // already looking at, thrown away and drawn again. A transition lets the
      // hydration finish first, the same way ThemeContext defers its resolved flag.
      const settle = () =>
        readIdentity(supabase).then((next) => {
          if (!active) return
          startTransition(() => {
            setIdentity(next)
            setLoading(false)
          })
        })

      settle()

      // Covers the whole lifecycle in one place: a token refreshing in the
      // background, a sign-out in another tab, and the sign-in this tab just did.
      // Each one re-reads the claims rather than trusting the event's payload.
      const { data: subscription } = supabase.auth.onAuthStateChange(() => {
        settle()
      })
      unsubscribe = () => subscription.subscription.unsubscribe()
    }

    if (mustVerify || hasStoredSession()) attach()
    else startTransition(() => setLoading(false))

    // A sign-in in another tab writes the session to storage. Picking that up is
    // what the provider's own listener did for a page that had loaded it, and it
    // is what this does for a page that had no reason to.
    const onStorage = (event) => {
      if (isSessionKey(event.key)) attach()
    }
    window.addEventListener('storage', onStorage)

    return () => {
      active = false
      window.removeEventListener('storage', onStorage)
      if (unsubscribe) unsubscribe()
    }
  }, [mustVerify])

  const signIn = useCallback(async (email, password) => {
    const supabase = await loadSupabase()
    const { data, error } = await withTimeout(supabase.auth.signInWithPassword({ email, password }))
    if (error) return { error: toMessage(error) }
    return { session: data?.session }
  }, [])

  /**
   * Creates the account and signs it in.
   *
   * The provider returns a session with the new user, so there is no step
   * between creating an account and using it. A response carrying a user but
   * no session means the account exists and only the sign-in fell through, so
   * it is reported as something to retry rather than as a failed sign-up.
   */
  const signUp = useCallback(async (email, password) => {
    const supabase = await loadSupabase()
    const { data, error } = await withTimeout(supabase.auth.signUp({ email, password }))
    if (error) return { error: toMessage(error) }
    if (!data?.session) return { error: MESSAGES.no_session }
    return { session: data.session }
  }, [])

  const signOut = useCallback(async () => {
    const supabase = await loadSupabase()
    await supabase.auth.signOut()
    setIdentity(null)
  }, [])

  const value = useMemo(
    () => ({
      user: identity,
      email: identity?.email ?? null,
      isAuthenticated: Boolean(identity),
      loading,
      signIn,
      signUp,
      signOut,
    }),
    [identity, loading, signIn, signUp, signOut]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within an AuthProvider')
  return context
}
