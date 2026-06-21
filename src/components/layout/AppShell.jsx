import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import Sidebar from './Sidebar'
import Header from './Header'
import { useTheme } from '../../context/ThemeContext'
import { EASE_OUT } from '../../lib/marketingMotion'

/**
 * Gated-terminal layout: a static sidebar on desktop and an animated drawer on
 * mobile, a sticky header, and a scrollable main area for the routed page.
 * Reads the global theme so the shell tokens match the persisted choice.
 */
export default function AppShell() {
  const { theme } = useTheme()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const { pathname } = useLocation()
  const reduceMotion = useReducedMotion()

  return (
    <div className="ds-root flex h-screen overflow-hidden" data-theme={theme}>
      {/* Desktop sidebar */}
      <div className="hidden lg:flex">
        <Sidebar />
      </div>

      {/* Mobile drawer */}
      <AnimatePresence>
        {drawerOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 bg-[var(--ds-overlay)]"
              onClick={() => setDrawerOpen(false)}
              aria-hidden="true"
            />
            <motion.div
              initial={{ transform: 'translateX(-100%)' }}
              animate={{ transform: 'translateX(0%)' }}
              exit={{ transform: 'translateX(-100%)' }}
              transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
              className="absolute inset-y-0 left-0"
            >
              <Sidebar onNavigate={() => setDrawerOpen(false)} />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="flex flex-1 flex-col overflow-hidden">
        <Header theme={theme} onToggleTheme={toggleTheme} onOpenDrawer={() => setDrawerOpen(true)} />
        <main className="ds-scroll flex-1 overflow-y-auto bg-bg px-4 py-6 sm:px-6">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: reduceMotion ? 0 : 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: reduceMotion ? 0 : -6 }}
              transition={{ duration: 0.26, ease: EASE_OUT }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  )
}
