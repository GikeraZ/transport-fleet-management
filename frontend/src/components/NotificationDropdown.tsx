import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, AlertCircle, Info, X, CheckCheck } from 'lucide-react'

interface NotificationItem {
  id: string; title: string; message: string; type: string
  is_read: boolean; created_at: string; related_entity_type?: string; related_entity_id?: string
}

interface NotificationDropdownProps {
  notifications: NotificationItem[]; unreadCount: number
  onMarkRead: (id: string) => void; onMarkAllRead: () => void
  onDelete: (id: string) => void; onRefresh: () => Promise<void>
}

export function NotificationDropdown({
  notifications, unreadCount, onMarkRead, onMarkAllRead, onDelete, onRefresh,
}: NotificationDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setIsOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleToggle = useCallback(() => {
    if (!isOpen) onRefresh()
    setIsOpen(!isOpen)
  }, [isOpen, onRefresh])

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'trip_assignment': return <AlertCircle className="w-4 h-4 text-blue-500" />
      case 'task_update': return <Info className="w-4 h-4 text-green-500" />
      case 'maintenance_reminder': return <AlertCircle className="w-4 h-4 text-amber-500" />
      default: return <Info className="w-4 h-4 text-muted-foreground" />
    }
  }

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutesAgo = Math.floor(diff / 60000)
    if (minutesAgo < 1) return 'Just now'
    if (minutesAgo < 60) return `${minutesAgo}m ago`
    const hoursAgo = Math.floor(minutesAgo / 60)
    if (hoursAgo < 24) return `${hoursAgo}h ago`
    if (hoursAgo < 48) return 'Yesterday'
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button onClick={handleToggle}
        className="relative p-2 rounded-xl text-muted-foreground hover:bg-accent hover:text-foreground transition-all focus:outline-none focus:ring-2 focus:ring-ring"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-background"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </motion.span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setIsOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -5, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -5, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 z-40 mt-2 w-80 rounded-xl border shadow-lg overflow-hidden"
              style={{ background: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}
            >
              <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                <h3 className="text-sm font-semibold">Notifications</h3>
                {unreadCount > 0 && (
                  <button onClick={() => { onMarkAllRead(); setIsOpen(false) }}
                    className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-medium">
                    <CheckCheck className="w-3.5 h-3.5" /> Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto scrollbar-thin">
                {notifications.length === 0 ? (
                  <div className="px-4 py-10 text-center">
                    <Bell className="w-10 h-10 mx-auto text-muted-foreground/30 mb-2" />
                    <p className="text-sm text-muted-foreground">No notifications</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">You're all caught up!</p>
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <div key={notification.id}
                      className={`px-4 py-3 hover:bg-accent/50 transition-colors border-b border-border last:border-b-0 cursor-pointer ${
                        !notification.is_read ? 'bg-primary/5' : ''
                      }`}
                      onClick={() => { if (!notification.is_read) onMarkRead(notification.id) }}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-1">{getTypeIcon(notification.type)}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-medium leading-tight truncate">{notification.title}</p>
                            {!notification.is_read && (
                              <motion.span
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="flex-shrink-0 w-2 h-2 bg-primary rounded-full mt-1.5"
                              />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{notification.message}</p>
                          <p className="text-[10px] text-muted-foreground/60 mt-1">{formatTime(notification.created_at)}</p>
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); onDelete(notification.id) }}
                          className="flex-shrink-0 p-1 text-muted-foreground/50 hover:text-red-500 rounded-full hover:bg-red-50 dark:hover:bg-red-950/30 transition-all opacity-0 group-hover:opacity-100">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
