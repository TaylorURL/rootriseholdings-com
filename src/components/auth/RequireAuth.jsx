import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

/**
 * Route guard for the gated /app surface. Redirects unauthenticated visitors to
 * the (design-only) login page, preserving the intended destination so the
 * stubbed sign-in can route them back.
 *
 * TODO(auth): real session validation replaces the stubbed `isAuthenticated`.
 */
export default function RequireAuth() {
  const { isAuthenticated } = useAuth()
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }

  return <Outlet />
}
