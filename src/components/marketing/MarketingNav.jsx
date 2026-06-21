import { useEffect, useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import { cn } from '../../lib/cn'
import { MARKETING_NAV } from '../../lib/brand'
import { useAuth } from '../../context/AuthContext'
import ThemeToggle from '../ui/ThemeToggle'
import BrandMark from './BrandMark'
import MarketingButton from './MarketingButton'

/** Track whether the page has scrolled past the hero fold. */
function useScrolled(threshold = 12) {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > threshold)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [threshold])
  return scrolled
}

const linkClass = ({ isActive }) =>
  cn(
    'text-sm font-medium transition-colors',
    isActive ? 'text-text' : 'text-text-muted hover:text-text',
  )

/** Public marketing top navigation: sticky, frosts on scroll, responsive menu. */
export default function MarketingNav() {
  const scrolled = useScrolled()
  const [menuOpen, setMenuOpen] = useState(false)
  const { isAuthenticated } = useAuth()

  // Lock body scroll while the mobile menu is open.
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [menuOpen])

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-50 transition-colors duration-300',
        scrolled || menuOpen
          ? 'border-b border-border bg-[var(--ds-backdrop)] backdrop-blur-xl'
          : 'border-b border-transparent',
      )}
    >
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 lg:px-10">
        <Link to="/" aria-label="Rise & Root home" onClick={() => setMenuOpen(false)}>
          <BrandMark />
        </Link>

        <div className="hidden items-center gap-8 lg:flex">
          {MARKETING_NAV.map((item) => (
            <NavLink key={item.to} to={item.to} className={linkClass}>
              {item.label}
            </NavLink>
          ))}
        </div>

        <div className="hidden items-center gap-3 lg:flex">
          <ThemeToggle />
          {isAuthenticated ? (
            <MarketingButton to="/app" size="sm">
              Open Terminal
            </MarketingButton>
          ) : (
            <>
              <MarketingButton to="/login" variant="ghost" size="sm">
                Sign In
              </MarketingButton>
              <MarketingButton to="/signup" size="sm">
                Get Access
              </MarketingButton>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 lg:hidden">
          <ThemeToggle />
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-md text-text-muted transition-colors hover:text-text"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </nav>

      {menuOpen && (
        <div className="border-t border-border bg-bg/95 px-6 py-6 lg:hidden">
          <div className="flex flex-col gap-1">
            {MARKETING_NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) =>
                  cn(
                    'rounded-md px-3 py-3 text-base font-medium transition-colors',
                    isActive ? 'bg-surface-2 text-text' : 'text-text-muted hover:bg-surface-2 hover:text-text',
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </div>
          <div className="mt-5 flex flex-col gap-3">
            <MarketingButton to="/login" variant="secondary" onClick={() => setMenuOpen(false)}>
              Sign In
            </MarketingButton>
            <MarketingButton to="/signup" onClick={() => setMenuOpen(false)}>
              Get Access
            </MarketingButton>
          </div>
        </div>
      )}
    </header>
  )
}
