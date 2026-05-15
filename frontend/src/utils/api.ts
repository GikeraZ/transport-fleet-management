import type { AuthResponse, User, LoginFormData, RegisterFormData, ResetPasswordFormData, ForgotPasswordFormData } from '../types'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001'

export { SOCKET_URL }

const getAccessToken = () => localStorage.getItem('accessToken')
const getRefreshToken = () => localStorage.getItem('refreshToken')

const storeTokens = (accessToken: string, refreshToken: string) => {
  localStorage.setItem('accessToken', accessToken)
  localStorage.setItem('refreshToken', refreshToken)
}

const clearTokens = () => {
  localStorage.removeItem('accessToken')
  localStorage.removeItem('refreshToken')
  localStorage.removeItem('user')
}

const requestCache = new Map<string, { data: unknown; timestamp: number; promise?: Promise<unknown> }>()
const CACHE_TTL = 5 * 60 * 1000

function isCacheValid(key: string): boolean {
  const cached = requestCache.get(key)
  if (!cached) return false
  return Date.now() - cached.timestamp < CACHE_TTL
}

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken()
  if (!refreshToken) return null
  try {
    const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })
    const data = await res.json()
    if (!data.success) { clearTokens(); return null }
    return data.data?.accessToken
  } catch { return null }
}

async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const accessToken = getAccessToken()
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  }
  if (accessToken) headers['authorization'] = `Bearer ${accessToken}`

  let res = await fetch(url, { ...options, headers })
  if (res.status === 401) {
    const newToken = await refreshAccessToken()
    if (newToken) {
      headers['Authorization'] = `Bearer ${newToken}`
      res = await fetch(url, { ...options, headers })
    } else {
      clearTokens()
      return res
    }
  }
  return res
}

export const authApi = {
  async getCurrentUser(): Promise<AuthResponse> {
    const res = await authFetch(`${API_BASE_URL}/auth/me`)
    const data = await res.json()
    if (!res.ok && data.error?.includes('Token expired')) {
      clearTokens()
    }
    return data
  },
  async login(data: LoginFormData): Promise<AuthResponse> {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const result = await res.json()
      if (result.success && result.data?.tokens) {
        const { accessToken, refreshToken } = result.data.tokens
        localStorage.setItem('accessToken', accessToken)
        localStorage.setItem('refreshToken', refreshToken)
        localStorage.setItem('user', JSON.stringify(result.data.user))
      }
      return result
    } catch (error) {
      return { success: false, error: 'Network error. Please check your connection.' }
    }
  },
  async register(data: RegisterFormData): Promise<AuthResponse> {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const result = await res.json()
      if (result.success && result.data?.tokens) {
        localStorage.setItem('accessToken', result.data.tokens.accessToken)
        localStorage.setItem('refreshToken', result.data.tokens.refreshToken)
        localStorage.setItem('user', JSON.stringify(result.data.user))
      }
      return result
    } catch (error) {
      return { success: false, error: 'Network error. Please check your connection.' }
    }
  },
  async forgotPassword(data: ForgotPasswordFormData): Promise<AuthResponse> {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      return await res.json()
    } catch {
      return { success: false, error: 'Network error. Please check your connection.' }
    }
  },
  async resetPassword(token: string, data: ResetPasswordFormData): Promise<AuthResponse> {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/reset-password/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      return await res.json()
    } catch {
      return { success: false, error: 'Network error. Please check your connection.' }
    }
  },
  async changePassword(data: { currentPassword: string; newPassword: string }): Promise<AuthResponse> {
    try {
      const res = await authFetch(`${API_BASE_URL}/auth/change-password`, { method: 'POST', body: JSON.stringify(data) })
      return await res.json()
    } catch {
      return { success: false, error: 'Network error. Please check your connection.' }
    }
  },
  async logout(): Promise<AuthResponse> {
    try {
      const res = await authFetch(`${API_BASE_URL}/auth/logout`, { method: 'POST' })
      clearTokens()
      return await res.json()
    } catch {
      clearTokens()
      return { success: true, message: 'Logged out successfully' }
    }
  },
  async refresh(): Promise<AuthResponse> {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: getRefreshToken() }),
      })
      const result = await res.json()
      if (result.success && result.data?.accessToken) {
        localStorage.setItem('accessToken', result.data.accessToken)
      }
      return result
    } catch {
      clearTokens()
      return { success: false, error: 'Network error' }
    }
  },
}

export const api = {
  async get<T>(endpoint: string, useCache = true): Promise<T> {
    const cacheKey = `${endpoint}`
    if (useCache && isCacheValid(cacheKey)) {
      const cached = requestCache.get(cacheKey)
      if (cached?.data) return cached.data as T
    }
    const res = await authFetch(`${API_BASE_URL}${endpoint}`)
    const data = await res.json()
    if (useCache && res.ok) {
      requestCache.set(cacheKey, { data, timestamp: Date.now() })
    }
    return data
  },
  async post<T>(endpoint: string, data?: any): Promise<T> {
    requestCache.clear()
    const res = await authFetch(`${API_BASE_URL}${endpoint}`, { method: 'POST', body: JSON.stringify(data) })
    return res.json()
  },
  async put<T>(endpoint: string, data?: any): Promise<T> {
    requestCache.clear()
    const res = await authFetch(`${API_BASE_URL}${endpoint}`, { method: 'PUT', body: JSON.stringify(data) })
    return res.json()
  },
  async delete<T>(endpoint: string): Promise<T> {
    requestCache.clear()
    const res = await authFetch(`${API_BASE_URL}${endpoint}`, { method: 'DELETE' })
    return res.json()
  },
  clearCache: (pattern?: string) => {
    if (pattern) {
      for (const key of requestCache.keys()) {
        if (key.includes(pattern)) requestCache.delete(key)
      }
    } else {
      requestCache.clear()
    }
  },
}

export const roles = {
  isAdmin: (user?: User | null) => user?.role === 'admin' || user?.role === 'superadmin',
  isDriver: (user?: User | null) => user?.role === 'driver',
  isMechanic: (user?: User | null) => user?.role === 'mechanic',
  isClient: (user?: User | null) => user?.role === 'client' || user?.role === 'farm_client',
  hasPermission: (user?: User | null, permission?: string) => {
    if (!user || !permission) return false
    return user.permissions?.includes(permission)
  },
}
