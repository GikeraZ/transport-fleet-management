import { motion } from 'framer-motion'
import type { LucideIcon } from 'lucide-react'

interface StatCardProps {
  label: string
  value: string | number
  icon: LucideIcon
  trend?: { value: number; positive: boolean }
  color?: string
  delay?: number
}

const colorMap: Record<string, { bg: string; icon: string; glow: string }> = {
  blue: { bg: 'bg-blue-50 dark:bg-blue-950/50', icon: 'text-blue-600 dark:text-blue-400', glow: 'shadow-blue-500/20' },
  emerald: { bg: 'bg-emerald-50 dark:bg-emerald-950/50', icon: 'text-emerald-600 dark:text-emerald-400', glow: 'shadow-emerald-500/20' },
  amber: { bg: 'bg-amber-50 dark:bg-amber-950/50', icon: 'text-amber-600 dark:text-amber-400', glow: 'shadow-amber-500/20' },
  purple: { bg: 'bg-purple-50 dark:bg-purple-950/50', icon: 'text-purple-600 dark:text-purple-400', glow: 'shadow-purple-500/20' },
  rose: { bg: 'bg-rose-50 dark:bg-rose-950/50', icon: 'text-rose-600 dark:text-rose-400', glow: 'shadow-rose-500/20' },
  indigo: { bg: 'bg-indigo-50 dark:bg-indigo-950/50', icon: 'text-indigo-600 dark:text-indigo-400', glow: 'shadow-indigo-500/20' },
}

export function StatCard({ label, value, icon: Icon, trend, color = 'blue', delay = 0 }: StatCardProps) {
  const cc = colorMap[color] ?? { bg: 'bg-blue-50 dark:bg-blue-950/50', icon: 'text-blue-600 dark:text-blue-400', glow: 'shadow-blue-500/20' }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: 'easeOut' }}
      className="stat-card group"
    >
      <div className="absolute top-0 right-0 w-32 h-32 -translate-y-8 translate-x-8 opacity-[0.03] pointer-events-none">
        <Icon className="w-full h-full" />
      </div>
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="text-3xl font-bold tracking-tight">{value}</p>
          {trend && (
            <div className="flex items-center gap-1 text-xs">
              <span className={trend.positive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}>
                {trend.positive ? '↑' : '↓'} {Math.abs(trend.value)}%
              </span>
              <span className="text-muted-foreground">vs last month</span>
            </div>
          )}
        </div>
        <div className={`stat-icon ${cc.bg} ${cc.icon} transition-transform duration-300 group-hover:scale-110`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-current/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
    </motion.div>
  )
}
