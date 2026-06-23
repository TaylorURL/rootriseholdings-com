import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import { cn } from '../../lib/cn'
import { MARKETING_NAV } from '../../lib/brand'
import { useAuth } from '../../context/AuthContext'
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

const NAVBAR_TONES = new Set(['dark', 'light'])

/**
 * useNavbarTone — resolves the tone of whatever toned section currently sits
 * under the fixed navbar by hit-testing every `[data-theme]` element against a
 * probe line through the middle of the navbar's height band. Reuses the same
 * source of truth the page already declares (the alternating dark/light bands)
 * so we never re-detect colors from pixels. Re-runs on scroll, resize, and
 * route change.
 */
function useNavbarTone(defaultTone, pathname) {
  const [tone, setTone] = useState(defaultTone)
  useEffect(() => {
    if (typeof window === 'undefined') return
    let pending = false
    const probe = () => {
      pending = false
      const navbar = document.querySelector('[data-marketing-nav]')
      if (!navbar) return
      const navRect = navbar.getBoundingClientRect()
      const probeY = navRect.top + navRect.height / 2
      const sections = document.querySelectorAll('[data-theme]')
      let next = defaultTone
      for (const el of sections) {
        if (navbar.contains(el) || el === navbar) continue
        const rect = el.getBoundingClientRect()
        if (rect.top <= probeY && rect.bottom > probeY) {
          const value = el.getAttribute('data-theme')
          if (NAVBAR_TONES.has(value)) next = value
        }
      }
      setTone((prev) => (prev === next ? prev : next))
    }
    const onScroll = () => {
      if (pending) return
      pending = true
      requestAnimationFrame(probe)
    }
    probe()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [defaultTone, pathname])
  return tone
}

const linkClass = ({ isActive }) =>
  cn(
    'text-sm font-medium transition-colors',
    isActive ? 'text-text' : 'text-text-muted hover:text-text',
  )

/**
 * Public marketing top navigation: sticky, frosts on scroll, responsive menu.
 * Adaptive tone — flips its own `data-theme` to match whichever band currently
 * sits under it so the BrandMark and links stay legible over both dark and
 * light sections with a smooth color transition at boundaries.
 */
export default function MarketingNav() {
  const scrolled = useScrolled()
  const [menuOpen, setMenuOpen] = useState(false)
  const { isAuthenticated } = useAuth()
  const { pathname } = useLocation()
  const navbarTone = useNavbarTone('dark', pathname)

  // Lock body scroll while the mobile menu is open.
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [menuOpen])

  // Close the mobile drawer automatically when the route changes.
  useEffect(() => {
    setMenuOpen(false)
  }, [pathname])

  return (
    <header
      data-marketing-nav
      data-theme={navbarTone}
      className={cn(
        // `color` is in the transition list so descendant text smoothly fades
        // between tones as `data-theme` flips at section boundaries.
        'fixed inset-x-0 top-0 z-50 transition-[background-color,color,border-color,backdrop-filter] duration-300',
        scrolled || menuOpen
          ? 'border-b border-border bg-[var(--ds-backdrop)] backdrop-blur-xl'
          : 'border-b border-transparent',
      )}
    >
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 lg:px-10">
        <Link to="/" aria-label="Root & Rise home" onClick={() => setMenuOpen(false)}>
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

        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-md text-text-muted transition-colors hover:text-text lg:hidden"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
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
