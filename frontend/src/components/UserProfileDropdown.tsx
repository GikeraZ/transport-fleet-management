import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../contexts/AuthContext'
import {
  User, LogOut, Shield, FileText, ChevronDown, Sun, Moon,
} from 'lucide-react'
import { useTheme } from '../contexts/ThemeContext'

interface UserProfileDropdownProps { user: any }

export function UserProfileDropdown({ user }: UserProfileDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const { logout } = useAuth()
  const { theme, toggleTheme } = useTheme()

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setIsOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = async () => {
    await logout()
    setIsOpen(false)
    navigate('/login')
  }

  const getRoleBadge = (role: string) => {
    const badgeMap: Record<string, { text: string; class: string }> = {
      admin: { text: 'Admin', class: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
      superadmin: { text: 'Super Admin', class: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
      driver: { text: 'Driver', class: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
      mechanic: { text: 'Mechanic', class: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
      client: { text: 'Client', class: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
      farm_client: { text: 'Farm Client', class: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
    }
    return badgeMap[role] || { text: role, class: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400' }
  }

  const roleBadge = getRoleBadge(user?.role || '')
  const initials = user ? `${(user.first_name || '')[0]}${(user.last_name || '')[0]}`.toUpperCase() : 'U'

  return (
    <div className="relative" ref={dropdownRef}>
      <button onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 text-sm text-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring rounded-xl px-2 py-1.5 transition-all hover:bg-accent"
      >
        <div className="flex items-center gap-2">
          {user?.avatar_url ? (
            <img src={user.avatar_url} alt="Profile" className="h-8 w-8 rounded-full object-cover ring-2 ring-border" />
          ) : (
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-white text-sm font-semibold ring-2 ring-border/50">
              {initials}
            </div>
          )}
          <span className="hidden sm:inline font-medium">{user?.first_name} {user?.last_name}</span>
        </div>
        <ChevronDown className="w-4 h-4 text-muted-foreground" />
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
              className="absolute right-0 z-40 mt-2 w-64 rounded-xl border shadow-lg overflow-hidden"
              style={{ background: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}
            >
              <div className="px-4 py-3 border-b border-border">
                <div className="flex items-center gap-3">
                  {user?.avatar_url ? (
                    <img src={user.avatar_url} alt="Profile" className="h-10 w-10 rounded-full object-cover" />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-white font-semibold">
                      {initials}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{user?.first_name} {user?.last_name}</p>
                    <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                    <span className={`inline-block px-2 py-0.5 text-[10px] font-semibold rounded-full mt-1 ${roleBadge.class}`}>
                      {roleBadge.text}
                    </span>
                  </div>
                </div>
              </div>

              <div className="py-1">
                <Link to="/profile" onClick={() => setIsOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-accent transition-colors">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <span>My Profile</span>
                </Link>

                {(user?.role === 'admin' || user?.role === 'superadmin') && (
                  <Link to="/admin/users" onClick={() => setIsOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-accent transition-colors">
                    <Shield className="w-4 h-4 text-muted-foreground" />
                    <span>Manage Users</span>
                  </Link>
                )}

                <button onClick={() => { toggleTheme(); setIsOpen(false) }}
                  className="flex items-center w-full gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-accent transition-colors">
                  {theme === 'dark' ? <Sun className="w-4 h-4 text-muted-foreground" /> : <Moon className="w-4 h-4 text-muted-foreground" />}
                  <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
                </button>

                <Link to="/activity" onClick={() => setIsOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-accent transition-colors">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  <span>Activity Log</span>
                </Link>
              </div>

              <div className="border-t border-border py-1">
                <button onClick={handleLogout}
                  className="flex items-center w-full gap-3 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors">
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
