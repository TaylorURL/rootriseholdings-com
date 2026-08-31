import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  startTransition,
} from 'react'

/**
 * Global theme system. Persists the choice to localStorage and falls back to the
 * OS `prefers-color-scheme` on first load. The resolved theme drives the
 * `data-theme` attribute on every `.ds-root` shell (marketing, app, auth) plus
 * the document root, so token CSS variables resolve consistently everywhere.
 */
const STORAGE_KEY = 'rr.theme'
const THEMES = ['dark', 'light', 'gray']

const ThemeContext = createContext(null)

/**
 * The document is written out at build time, where there is no reader and so no
 * theme to read. `useLayoutEffect` would have nothing to run against and warns;
 * after hydration it is the hook that matters, because it applies the resolved
 * theme before the browser paints rather than after.
 */
const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect

/** Resolve the initial theme: stored choice → OS preference → dark default. */
function readInitialTheme() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (THEMES.includes(stored)) return stored
  } catch {
    // Storage unavailable (private mode) — fall through to OS preference.
  }
  try {
    if (window.matchMedia('(prefers-color-scheme: light)').matches) return 'light'
  } catch {
    // matchMedia unavailable — fall through to default.
  }
  return 'dark'
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(readInitialTheme)
  // The prerendered document cannot know which theme a reader keeps, so the
  // shells carry no tone of their own until the app is running and one has been
  // resolved. Until then the tokens come from the document element, which the
  // inline resolver in index.html sets before the first paint.
  const [resolved, setResolved] = useState(false)

  // A layout effect runs inside the commit that adopts the written-out markup,
  // while the route's Suspense boundaries below are still being hydrated. An
  // urgent update reaching a boundary in that state leaves React no way to
  // reconcile it against the document, so it discards the server markup and
  // rebuilds the subtree on the client - the page a reader is already looking at,
  // thrown away and drawn again. A transition lets those boundaries finish first.
  useIsomorphicLayoutEffect(() => {
    startTransition(() => setResolved(true))
  }, [])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    // The browser paints its own chrome from this, so it reads the resolved
    // page ground rather than a colour typed into the document. Three themes
    // and one literal would leave two of them wrong.
    const ground = getComputedStyle(document.documentElement).getPropertyValue('--ds-bg').trim()
    if (ground)
      document.head.querySelector('meta[name="theme-color"]')?.setAttribute('content', ground)
    try {
      localStorage.setItem(STORAGE_KEY, theme)
    } catch {
      // Persisting is best-effort; the in-memory choice still applies.
    }
  }, [theme])

  const setTheme = useCallback((next) => {
    setThemeState(THEMES.includes(next) ? next : 'dark')
  }, [])

  /** Steps dark, light, gray, and back to dark. */
  const toggleTheme = useCallback(() => {
    setThemeState((current) => THEMES[(THEMES.indexOf(current) + 1) % THEMES.length])
  }, [])

  const value = useMemo(
    () => ({
      theme,
      isDark: theme === 'dark',
      setTheme,
      toggleTheme,
      /* What a shell puts on its own data-theme: nothing until the app runs. */
      shellTheme: resolved ? theme : undefined,
    }),
    [theme, resolved, setTheme, toggleTheme]
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme must be used within a ThemeProvider')
  return context
}
