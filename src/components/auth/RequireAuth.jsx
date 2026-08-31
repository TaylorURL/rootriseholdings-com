import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { Skeleton, SkeletonRegion } from '../ui/Skeleton'

/**
 * Route guard for the terminal at /app. Signed-out visitors go to the sign-in
 * page carrying the destination they asked for, so signing in returns them to
 * it rather than to the dashboard.
 *
 * The first render happens before the stored session has been read back, and
 * redirecting during that window would sign out anyone who reloaded a page. The
 * guard holds the frame until the provider has answered.
 */
export default function RequireAuth() {
  const { isAuthenticated, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <SkeletonRegion
        label="Restoring your session"
        className="flex min-h-dvh flex-col gap-4 bg-bg p-6"
      >
        <Skeleton className="h-8 w-48 rounded-control" />
        <Skeleton className="h-64 w-full rounded-card" />
      </SkeletonRegion>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }

  return <Outlet />
}
