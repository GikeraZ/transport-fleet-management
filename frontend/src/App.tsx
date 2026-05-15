import { useState, Component, ReactNode } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Layout } from './components/Layout'
import { ProtectedRoute } from './components/ProtectedRoute'
import { LoadingScreen } from './components/LoadingScreen'
import { VehiclesPage } from './pages/VehiclesPage'
import { DriversPage } from './pages/DriversPage'
import { MechanicsPage } from './pages/MechanicsPage'
import { TripsPage } from './pages/TripsPage'
import { MaintenancePage } from './pages/MaintenancePage'
import { AdminDashboardPage } from './pages/AdminDashboardPage'
import { DriverDashboardPage } from './pages/DriverDashboardPage'
import { MechanicDashboardPage } from './pages/MechanicDashboardPage'
import { ClientDashboardPage } from './pages/ClientDashboardPage'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'
import { ForgotPasswordPage } from './pages/ForgotPasswordPage'
import { ResetPasswordPage } from './pages/ResetPasswordPage'
import { ChangePasswordPage } from './pages/ChangePasswordPage'
import { UsersPage } from './pages/UsersPage'
import { ProfilePage } from './pages/ProfilePage'
import { InventoryPage } from './pages/InventoryPage'
import { ReportsPage } from './pages/ReportsPage'
import { RoleManagementPage } from './pages/RoleManagementPage'
import { FuelPage } from './pages/FuelPage'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { NotificationProvider, useNotifications } from './contexts/NotificationContext'
import { ThemeProvider } from './contexts/ThemeContext'

interface Props { children: ReactNode }
interface State { hasError: boolean }
class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) { super(props); this.state = { hasError: false } }
  static getDerivedStateFromError() { return { hasError: true } }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center max-w-md px-4">
            <div className="mx-auto h-16 w-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <svg className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Something went wrong</h2>
            <p className="text-gray-500 mb-4">An unexpected error occurred. Please refresh the page.</p>
            <button onClick={() => { this.setState({ hasError: false }); window.location.href = '/' }}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700">
              Refresh Page
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 30,
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
})

function DashboardLayout() {
  const { user, isAuthenticated } = useAuth()
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification, refreshNotifications } = useNotifications()
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return (
    <Layout
      isSidebarOpen={isSidebarOpen}
      setIsSidebarOpen={setIsSidebarOpen}
      user={user}
      unreadCount={unreadCount}
      notifications={notifications}
      onMarkRead={markAsRead}
      onMarkAllRead={markAllAsRead}
      onDeleteNotification={deleteNotification}
      onRefreshNotifications={refreshNotifications}
    >
      <Outlet />
    </Layout>
  )
}

function DashboardRedirect({ from404 }: { from404?: boolean }) {
  const { isAuthenticated, isAdmin, isDriver, isMechanic, isClient, user } = useAuth()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (from404 && user?.role) {
    const dashboardMap: Record<string, string> = {
      admin: '/admin/dashboard', superadmin: '/admin/dashboard', driver: '/driver/dashboard',
      mechanic: '/mechanic/dashboard', client: '/client/dashboard', farm_client: '/client/dashboard',
    }
    return <Navigate to={dashboardMap[user.role] || '/dashboard'} replace />
  }
  if (isAdmin) return <Navigate to="/admin/dashboard" replace />
  if (isDriver) return <Navigate to="/driver/dashboard" replace />
  if (isMechanic) return <Navigate to="/mechanic/dashboard" replace />
  if (isClient) return <Navigate to="/client/dashboard" replace />
  return <Navigate to="/login" replace />
}

function AppRoutes() {
  const { isAuthenticated, loading } = useAuth()

  if (loading) {
    return <LoadingScreen />
  }

  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" /> : <LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
      <Route path="/change-password" element={<ChangePasswordPage />} />

      <Route element={<DashboardLayout />}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardRedirect />} />

        <Route path="/admin/dashboard" element={<ProtectedRoute allowedRoles={['admin', 'superadmin']}><AdminDashboardPage /></ProtectedRoute>} />
        <Route path="/driver/dashboard" element={<ProtectedRoute allowedRoles={['driver']}><DriverDashboardPage /></ProtectedRoute>} />
        <Route path="/mechanic/dashboard" element={<ProtectedRoute allowedRoles={['mechanic']}><MechanicDashboardPage /></ProtectedRoute>} />
        <Route path="/client/dashboard" element={<ProtectedRoute allowedRoles={['client', 'farm_client']}><ClientDashboardPage /></ProtectedRoute>} />

        <Route path="/admin/users" element={<ProtectedRoute allowedRoles={['admin', 'superadmin']}><UsersPage /></ProtectedRoute>} />
        <Route path="/admin/vehicles" element={<ProtectedRoute allowedRoles={['admin', 'superadmin']}><VehiclesPage /></ProtectedRoute>} />
        <Route path="/admin/drivers" element={<ProtectedRoute allowedRoles={['admin', 'superadmin']}><DriversPage /></ProtectedRoute>} />
        <Route path="/admin/mechanics" element={<ProtectedRoute allowedRoles={['admin', 'superadmin']}><MechanicsPage /></ProtectedRoute>} />
        <Route path="/admin/trips" element={<ProtectedRoute allowedRoles={['admin', 'superadmin']}><TripsPage /></ProtectedRoute>} />
        <Route path="/admin/maintenance" element={<ProtectedRoute allowedRoles={['admin', 'superadmin']}><MaintenancePage /></ProtectedRoute>} />
        <Route path="/admin/inventory" element={<ProtectedRoute allowedRoles={['admin', 'superadmin']}><InventoryPage /></ProtectedRoute>} />
        <Route path="/admin/reports" element={<ProtectedRoute allowedRoles={['admin', 'superadmin']}><ReportsPage /></ProtectedRoute>} />
        <Route path="/admin/roles" element={<ProtectedRoute allowedRoles={['admin', 'superadmin']}><RoleManagementPage /></ProtectedRoute>} />
        <Route path="/admin/fuel" element={<ProtectedRoute allowedRoles={['admin', 'superadmin']}><FuelPage /></ProtectedRoute>} />

        <Route path="/driver/trips" element={<ProtectedRoute allowedRoles={['driver']}><TripsPage isDriverView /></ProtectedRoute>} />
        <Route path="/mechanic/tasks" element={<ProtectedRoute allowedRoles={['mechanic']}><MaintenancePage isMechanicView /></ProtectedRoute>} />
        <Route path="/client/requests" element={<ProtectedRoute allowedRoles={['client', 'farm_client']}><TripsPage isClientView /></ProtectedRoute>} />

        <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />

        <Route path="/activity" element={<ProtectedRoute>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Activity Log</h1>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <p className="text-gray-500">Activity log feature coming soon.</p>
            </div>
          </div>
        </ProtectedRoute>} />

        <Route path="*" element={<ProtectedRoute><DashboardRedirect from404 /></ProtectedRoute>} />
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <AuthProvider>
              <NotificationProvider>
                <AppRoutes />
              </NotificationProvider>
            </AuthProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </Router>
  )
}
