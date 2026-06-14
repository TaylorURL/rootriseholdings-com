import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'

/**
 * Top-level layout: fixed sidebar, sticky header, and a scrollable main area
 * that renders the routed page via <Outlet />. Owns the theme toggle state.
 */
export default function AppShell() {
  const [theme, setTheme] = useState('dark')

  const toggleTheme = () => setTheme((current) => (current === 'dark' ? 'light' : 'dark'))

  return (
    <div className="ds-root flex h-screen overflow-hidden" data-theme={theme}>
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header theme={theme} onToggleTheme={toggleTheme} />
        <main className="ds-scroll flex-1 overflow-y-auto bg-bg px-6 py-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
