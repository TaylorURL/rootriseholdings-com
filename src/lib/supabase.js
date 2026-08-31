import { createClient } from '@supabase/supabase-js'

/**
 * The project's Supabase client.
 *
 * The URL and publishable key are build-time configuration rather than secrets:
 * a publishable key is designed to sit in the browser bundle, and what protects
 * the data behind it is row-level security on the tables, not the key. Both fall
 * back to the project's own values so a checkout builds and runs without an
 * `.env`, and either can be overridden per environment.
 */
const SUPABASE_URL =
  import.meta.env?.VITE_SUPABASE_URL ?? 'https://pwvlzopjbuwsaaqtnrkc.supabase.co'
const SUPABASE_KEY =
  import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY ?? 'sb_publishable_AtOdWJ6Paou2XCHkntZj3w_ugZRgJn2'

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    // The session lives in browser storage and refreshes itself, so a reader
    // who closes the tab comes back signed in.
    persistSession: true,
    autoRefreshToken: true,
    // No link in an email ever brings someone back here, so there is no
    // fragment for the client to detect on load.
    detectSessionInUrl: false,
  },
})
