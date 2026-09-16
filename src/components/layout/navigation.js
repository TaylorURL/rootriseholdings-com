import {
  LayoutDashboard,
  Newspaper,
  NotebookPen,
  Radio,
  TrendingUp,
  Lightbulb,
  User,
  Wallet,
} from 'lucide-react'

/**
 * Primary navigation, in the order a session uses it: read the day, work it,
 * then account for it. A flat list of seven leaves that order to be inferred
 * from the icons.
 */
export const NAV_GROUPS = [
  {
    heading: 'Read',
    items: [
      { to: '/app', label: 'Dashboard', icon: LayoutDashboard, end: true },
      { to: '/app/briefing', label: 'Briefing', icon: Newspaper },
    ],
  },
  {
    heading: 'Work',
    items: [
      { to: '/app/markets', label: 'Markets', icon: TrendingUp },
      { to: '/app/signals', label: 'Signals', icon: Radio },
      { to: '/app/journal', label: 'Journal', icon: NotebookPen },
    ],
  },
  {
    heading: 'Account For',
    items: [
      { to: '/app/demo', label: 'Demo Account', icon: Wallet },
      { to: '/app/insights', label: 'Insights', icon: Lightbulb },
      { to: '/app/account', label: 'Account', icon: User },
    ],
  },
]

/** The same destinations flat, for anything that resolves a route to a label. */
const NAV_ITEMS = NAV_GROUPS.flatMap((group) => group.items)

export function titleForPath(pathname) {
  const match = NAV_ITEMS.find((item) =>
    item.end ? pathname === item.to : pathname.startsWith(item.to)
  )
  return match?.label ?? 'Dashboard'
}
