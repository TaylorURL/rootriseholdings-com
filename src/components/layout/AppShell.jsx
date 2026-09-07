import { Suspense, useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import Sidebar from './Sidebar'
import SplitRail from '@taylorurl/split-rail'
import Header from './Header'
import DeskRail from './DeskRail'
import SkipLink from './SkipLink'
import RoutePending from './RoutePending'
import { useTheme } from '../../context/ThemeContext'
import { useRouteFocus } from '../../lib/routing/useRouteFocus'
import { EASE_DRAWER, EASE_OUT } from '../../lib/marketingMotion'

export default function AppShell() {
  const { shellTheme } = useTheme()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const { pathname } = useLocation()
  const reduceMotion = useReducedMotion()
  const mainRef = useRouteFocus()

  // The drawer covers the page, so Escape has to close it: on a keyboard there
  // is otherwise no way out except tabbing to the control that opened it.
  useEffect(() => {
    if (!drawerOpen) return undefined
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setDrawerOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [drawerOpen])

  return (
    <div className="ds-root flex h-dvh overflow-hidden" data-theme={shellTheme}>
      <SkipLink />
      <div className="hidden lg:flex">
        <Sidebar />
      </div>

      <AnimatePresence>
        {drawerOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            {/* Dismissal runs at about two thirds of the open, on the scrim and
                the panel alike: matching them makes the drawer feel reluctant to
                close. */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.13 } }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 cursor-pointer touch-manipulation bg-[var(--ds-overlay)]"
              onClick={() => setDrawerOpen(false)}
              aria-hidden="true"
            />
            <motion.div
              initial={{ transform: 'translateX(-100%)' }}
              animate={{ transform: 'translateX(0%)' }}
              exit={{
                transform: 'translateX(-100%)',
                transition: { duration: 0.19, ease: EASE_DRAWER },
              }}
              transition={{ duration: 0.28, ease: EASE_DRAWER }}
              className="absolute inset-y-0 left-0"
            >
              <Sidebar onNavigate={() => setDrawerOpen(false)} />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="flex flex-1 flex-col overflow-hidden">
        <DeskRail />
        <Header onOpenDrawer={() => setDrawerOpen(true)} />
        <main
          id="main-content"
          ref={mainRef}
          tabIndex={-1}
          className="ds-scroll flex-1 overflow-y-auto overscroll-contain bg-bg px-4 py-6 outline-none sm:px-6"
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={pathname}
              initial={{ opacity: 0, transform: `translateY(${reduceMotion ? 0 : 10}px)` }}
              animate={{ opacity: 1, transform: 'translateY(0px)' }}
              exit={{
                opacity: 0,
                transform: `translateY(${reduceMotion ? 0 : -6}px)`,
                transition: { duration: 0.17, ease: EASE_OUT },
              }}
              transition={{ duration: 0.26, ease: EASE_OUT }}
            >
              <Suspense fallback={<RoutePending />}>
                <Outlet />
              </Suspense>
            </motion.div>
          </AnimatePresence>
        </main>
        <SplitRail />
      </div>
    </div>
  )
}
