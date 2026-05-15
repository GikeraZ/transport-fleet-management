import { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import { api, SOCKET_URL } from '../utils/api'

export interface NotificationItem {
  id: string
  recipient_id: string
  title: string
  message: string
  type: string
  is_read: boolean
  related_entity_type?: string
  related_entity_id?: string
  created_at: string
}

interface NotificationContextType {
  notifications: NotificationItem[]
  unreadCount: number
  markAsRead: (id: string) => Promise<void>
  markAllAsRead: () => Promise<void>
  deleteNotification: (id: string) => Promise<void>
  refreshNotifications: () => Promise<void>
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

function getSocket(): Socket {
  const key = '__app_socket'
  const existing = (window as any)[key]
  if (existing?.connected) return existing

  if (existing) {
    existing.removeAllListeners()
    existing.disconnect()
  }

  const socket = io(SOCKET_URL, {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 5,
    autoConnect: true,
    timeout: 20000,
  })

  socket.on('connect', () => {
    console.log('[Socket.IO] Connected:', socket.id)
  })

  socket.on('connect_error', (err) => {
    console.error('[Socket.IO] Connection error:', err.message)
  })

  socket.on('disconnect', (reason) => {
    console.warn('[Socket.IO] Disconnected:', reason)
  })

  ;(window as any)[key] = socket
  return socket
}

window.addEventListener('beforeunload', () => {
  const socket = (window as any).__app_socket
  if (socket) {
    socket.removeAllListeners()
    socket.disconnect()
  }
})

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const socketRef = useRef<Socket | null>(null)

  const fetchNotifications = useCallback(async () => {
    try {
      const result = await api.get<{ success: boolean; data: NotificationItem[]; unreadCount: number }>('/notifications?limit=50')
      if (result.success) {
        setNotifications(result.data || [])
        setUnreadCount(result.unreadCount || 0)
      }
    } catch {
      // Silently fail
    }
  }, [])

  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [fetchNotifications])

  useEffect(() => {
    const socket = getSocket()
    socketRef.current = socket

    const handleNotification = (notification: NotificationItem) => {
      setNotifications((prev) => [notification, ...prev])
      setUnreadCount((prev) => prev + 1)
    }

    socket.on('notification', handleNotification)

    return () => {
      socket.off('notification', handleNotification)
    }
  }, [])

  const markAsRead = useCallback(async (id: string) => {
    try {
      await api.put(`/notifications/${id}/read`, {})
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)))
      setUnreadCount((prev) => Math.max(0, prev - 1))
    } catch { /* ignore */ }
  }, [])

  const markAllAsRead = useCallback(async () => {
    try {
      await api.put('/notifications/read-all', {})
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
      setUnreadCount(0)
    } catch { /* ignore */ }
  }, [])

  const deleteNotification = useCallback(async (id: string) => {
    try {
      await api.delete(`/notifications/${id}`)
      setNotifications((prev) => prev.filter((n) => n.id !== id))
    } catch { /* ignore */ }
  }, [])

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification, refreshNotifications: fetchNotifications }}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications(): NotificationContextType {
  const context = useContext(NotificationContext)
  if (context === undefined) throw new Error('useNotifications must be used within a NotificationProvider')
  return context
}
