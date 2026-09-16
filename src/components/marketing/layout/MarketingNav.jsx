import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown, Menu, X } from 'lucide-react'
import BrandMark from '../BrandMark'
import MarketingButton from '../MarketingButton'
import Plate from '../Plate'
import { COMPLIANCE, NAV_GROUPS } from '../../../lib/copy/brand'
import { cn } from '../../../lib/cn'
import { useAuth } from '../../../context/AuthContext'
import { EASE_NAV } from '../../../lib/marketingMotion'

/* Which plate each panel draws. One per panel, held here rather than beside
   the destinations, because a plate is imagery for a block and a plate keyed on
   a row is a row marker. */
const PANEL_ART = { method: 'structure', platform: 'ticket' }

/* A pointer crossing a trigger on its way somewhere else should not open a
   panel, and a pointer travelling from a trigger down into the panel it opened
   should not close it. The two delays are what buy that travel time. */
const OPEN_DELAY_MS = 90
const CLOSE_DELAY_MS = 180

/**
 * Whether the page has moved off the top, read from a sentinel rather than a
 * scroll listener: the observer fires twice per page rather than on every
 * frame, and it costs the main thread nothing in between.
 */
function useAtTop() {
  const [atTop, setAtTop] = useState(true)
  const sentinelRef = useRef(null)

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return
    const observer = new IntersectionObserver(([entry]) => setAtTop(entry.isIntersecting), {
      threshold: 0,
    })
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [])

  return { atTop, sentinelRef }
}

/** The rows on the left of an open panel. */
function PanelItems({ group, onNavigate }) {
  return (
    <ul className="grid gap-1 sm:grid-cols-2">
      {group.items.map((item) => (
        <li key={item.label}>
          <Link to={item.to} onClick={onNavigate} className="menu-row focus-ring group/item block">
            <span className="block text-sm font-semibold tracking-tight text-text">
              {item.label}
            </span>
            <span className="mt-1 block text-[13px] leading-relaxed text-text-muted">
              {item.summary}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  )
}

/** The one promoted block on the right, and the only place a plate appears. */
function PanelFeature({ feature, plate, onNavigate }) {
  return (
    <Link
      to={feature.to}
      onClick={onNavigate}
      className="focus-ring group/feature block rounded-card bg-surface p-4 shadow-[var(--ds-edge)] transition-shadow duration-200 ease-out hover:shadow-[var(--ds-raise)]"
    >
      <Plate name={plate} loading="lazy" className="mb-4" />
      <span className="block text-sm font-semibold tracking-tight text-text">{feature.label}</span>
      <span className="mt-1 block text-[13px] leading-relaxed text-text-muted">
        {feature.summary}
      </span>
    </Link>
  )
}

export default function MarketingNav() {
  const { pathname, hash } = useLocation()
  const { isAuthenticated } = useAuth()
  const { atTop, sentinelRef } = useAtTop()
  const [openKey, setOpenKey] = useState(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const panelId = useId()
  const triggerRefs = useRef(new Map())
  const timerRef = useRef(null)

  const groupsWithPanels = NAV_GROUPS.filter((group) => group.items)
  const openGroup = groupsWithPanels.find((group) => group.key === openKey) ?? null
  const surfaced = !atTop || Boolean(openKey) || drawerOpen

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const scheduleOpen = useCallback(
    (key) => {
      clearTimer()
      // Travelling between triggers with a panel already down skips the delay:
      // the panel is open, so the wait it exists to buy has been spent.
      if (openKey) {
        setOpenKey(key)
        return
      }
      timerRef.current = setTimeout(() => setOpenKey(key), OPEN_DELAY_MS)
    },
    [clearTimer, openKey]
  )

  const scheduleClose = useCallback(() => {
    clearTimer()
    timerRef.current = setTimeout(() => setOpenKey(null), CLOSE_DELAY_MS)
  }, [clearTimer])

  const closeNow = useCallback(() => {
    clearTimer()
    setOpenKey(null)
  }, [clearTimer])

  useEffect(() => clearTimer, [clearTimer])

  // A route change is an answer to whatever the bar was asking.
  useEffect(() => {
    setOpenKey(null)
    setDrawerOpen(false)
  }, [pathname, hash])

  // Escape closes whichever surface is down and hands focus back to the control
  // that opened it, so the keyboard does not end up at the top of the document.
  useEffect(() => {
    if (!openKey && !drawerOpen) return
    const onKeyDown = (event) => {
      if (event.key !== 'Escape') return
      if (openKey) {
        const trigger = triggerRefs.current.get(openKey)
        closeNow()
        trigger?.focus()
      }
      setDrawerOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [openKey, drawerOpen, closeNow])

  // The page behind an open drawer must not scroll under it.
  useEffect(() => {
    if (!drawerOpen) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [drawerOpen])

  /** Left and right walk the top level; Down enters the open panel. */
  const onTriggerKeyDown = (event, index) => {
    const keys = NAV_GROUPS.map((group) => group.key)
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault()
      const step = event.key === 'ArrowRight' ? 1 : -1
      const next = keys[(index + step + keys.length) % keys.length]
      triggerRefs.current.get(next)?.focus()
      return
    }
    if (event.key === 'ArrowDown' && NAV_GROUPS[index].items) {
      event.preventDefault()
      setOpenKey(NAV_GROUPS[index].key)
    }
  }

  const ctaLabel = isAuthenticated ? 'Open Terminal' : 'Sign In'
  const ctaTo = isAuthenticated ? '/app' : '/login'

  return (
    <>
      <span ref={sentinelRef} aria-hidden="true" className="absolute top-0 h-px w-px" />

      {/* The bar sits over a dark masthead while the page is at the top, so it
          borrows that ground rather than sampling what is behind it; once it
          surfaces it takes the reader's own setting. */}
      <header data-ground={surfaced ? undefined : 'dark'} className="fixed inset-x-0 top-0 z-nav">
        {/* The strip above the bar. A desk that does not take outside money has
            to say so where it cannot be missed, and it does not belong among
            the destinations. */}
        <div className="border-b border-[color:var(--ds-border)] bg-[color:var(--ds-bg-elevated)] text-text-faint">
          <div className="nav-pad flex h-[var(--ds-rail-height)] items-center justify-center">
            <p className="truncate text-xs tabular-nums">{COMPLIANCE.short}</p>
          </div>
        </div>

        <nav className="nav-shell" data-surfaced={surfaced} aria-label="Primary">
          <div className="nav-pad nav-row justify-between">
            <Link
              to="/"
              className="focus-ring press rounded-sm"
              aria-label={`${'Root & Rise'} home`}
            >
              <BrandMark />
            </Link>

            <ul className="hidden flex-1 items-center justify-center gap-1 lg:flex">
              {NAV_GROUPS.map((group, index) =>
                group.items ? (
                  <li
                    key={group.key}
                    onPointerEnter={() => scheduleOpen(group.key)}
                    onPointerLeave={scheduleClose}
                  >
                    <button
                      type="button"
                      ref={(node) => {
                        if (node) triggerRefs.current.set(group.key, node)
                        else triggerRefs.current.delete(group.key)
                      }}
                      className="nav-link focus-ring"
                      aria-expanded={openKey === group.key}
                      aria-controls={panelId}
                      onClick={() => setOpenKey(openKey === group.key ? null : group.key)}
                      onKeyDown={(event) => onTriggerKeyDown(event, index)}
                    >
                      {group.label}
                      <ChevronDown
                        aria-hidden="true"
                        className={cn(
                          'h-3.5 w-3.5 transition-transform duration-[var(--ds-nav-duration)] ease-nav',
                          openKey === group.key && 'rotate-180'
                        )}
                      />
                    </button>
                  </li>
                ) : (
                  <li key={group.key} onPointerEnter={scheduleClose}>
                    <Link
                      to={group.to}
                      ref={(node) => {
                        if (node) triggerRefs.current.set(group.key, node)
                        else triggerRefs.current.delete(group.key)
                      }}
                      className="nav-link focus-ring"
                      onKeyDown={(event) => onTriggerKeyDown(event, index)}
                    >
                      {group.label}
                    </Link>
                  </li>
                )
              )}
            </ul>

            <div className="flex shrink-0 items-center gap-2">
              <MarketingButton to={ctaTo} size="sm" className="hidden sm:inline-flex">
                {ctaLabel}
              </MarketingButton>
              <button
                type="button"
                className="nav-toggle focus-ring lg:hidden"
                aria-expanded={drawerOpen}
                aria-label={drawerOpen ? 'Close Menu' : 'Open Menu'}
                onClick={() => setDrawerOpen((open) => !open)}
              >
                {drawerOpen ? (
                  <X aria-hidden="true" className="h-5 w-5" />
                ) : (
                  <Menu aria-hidden="true" className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>

          {/* The panel hangs off the same shell as the bar, so the two read as
              one surface and no seam runs between them. It is opaque: it covers
              a page of type with a page of type, and anything showing through
              puts the two on top of each other while a reader is choosing. */}
          <div
            className="hidden lg:block"
            onPointerEnter={clearTimer}
            onPointerLeave={scheduleClose}
          >
            <AnimatePresence initial={false}>
              {openGroup ? (
                <motion.div
                  id={panelId}
                  key="panel"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{
                    height: { duration: 0.3, ease: EASE_NAV },
                    opacity: { duration: 0.24, ease: EASE_NAV },
                  }}
                  className="menu-sheet overflow-hidden"
                >
                  <div className="nav-pad grid gap-8 py-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
                    <div>
                      <p className="menu-head mb-4">{openGroup.label}</p>
                      <PanelItems group={openGroup} onNavigate={closeNow} />
                    </div>
                    <PanelFeature
                      feature={openGroup.feature}
                      plate={PANEL_ART[openGroup.key]}
                      onNavigate={closeNow}
                    />
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        </nav>
      </header>

      {/* The scrim dims the page under an open panel without touching it. */}
      <AnimatePresence>
        {openGroup ? (
          <motion.div
            key="scrim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: EASE_NAV }}
            className="fixed inset-0 z-scrim hidden bg-[color:var(--ds-overlay)] lg:block"
            aria-hidden="true"
          />
        ) : null}
      </AnimatePresence>

      {/* The drawer is measured against the viewport the browser is actually
          showing, scrolls inside itself when it outgrows that, and keeps its
          overscroll so the page behind it stays put. */}
      <AnimatePresence>
        {drawerOpen ? (
          <motion.div
            key="drawer"
            id="marketing-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            initial={{ opacity: 0, transform: 'translateY(-8px)' }}
            animate={{ opacity: 1, transform: 'translateY(0px)' }}
            exit={{ opacity: 0, transform: 'translateY(-8px)' }}
            transition={{ duration: 0.24, ease: EASE_NAV }}
            className="ds-scroll safe-b fixed inset-x-0 bottom-0 top-[var(--ds-chrome-height)] z-panel overflow-y-auto overscroll-contain bg-bg px-6 pb-10 pt-6 lg:hidden"
          >
            <ul className="grid gap-1">
              {NAV_GROUPS.map((group) => (
                <li key={group.key}>
                  <Link
                    to={group.to}
                    onClick={() => setDrawerOpen(false)}
                    className="focus-ring block border-b border-border py-4 text-lg font-semibold tracking-tight text-text"
                  >
                    {group.label}
                  </Link>
                  {group.items ? (
                    <ul className="grid gap-1 py-2">
                      {group.items.map((item) => (
                        <li key={item.label}>
                          <Link
                            to={item.to}
                            onClick={() => setDrawerOpen(false)}
                            className="focus-ring block rounded-control px-3 py-2.5 text-sm text-text-muted"
                          >
                            {item.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              ))}
            </ul>
            <MarketingButton to={ctaTo} size="lg" className="mt-6 w-full">
              {ctaLabel}
            </MarketingButton>
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              className="focus-ring mt-3 flex w-full items-center justify-center gap-2 rounded-control py-3 text-sm font-medium text-text-muted"
            >
              <X aria-hidden="true" className="h-4 w-4" />
              Close Menu
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  )
}
