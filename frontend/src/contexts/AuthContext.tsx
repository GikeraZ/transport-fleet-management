import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import type { User, LoginFormData, RegisterFormData, ResetPasswordFormData, ForgotPasswordFormData, UpdateUserFormData } from '../types'
import { authApi, api, roles } from '../utils/api'

interface AuthContextType {
  user: User | null
  loading: boolean
  isAuthenticated: boolean
  login: (data: LoginFormData) => Promise<{ success: boolean; error?: string }>
  register: (data: RegisterFormData) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
  forgotPassword: (data: ForgotPasswordFormData) => Promise<{ success: boolean; error?: string; message?: string }>
  resetPassword: (token: string, data: ResetPasswordFormData) => Promise<{ success: boolean; error?: string; message?: string }>
  refreshUser: () => Promise<void>
  updateProfile: (data: UpdateUserFormData) => Promise<{ success: boolean; error?: string }>
  changePassword: (data: { currentPassword: string; newPassword: string }) => Promise<{ success: boolean; error?: string }>
  isAdmin: boolean
  isDriver: boolean
  isMechanic: boolean
  isClient: boolean
  hasPermission: (permission: string) => boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const setRoleTheme = useCallback((role?: string) => {
    document.documentElement.classList.remove('theme-admin', 'theme-driver', 'theme-mechanic', 'theme-client')
    if (role === 'admin' || role === 'superadmin') document.documentElement.classList.add('theme-admin')
    else if (role === 'driver') document.documentElement.classList.add('theme-driver')
    else if (role === 'mechanic') document.documentElement.classList.add('theme-mechanic')
    else if (role === 'client' || role === 'farm_client') document.documentElement.classList.add('theme-client')
  }, [])

  useEffect(() => { loadUser() }, [])

  async function loadUser() {
    try {
      const storedUser = localStorage.getItem('user')
      if (storedUser) {
        const u = JSON.parse(storedUser) as User
        setUser(u)
        setRoleTheme(u.role)
      } else {
        try {
          const { data } = await authApi.getCurrentUser()
          if (data) {
            const u = data as unknown as User
            setUser(u)
            setRoleTheme(u.role)
            localStorage.setItem('user', JSON.stringify(u))
          }
        } catch { /* Not authenticated */ }
      }
    } catch { setUser(null) }
    finally { setLoading(false) }
  }

  async function login(data: LoginFormData) {
    try {
      const result = await authApi.login(data)
      if (result.success && result.data) {
        const u = result.data.user as unknown as User
        setUser(u)
        setRoleTheme(u.role)
        return { success: true }
      }
      const msg = (result as any).error || (Array.isArray((result as any).errors) ? (result as any).errors.map((e: any) => e.message || e).join(', ') : null) || 'Login failed'
      return { success: false, error: msg }
    } catch { return { success: false, error: 'Network error' } }
  }

  async function register(data: RegisterFormData) {
    try {
      const result = await authApi.register(data)
      if (result.success && result.data) {
        const u = result.data.user as unknown as User
        setUser(u)
        setRoleTheme(u.role)
        return { success: true }
      }
      const msg = result.error || (Array.isArray((result as any).errors) ? (result as any).errors.map((e: any) => e.message || e).join(', ') : null) || 'Registration failed'
      return { success: false, error: msg }
    } catch { return { success: false, error: 'Network error' } }
  }

  async function logout() {
    try { await authApi.logout() } catch { /* ignore */ }
    finally {
      setUser(null)
      setRoleTheme(undefined)
      localStorage.removeItem('user')
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
    }
  }

  async function forgotPassword(data: ForgotPasswordFormData) {
    try { const result = await authApi.forgotPassword(data); return { success: result.success, error: result.error, message: result.message } }
    catch { return { success: false, error: 'Network error' } }
  }

  async function resetPassword(token: string, data: ResetPasswordFormData) {
    try { const result = await authApi.resetPassword(token, data); return { success: result.success, error: result.error, message: result.message } }
    catch { return { success: false, error: 'Network error' } }
  }

  async function refreshUser() {
    try {
      const { data } = await authApi.getCurrentUser()
      if (data) { setUser(data as unknown as User); localStorage.setItem('user', JSON.stringify(data)) }
    } catch { setUser(null) }
  }

  async function updateProfile(data: UpdateUserFormData) {
    try {
      if (!user?.id) return { success: false, error: 'User not found' }
      const result = await api.put<{ success: boolean; data?: any; error?: string }>(`/users/${user.id}`, data)
      if (result.success) {
        setUser(result.data as unknown as User)
        localStorage.setItem('user', JSON.stringify(result.data))
        return { success: true }
      }
      return { success: false, error: result.error || 'Update failed' }
    } catch { return { success: false, error: 'Network error' } }
  }

  async function changePassword(data: { currentPassword: string; newPassword: string }) {
    try { const result = await authApi.changePassword(data); return { success: result.success, error: result.error } }
    catch { return { success: false, error: 'Network error' } }
  }

  const currentUser = user
  const value = {
    user: currentUser, loading, isAuthenticated: !!currentUser,
    login, register, logout, forgotPassword, resetPassword, refreshUser, updateProfile, changePassword,
    isAdmin: roles.isAdmin(currentUser), isDriver: roles.isDriver(currentUser),
    isMechanic: roles.isMechanic(currentUser), isClient: roles.isClient(currentUser),
    hasPermission: (permission: string) => roles.hasPermission(currentUser, permission),
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider')
  return context
}
