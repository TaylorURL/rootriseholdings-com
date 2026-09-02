/**
 * The project's Supabase client.
 *
 * The URL and publishable key are build-time configuration rather than secrets:
 * a publishable key is designed to sit in the browser bundle, and what protects
 * the data behind it is row-level security on the tables, not the key. Both fall
 * back to the project's own values so a checkout builds and runs without an
 * `.env`, and either can be overridden per environment.
 *
 * The client is asked for rather than imported. Nothing on a public page draws
 * anything from it - the account state it answers is read after the page is
 * there, and the contact form reads it only when a message is sent - so built
 * into the entry it was a hundred kilobytes every reader parsed before the first
 * screen could be adopted, for an answer none of them was waiting on.
 */
const SUPABASE_URL =
  import.meta.env?.VITE_SUPABASE_URL ?? 'https://pwvlzopjbuwsaaqtnrkc.supabase.co'
const SUPABASE_KEY =
  import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY ?? 'sb_publishable_AtOdWJ6Paou2XCHkntZj3w_ugZRgJn2'

/** The shape of the key the client persists a session under. */
const SESSION_PREFIX = 'sb-'
const SESSION_SUFFIX = '-auth-token'

/** Whether a storage key is the one the client keeps a session in. */
export function isSessionKey(key) {
  return Boolean(key) && key.startsWith(SESSION_PREFIX) && key.endsWith(SESSION_SUFFIX)
}

/**
 * Whether this browser is holding a session for the project at all.
 *
 * The client persists a session in local storage under a key of the project's
 * own name, and nothing else writes one. No key means there is no session to
 * verify, and two hundred kilobytes of provider code cannot improve on that
 * answer, so a reader who has never signed in is never sent it. Storage the page
 * cannot read holds nothing either: the wall that hides it would have stopped
 * the client writing through it.
 */
export function hasStoredSession() {
  try {
    for (let index = 0; index < localStorage.length; index += 1) {
      if (isSessionKey(localStorage.key(index))) return true
    }
  } catch {
    // Unreadable storage carries no session.
  }
  return false
}

let client = null

/**
 * The one client, created on the first ask and handed to every one after it.
 *
 * @returns {Promise<import('@supabase/supabase-js').SupabaseClient>}
 */
export function loadSupabase() {
  if (!client) {
    client = import('@supabase/supabase-js').then(({ createClient }) =>
      createClient(SUPABASE_URL, SUPABASE_KEY, {
        auth: {
          // The session lives in browser storage and refreshes itself, so a
          // reader who closes the tab comes back signed in.
          persistSession: true,
          autoRefreshToken: true,
          // No link in an email ever brings someone back here, so there is no
          // fragment for the client to detect on load.
          detectSessionInUrl: false,
        },
      })
    )
  }
  return client
}
