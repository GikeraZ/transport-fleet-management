import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

interface ProtectedRouteProps {
  children: React.ReactNode
  allowedRoles?: string[]
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { isAuthenticated, user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
          <p className="mt-4 text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // If allowedRoles is specified, check if user has access
  if (allowedRoles && allowedRoles.length > 0) {
    const userRole = user?.role
    if (!allowedRoles.includes(userRole || '')) {
      // Redirect to the appropriate dashboard based on user role
      const roleDashboardMap: Record<string, string> = {
        admin: '/admin/dashboard',
        superadmin: '/admin/dashboard',
        driver: '/driver/dashboard',
        mechanic: '/mechanic/dashboard',
        client: '/client/dashboard',
        farm_client: '/client/dashboard',
      }
      const redirectPath = roleDashboardMap[userRole || ''] || '/login'
      return <Navigate to={redirectPath} replace />
    }
  }

  return <>{children}</>
}