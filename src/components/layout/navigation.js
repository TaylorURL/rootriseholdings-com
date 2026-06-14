import { LayoutDashboard, TrendingUp, Layers, History, User } from 'lucide-react'

/** Primary navigation items shared by the sidebar and header title resolver. */
export const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/markets', label: 'Markets', icon: TrendingUp },
  { to: '/positions', label: 'Positions', icon: Layers },
  { to: '/history', label: 'History', icon: History },
  { to: '/account', label: 'Account', icon: User },
]

/** Resolve the page title for a given pathname. */
export function titleForPath(pathname) {
  const match = NAV_ITEMS.find((item) => (item.end ? pathname === item.to : pathname.startsWith(item.to)))
  return match?.label ?? 'Dashboard'
}
