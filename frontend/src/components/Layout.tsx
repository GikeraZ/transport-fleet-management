import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Car, Users, Wrench, MapPin, Settings, Menu, X, User,
  FileText, Shield, Sun, Moon, ChevronLeft, Activity, Package, Droplets
} from 'lucide-react'
import { NotificationDropdown } from './NotificationDropdown'
import { UserProfileDropdown } from './UserProfileDropdown'
import { useTheme } from '../contexts/ThemeContext'
import type { User as UserType } from '../types'

interface MenuItem { path: string; label: string; icon: React.ElementType }

const adminNavItems: MenuItem[] = [
  { path: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/admin/vehicles', label: 'Vehicles', icon: Car },
  { path: '/admin/drivers', label: 'Drivers', icon: Users },
  { path: '/admin/mechanics', label: 'Mechanics', icon: Wrench },
  { path: '/admin/trips', label: 'Trips', icon: MapPin },
  { path: '/admin/maintenance', label: 'Maintenance', icon: Settings },
  { path: '/admin/inventory', label: 'Inventory', icon: Package },
  { path: '/admin/reports', label: 'Reports', icon: FileText },
  { path: '/admin/fuel', label: 'Fuel', icon: Droplets },
  { path: '/admin/roles', label: 'Roles', icon: Shield },
  { path: '/admin/users', label: 'Users', icon: Users },
]

const driverNavItems: MenuItem[] = [
  { path: '/driver/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/driver/trips', label: 'My Trips', icon: MapPin },
]

const mechanicNavItems: MenuItem[] = [
  { path: '/mechanic/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/mechanic/tasks', label: 'Work Orders', icon: Wrench },
]

const clientNavItems: MenuItem[] = [
  { path: '/client/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/client/requests', label: 'My Requests', icon: MapPin },
]

function getNavItems(role: string): MenuItem[] {
  switch (role) {
    case 'admin': case 'superadmin': return adminNavItems
    case 'driver': return driverNavItems
    case 'mechanic': return mechanicNavItems
    case 'client': case 'farm_client': return clientNavItems
    default: return adminNavItems
  }
}

function Sidebar({ isOpen, onClose, navItems, collapsed, onToggleCollapse, theme, toggleTheme }: {
  isOpen: boolean; onClose: () => void; navItems: MenuItem[]; collapsed: boolean; onToggleCollapse: () => void; theme: string; toggleTheme: () => void
}) {
  const location = useLocation()

  const sidebarLink = (item: MenuItem, mobile?: boolean) => {
    const Icon = item.icon
    const isActive = location.pathname === item.path ||
      (item.path.split('/').length === 3 && location.pathname.startsWith(item.path.replace(/\/[^/]+$/, '')))
    const content = (
      <div className="relative z-10 flex items-center gap-3">
        <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-white' : 'text-white/50 group-hover:text-white/80'}`} />
        {!collapsed && !mobile && <span className="truncate">{item.label}</span>}
        {mobile && <span>{item.label}</span>}
      </div>
    )
    return (
      <Link key={item.path} to={item.path} onClick={() => { if (mobile || window.innerWidth < 1024) onClose() }}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group relative ${
          isActive ? 'text-white' : 'text-white/60 hover:text-white hover:bg-white/5'
        }`}
        style={isActive ? { background: 'hsla(var(--sidebar-active), 0.3)' } : {}}
      >
        {isActive && (
          <motion.div layoutId={`sidebar-active${mobile ? '-mobile' : ''}`}
            className="absolute inset-0 rounded-xl"
            style={{ background: 'hsla(var(--sidebar-active), 0.3)' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          />
        )}
        {content}
        {isActive && !collapsed && !mobile && (
          <motion.div layoutId="active-indicator"
            className="absolute right-2 w-1.5 h-1.5 rounded-full bg-blue-400"
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          />
        )}
      </Link>
    )
  }

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={onClose} />
        )}
      </AnimatePresence>

      {/* Desktop sidebar */}
      <aside className={`fixed top-0 left-0 z-50 h-full transition-all duration-300 ease-in-out hidden lg:block ${collapsed ? 'w-20' : 'w-64'}`}
        style={{ background: 'hsl(var(--sidebar))' }}>
        <div className="flex flex-col h-full">
          <div className={`flex items-center border-b border-white/10 px-4 ${collapsed ? 'justify-center h-16' : 'h-16 justify-between'}`}>
            <Link to="/dashboard" className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shrink-0">
                <Car className="w-5 h-5 text-white" />
              </div>
              {!collapsed && (
                <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="text-lg font-bold text-white tracking-tight">
                  Fleet<span className="text-blue-400">Mgmt</span>
                </motion.span>
              )}
            </Link>
            {!collapsed && (
              <button onClick={onToggleCollapse} className="text-white/50 hover:text-white transition-colors p-1">
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}
          </div>
          <nav className="flex-1 overflow-y-auto scrollbar-thin px-3 py-4 space-y-1">
            {navItems.map(item => sidebarLink(item))}
          </nav>
          <div className={`border-t border-white/10 px-3 py-3 space-y-1 ${collapsed ? 'flex flex-col items-center' : ''}`}>
            {collapsed ? (
              <>
                <Link to="/profile" className="flex items-center justify-center p-2.5 rounded-xl text-white/60 hover:text-white hover:bg-white/5 transition-all">
                  <User className="w-5 h-5" />
                </Link>
                <Link to="/activity" className="flex items-center justify-center p-2.5 rounded-xl text-white/60 hover:text-white hover:bg-white/5 transition-all">
                  <Activity className="w-5 h-5" />
                </Link>
                <button onClick={toggleTheme} className="flex items-center justify-center p-2.5 rounded-xl text-white/60 hover:text-white hover:bg-white/5 transition-all w-full">
                  {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </button>
              </>
            ) : (
              <>
                <Link to="/profile" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-white/60 hover:text-white hover:bg-white/5 transition-all">
                  <User className="w-4 h-4" /> <span>Profile</span>
                </Link>
                <Link to="/activity" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-white/60 hover:text-white hover:bg-white/5 transition-all">
                  <Activity className="w-4 h-4" /> <span>Activity Log</span>
                </Link>
                <button onClick={toggleTheme} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-white/60 hover:text-white hover:bg-white/5 transition-all w-full">
                  {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                  <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
                </button>
              </>
            )}
          </div>
        </div>
      </aside>

      {/* Mobile sidebar */}
      <AnimatePresence>
        {isOpen && (
          <motion.aside initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed top-0 left-0 z-50 h-full w-72 lg:hidden"
            style={{ background: 'hsl(var(--sidebar))' }}>
            <div className="flex items-center justify-between h-16 px-4 border-b border-white/10">
              <Link to="/dashboard" className="flex items-center gap-2.5" onClick={onClose}>
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
                  <Car className="w-5 h-5 text-white" />
                </div>
                <span className="text-lg font-bold text-white">Fleet<span className="text-blue-400">Mgmt</span></span>
              </Link>
              <button onClick={onClose} className="text-white/60 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="overflow-y-auto scrollbar-thin px-3 py-4 space-y-1 h-[calc(100%-4rem)]">
              {navItems.map(item => sidebarLink(item, true))}
              <div className="pt-4 mt-4 border-t border-white/10 space-y-1">
                <Link to="/profile" onClick={onClose}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-white/60 hover:text-white hover:bg-white/5 transition-all">
                  <User className="w-4 h-4" /> Profile
                </Link>
                <Link to="/activity" onClick={onClose}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-white/60 hover:text-white hover:bg-white/5 transition-all">
                  <Activity className="w-4 h-4" /> Activity Log
                </Link>
                <button onClick={toggleTheme}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-white/60 hover:text-white hover:bg-white/5 transition-all w-full">
                  {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                  <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
                </button>
              </div>
            </nav>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  )
}

interface LayoutProps {
  children: React.ReactNode
  isSidebarOpen: boolean
  setIsSidebarOpen: (open: boolean) => void
  user?: UserType | null
  unreadCount?: number
  notifications?: any[]
  onMarkRead?: (id: string) => void
  onMarkAllRead?: () => void
  onDeleteNotification?: (id: string) => void
  onRefreshNotifications?: () => Promise<void>
}

export function Layout({
  children, isSidebarOpen, setIsSidebarOpen, user, unreadCount = 0,
  notifications = [], onMarkRead, onMarkAllRead, onDeleteNotification, onRefreshNotifications
}: LayoutProps) {
  const [collapsed, setCollapsed] = useState(false)
  const location = useLocation()
  const { theme, toggleTheme } = useTheme()
  const navItems = getNavItems(user?.role || 'admin')

  const currentPage = navItems.find(i =>
    location.pathname === i.path ||
    (i.path.split('/').length === 3 && location.pathname.startsWith(i.path.replace(/\/[^/]+$/, '')))
  )

  return (
    <div className="min-h-screen bg-background">
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        navItems={navItems}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(!collapsed)}
        theme={theme}
        toggleTheme={toggleTheme}
      />
      <div className={`transition-all duration-300 ${collapsed ? 'lg:pl-20' : 'lg:pl-64'}`}>
        <header className="sticky top-0 z-30 border-b" style={{ background: 'hsl(var(--background) / 0.8)', backdropFilter: 'blur(12px)', borderColor: 'hsl(var(--border))' }}>
          <div className="flex items-center justify-between h-16 px-4 lg:px-6">
            <div className="flex items-center gap-3">
              <button onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="lg:hidden p-2 rounded-xl text-muted-foreground hover:bg-accent hover:text-foreground transition-all">
                <Menu className="w-5 h-5" />
              </button>
              <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">Fleet Management</span>
                <span className="text-muted-foreground/50">/</span>
                <span className="capitalize">{currentPage?.label || 'Dashboard'}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={toggleTheme}
                className="hidden sm:flex p-2 rounded-xl text-muted-foreground hover:bg-accent hover:text-foreground transition-all">
                {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
              <NotificationDropdown
                notifications={notifications}
                unreadCount={unreadCount}
                onMarkRead={onMarkRead || (() => {})}
                onMarkAllRead={onMarkAllRead || (() => {})}
                onDelete={onDeleteNotification || (() => {})}
                onRefresh={onRefreshNotifications || (async () => {})}
              />
              <div className="hidden sm:block w-px h-6 bg-border" />
              <UserProfileDropdown user={user} />
            </div>
          </div>
        </header>
        <motion.main
          key={location.pathname}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="p-4 lg:p-6 pb-20 lg:pb-6"
        >
          {children}
        </motion.main>
      </div>
    </div>
  )
}
