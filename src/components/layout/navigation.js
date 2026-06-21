import { LayoutDashboard, TrendingUp, Layers, History, Lightbulb, User } from 'lucide-react'

/** Primary navigation items shared by the sidebar and header title resolver. */
export const NAV_ITEMS = [
  { to: '/app', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/app/markets', label: 'Markets', icon: TrendingUp },
  { to: '/app/positions', label: 'Positions', icon: Layers },
  { to: '/app/history', label: 'History', icon: History },
  { to: '/app/insights', label: 'Insights', icon: Lightbulb },
  { to: '/app/account', label: 'Account', icon: User },
]

/** Resolve the page title for a given pathname. */
export function titleForPath(pathname) {
  const match = NAV_ITEMS.find((item) => (item.end ? pathname === item.to : pathname.startsWith(item.to)))
  return match?.label ?? 'Dashboard'
}
