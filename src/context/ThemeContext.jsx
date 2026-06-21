import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

/**
 * Global theme system. Persists the choice to localStorage and falls back to the
 * OS `prefers-color-scheme` on first load. The resolved theme drives the
 * `data-theme` attribute on every `.ds-root` shell (marketing, app, auth) plus
 * the document root, so token CSS variables resolve consistently everywhere.
 */
const STORAGE_KEY = 'rr.theme'
const THEMES = ['dark', 'light']

const ThemeContext = createContext(null)

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

/** Provider that exposes the active theme and toggling actions. */
export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(readInitialTheme)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    try {
      localStorage.setItem(STORAGE_KEY, theme)
    } catch {
      // Persisting is best-effort; the in-memory choice still applies.
    }
  }, [theme])

  const setTheme = useCallback((next) => {
    setThemeState(THEMES.includes(next) ? next : 'dark')
  }, [])

  const toggleTheme = useCallback(() => {
    setThemeState((current) => (current === 'dark' ? 'light' : 'dark'))
  }, [])

  const value = useMemo(
    () => ({ theme, isDark: theme === 'dark', setTheme, toggleTheme }),
    [theme, setTheme, toggleTheme],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

/** Access the active theme and its actions. */
export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme must be used within a ThemeProvider')
  return context
}
