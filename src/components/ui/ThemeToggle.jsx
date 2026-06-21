import { Moon, Sun } from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'
import { cn } from '../../lib/cn'

/**
 * Icon button that toggles between light and dark themes. Reads/writes the
 * global theme context, so the choice persists and applies across every surface.
 *
 * @param {object} props
 * @param {string} [props.className] - extra classes on the button
 */
export default function ThemeToggle({ className }) {
  const { isDark, toggleTheme } = useTheme()
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      className={cn(
        'flex h-9 w-9 items-center justify-center rounded-md border border-border bg-surface-2 text-text-muted transition-colors hover:border-border-hover hover:text-text',
        className,
      )}
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  )
}
