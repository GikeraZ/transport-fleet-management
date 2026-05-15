import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Wrench, Clock, CheckCircle, ArrowRight, Hammer, AlertTriangle, Settings, Activity } from 'lucide-react'
import { api } from '../utils/api'
import { StatCard } from '../components/StatCard'
import { StatusBadge } from '../components/StatusBadge'
import { LoadingScreen } from '../components/LoadingScreen'

export function MechanicDashboardPage() {
  const [stats, setStats] = useState({ pendingTasks: 0, inProgressTasks: 0, completedToday: 0 })
  const [recentTasks, setRecentTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [scheduled, inProgress, completed] = await Promise.all([
          api.get<any>('/maintenance?status=scheduled&limit=5'),
          api.get<any>('/maintenance?status=in_progress&limit=5'),
          api.get<any>('/maintenance?status=completed&limit=3'),
        ])
        setStats({
          pendingTasks: scheduled.pagination?.total || scheduled.data?.length || 0,
          inProgressTasks: inProgress.pagination?.total || inProgress.data?.length || 0,
          completedToday: completed.pagination?.total || completed.data?.length || 0,
        })
        setRecentTasks([...(scheduled.data || []), ...(inProgress.data || [])].slice(0, 5))
      } catch (e) { console.error('Dashboard error:', e) }
      finally { setLoading(false) }
    }
    load()
  }, [])

  if (loading) return <LoadingScreen fullScreen={false} />

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold tracking-tight">Mechanic Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Overview of your maintenance tasks and work orders.</p>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Pending Tasks" value={stats.pendingTasks} icon={Hammer} color="blue" delay={0} />
        <StatCard label="In Progress" value={stats.inProgressTasks} icon={Clock} color="amber" delay={0.05} />
        <StatCard label="Completed Today" value={stats.completedToday} icon={CheckCircle} color="emerald" delay={0.1} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Work Orders */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="dashboard-card lg:col-span-2"
        >
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Wrench className="w-4 h-4 text-primary" />
              Assigned Work Orders
            </h3>
            <Link to="/mechanic/tasks" className="text-xs font-medium text-primary hover:underline flex items-center gap-1">
              View All <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {recentTasks.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-muted flex items-center justify-center mb-3">
                <Wrench className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium">No maintenance tasks assigned</p>
              <p className="text-xs text-muted-foreground mt-1">New tasks will appear here when assigned</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {recentTasks.map((task: any, idx: number) => (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.15 + idx * 0.05 }}
                  className="px-5 py-4 hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <StatusBadge status={task.status} size="sm" />
                        <span className="text-sm font-semibold">{task.task_type || 'Maintenance Task'}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {task.vehicle_license_plate || 'Vehicle'} {task.description ? `- ${task.description}` : ''}
                      </p>
                      {task.scheduled_date && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Scheduled: {new Date(task.scheduled_date).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {task.status === 'scheduled' && (
                        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                          className="px-3 py-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-950/50 transition-all">
                          Start Task
                        </motion.button>
                      )}
                      {task.status === 'in_progress' && (
                        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                          className="px-3 py-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-950/50 transition-all">
                          Complete
                        </motion.button>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Right Column */}
        <div className="space-y-4">
          {/* Parts Usage */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="dashboard-card"
          >
            <div className="px-5 py-4 border-b border-border">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Settings className="w-4 h-4 text-primary" />
                Parts Usage Summary
              </h3>
            </div>
            <div className="p-5 space-y-3">
              {[
                { name: 'Oil Filters', used: 3, total: 10, color: 'bg-blue-500' },
                { name: 'Brake Pads', used: 2, total: 8, color: 'bg-amber-500' },
                { name: 'Tires', used: 0, total: 12, color: 'bg-emerald-500' },
                { name: 'Air Filters', used: 5, total: 10, color: 'bg-purple-500' },
              ].map((part, i) => (
                <div key={i} className="space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{part.name}</span>
                    <span className="font-medium">{part.used} used</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(part.used / part.total) * 100}%` }}
                      transition={{ delay: 0.3 + i * 0.1, duration: 0.6, ease: 'easeOut' }}
                      className={`h-full rounded-full ${part.color}`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="dashboard-card"
          >
            <div className="px-5 py-4 border-b border-border">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Activity className="w-4 h-4 text-primary" />
                Quick Actions
              </h3>
            </div>
            <div className="p-5 space-y-2">
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                className="w-full flex items-center gap-3 p-3 rounded-xl border bg-card hover:bg-accent transition-all">
                <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
                  <Settings className="w-4 h-4" />
                </div>
                <span className="text-sm font-medium">Log Parts Used</span>
              </motion.button>
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                className="w-full flex items-center gap-3 p-3 rounded-xl border bg-card hover:bg-accent transition-all">
                <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <span className="text-sm font-medium">Report Vehicle Issue</span>
              </motion.button>
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                className="w-full flex items-center gap-3 p-3 rounded-xl border bg-card hover:bg-accent transition-all">
                <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
                  <Wrench className="w-4 h-4" />
                </div>
                <span className="text-sm font-medium">Request Parts</span>
              </motion.button>
            </div>
          </motion.div>

          {/* Status Info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="rounded-xl border p-4 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800/50"
          >
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-gray-200 dark:bg-gray-700">
                <Wrench className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">Task Status Guide</p>
                <ul className="mt-2 space-y-1 text-xs text-gray-500 dark:text-gray-400">
                  <li className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Scheduled - Not yet started</li>
                  <li className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> In Progress - Currently working</li>
                  <li className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-green-500" /> Completed - Task finished</li>
                </ul>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
