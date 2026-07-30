import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

/**
 * Route guard for the gated /app surface. Redirects unauthenticated visitors to
 * the (design-only) login page, preserving the intended destination so the
 * stubbed sign-in can route them back.
 *
 * `isAuthenticated` only reflects the demo session AuthContext writes to
 * localStorage, so this gate keeps the demo coherent — it is not a security
 * boundary and everything behind it is static mock data.
 */
export default function RequireAuth() {
  const { isAuthenticated } = useAuth()
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }

  return <Outlet />
}
