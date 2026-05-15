import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Car, Users, Wrench, MapPin, AlertTriangle, CheckCircle, Activity, TrendingUp, Truck, TimerReset } from 'lucide-react'
import { api } from '../utils/api'
import { StatCard } from '../components/StatCard'
import { StatusBadge } from '../components/StatusBadge'
import { LoadingScreen } from '../components/LoadingScreen'
import { useAuth } from '../contexts/AuthContext'
import { io, Socket } from 'socket.io-client'
import { SOCKET_URL } from '../utils/api'

function getSocket(): Socket {
  const key = '__app_socket'
  const existing = (window as any)[key]
  if (existing?.connected) return existing
  const socket = io(SOCKET_URL, { transports: ['polling'], reconnection: true, reconnectionDelay: 2000 })
  ;(window as any)[key] = socket
  return socket
}

export function AdminDashboardPage() {
  const { user } = useAuth()
  const [stats, setStats] = useState({ vehicles: 0, drivers: 0, mechanics: 0, activeTrips: 0, pendingMaintenance: 0, completedToday: 0, totalUsers: 0 })
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState('just now')

  const loadStats = useCallback(async () => {
    try {
      const [vRes, dRes, mRes, tRes, mtRes, uRes] = await Promise.all([
        api.get<any>('/vehicles?limit=1'),
        api.get<any>('/drivers?limit=1'),
        api.get<any>('/mechanics?limit=1'),
        api.get<any>('/trips?status=in_progress&limit=1'),
        api.get<any>('/maintenance?limit=1'),
        api.get<any>('/users?limit=1'),
      ])
      setStats({
        vehicles: vRes.pagination?.total || vRes.data?.length || 0,
        drivers: dRes.pagination?.total || dRes.data?.length || 0,
        mechanics: mRes.pagination?.total || mRes.data?.length || 0,
        activeTrips: tRes.pagination?.total || tRes.data?.length || 0,
        pendingMaintenance: mtRes.pagination?.total || mtRes.data?.length || 0,
        completedToday: 0,
        totalUsers: uRes.data?.pagination?.total || uRes.data?.users?.length || 0,
      })
      setLastUpdated(new Date().toLocaleTimeString())
    } catch (e) { console.error('Dashboard load error:', e) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { loadStats() }, [loadStats])

  useEffect(() => {
    const socket = getSocket()
    socket.emit('joinAdminRoom')
    const userStr = localStorage.getItem('user')
    const userId = userStr ? JSON.parse(userStr).id : null
    if (userId) socket.emit('joinUserRoom', userId)

    let refreshTimer: ReturnType<typeof setTimeout> | null = null
    const scheduleRefresh = () => {
      if (refreshTimer) clearTimeout(refreshTimer)
      refreshTimer = setTimeout(() => {
        api.clearCache()
        loadStats()
      }, 500)
    }
    const handleUpdate = () => scheduleRefresh()

    socket.on('trip:claimed', handleUpdate)
    socket.on('trip:status-update', handleUpdate)
    socket.on('trip:new', handleUpdate)

    return () => {
      socket.emit('leaveAdminRoom')
      if (userId) socket.emit('leaveUserRoom', userId)
      socket.off('trip:claimed', handleUpdate)
      socket.off('trip:status-update', handleUpdate)
      socket.off('trip:new', handleUpdate)
      if (refreshTimer) clearTimeout(refreshTimer)
    }
  }, [loadStats])

  const fleetData = [
    { name: 'Active', value: Math.max(1, stats.vehicles - 1), color: '#10B981' },
    { name: 'Under Maintenance', value: 1, color: '#F59E0B' },
    { name: 'Inactive', value: Math.max(0, stats.vehicles - 2), color: '#EF4444' },
  ]

  const weeklyRequests = [
    { day: 'Mon', requests: 4, completed: 3 },
    { day: 'Tue', requests: 7, completed: 5 },
    { day: 'Wed', requests: 5, completed: 4 },
    { day: 'Thu', requests: 8, completed: 6 },
    { day: 'Fri', requests: 6, completed: 5 },
    { day: 'Sat', requests: 3, completed: 2 },
    { day: 'Sun', requests: 2, completed: 1 },
  ]

  const recentActivity = [
    { icon: CheckCircle, text: 'Trip ABC-1234 completed successfully', time: '2 min ago', color: 'text-green-500', status: 'completed' },
    { icon: TimerReset, text: 'Maintenance scheduled for Bus DEF-9012', time: '15 min ago', color: 'text-blue-500', status: 'scheduled' },
    { icon: AlertTriangle, text: 'Van XYZ-5678 service due in 3 days', time: '1 hour ago', color: 'text-amber-500', status: 'pending' },
    { icon: Users, text: 'New driver Michael Chen assigned to Route 7', time: '2 hours ago', color: 'text-purple-500', status: 'active' },
    { icon: MapPin, text: 'Trip GHI-3456 departed for Green Valley Farm', time: '3 hours ago', color: 'text-indigo-500', status: 'in_progress' },
  ]

  if (loading) return <LoadingScreen fullScreen={false} />

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Welcome back, {user?.first_name}</h1>
          <p className="text-sm text-muted-foreground mt-1">Here's what's happening with your fleet today.</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-2 text-sm text-muted-foreground bg-card border rounded-lg px-3 py-2">
            <Activity className="w-4 h-4 text-primary" />
            <span className="hidden sm:inline">Last updated: {lastUpdated}</span>
          </span>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard label="Total Vehicles" value={stats.vehicles} icon={Car} color="blue" delay={0} />
        <StatCard label="Active Drivers" value={stats.drivers} icon={Users} color="emerald" delay={0.05} />
        <StatCard label="Mechanics" value={stats.mechanics} icon={Wrench} color="amber" delay={0.1} />
        <StatCard label="Active Trips" value={stats.activeTrips} icon={MapPin} color="indigo" delay={0.15} />
        <StatCard label="Pending Maintenance" value={stats.pendingMaintenance} icon={AlertTriangle} color="rose" delay={0.2} />
        <StatCard label="Total Users" value={stats.totalUsers} icon={Users} color="purple" delay={0.25} />
      </div>

      {/* Charts & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Fleet Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="dashboard-card p-5 lg:col-span-1"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold">Fleet Status</h3>
            <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">{stats.vehicles} total</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={fleetData} cx="50%" cy="50%" innerRadius={60} outerRadius={90}
                  dataKey="value" paddingAngle={3}
                >
                  {fleetData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} stroke="transparent" />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                  labelStyle={{ color: 'hsl(var(--foreground))' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-3 gap-2 mt-2">
            {fleetData.map((item, i) => (
              <div key={i} className="text-center">
                <div className="flex items-center justify-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ background: item.color }} />
                  <span className="text-xs text-muted-foreground">{item.name}</span>
                </div>
                <p className="text-sm font-semibold mt-0.5">{item.value}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Weekly Requests Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="dashboard-card p-5 lg:col-span-2"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold">Weekly Transport Activity</h3>
            <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="w-3 h-3" /> +12% vs last week
            </span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyRequests} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                  labelStyle={{ color: 'hsl(var(--foreground))' }}
                />
                <Bar dataKey="requests" name="Requests" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="completed" name="Completed" fill="#10B981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="dashboard-card"
        >
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h3 className="text-sm font-semibold">Recent Activity</h3>
            <span className="text-xs text-muted-foreground">Today</span>
          </div>
          <div className="p-5 space-y-1">
            {recentActivity.map((item, idx) => {
              const Icon = item.icon
              return (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.25 + idx * 0.05 }}
                  className="flex items-start gap-3 py-2.5 group hover:bg-accent/50 rounded-lg px-2 -mx-2 transition-colors"
                >
                  <div className={`p-1.5 rounded-lg ${item.color} bg-current/10`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground">{item.text}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-muted-foreground">{item.time}</span>
                      <StatusBadge status={item.status} size="sm" />
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="dashboard-card"
        >
          <div className="px-5 py-4 border-b border-border">
            <h3 className="text-sm font-semibold">Quick Actions</h3>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Add Vehicle', icon: Car, iconClass: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50' },
                { label: 'Create Trip', icon: MapPin, iconClass: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50' },
                { label: 'Schedule Maintenance', icon: Wrench, iconClass: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50' },
                { label: 'Add User', icon: Users, iconClass: 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/50' },
                { label: 'View Reports', icon: Activity, iconClass: 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50' },
                { label: 'Manage Inventory', icon: Truck, iconClass: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50' },
              ].map((action) => {
                const Icon = action.icon
                return (
                  <motion.button
                    key={action.label}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex items-center gap-3 p-3 rounded-xl border bg-card hover:bg-accent transition-all text-left"
                  >
                    <div className={`p-2 rounded-lg ${action.iconClass}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-medium">{action.label}</span>
                  </motion.button>
                )
              })}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
