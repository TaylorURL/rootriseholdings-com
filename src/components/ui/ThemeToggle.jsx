import { Moon, Sun, SunMoon } from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'
import { cn } from '../../lib/cn'

/**
 * The icon names the theme the next press lands on, so the control reads as
 * where it goes rather than where it is.
 */
const NEXT = {
  dark: { icon: Sun, label: 'Switch to the light theme' },
  light: { icon: SunMoon, label: 'Switch to the gray theme' },
  gray: { icon: Moon, label: 'Switch to the dark theme' },
}

/**
 * Icon button that steps through the dark, light, and gray themes. Reads and
 * writes the global theme context, so the choice persists and applies across
 * every surface.
 *
 * @param {object} props
 * @param {string} [props.className] - extra classes on the button
 */
export default function ThemeToggle({ className }) {
  const { theme, toggleTheme } = useTheme()
  const next = NEXT[theme] ?? NEXT.dark
  const Icon = next.icon
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={next.label}
      className={cn(
        'press focus-ring flex h-8 w-8 items-center justify-center rounded-control border border-border text-text-muted transition-colors duration-200 ease-out [@media(hover:hover)]:hover:bg-[var(--ds-neutral-soft)] [@media(hover:hover)]:hover:text-text',
        className
      )}
    >
      <Icon className="h-4 w-4" />
    </button>
  )
}
