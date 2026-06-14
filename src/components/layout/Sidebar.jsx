import { NavLink } from 'react-router-dom'
import { cn } from '../../lib/cn'
import { NAV_ITEMS } from './navigation'

const APP_VERSION = 'v1.0.0'

/** Fixed left navigation sidebar with brand mark and version footer. */
export default function Sidebar() {
  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-border bg-bg-elevated">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <span className="flex h-8 w-8 items-center justify-center rounded-md bg-[var(--ds-accent-face)] font-mono text-sm font-bold text-on-accent shadow-sm">
          M
        </span>
        <div className="leading-tight">
          <p className="text-sm font-semibold text-text">Miranda FX</p>
          <p className="flex items-center gap-1 text-[11px] text-text-faint">
            <span className="h-1.5 w-1.5 rounded-full bg-accent-bright" aria-hidden="true" />
            Trading Platform
          </p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-2" aria-label="Primary">
        {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'border border-border-hover bg-[var(--ds-accent-soft)] text-accent-bright'
                  : 'border border-transparent text-text-muted hover:bg-surface-2 hover:text-text',
              )
            }
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-border px-5 py-4">
        <p className="font-mono text-xs text-text-faint">{APP_VERSION}</p>
      </div>
    </aside>
  )
}
