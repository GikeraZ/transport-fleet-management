import { motion } from 'framer-motion'

interface StatusBadgeProps {
  status: string
  size?: 'sm' | 'md' | 'lg'
  showDot?: boolean
}

const statusMap: Record<string, { class: string; label: string }> = {
  available: { class: 'status-available', label: 'Available' },
  taken: { class: 'status-taken', label: 'Taken' },
  completed: { class: 'status-completed', label: 'Completed' },
  cancelled: { class: 'status-cancelled', label: 'Cancelled' },
  pending: { class: 'status-pending', label: 'Pending' },
  in_progress: { class: 'status-in_progress', label: 'In Progress' },
  started: { class: 'status-started', label: 'Started' },
  on_route: { class: 'status-in_progress', label: 'On Route' },
  scheduled: { class: 'status-scheduled', label: 'Scheduled' },
  active: { class: 'status-available', label: 'Active' },
  inactive: { class: 'status-cancelled', label: 'Inactive' },
  under_maintenance: { class: 'status-taken', label: 'Under Maintenance' },
}

export function StatusBadge({ status, size = 'md', showDot = true }: StatusBadgeProps) {
  const s = statusMap[status] || { class: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400', label: status.replace(/_/g, ' ') }
  const sizeClasses = {
    sm: 'text-[10px] px-1.5 py-0.5',
    md: 'text-xs px-2.5 py-1',
    lg: 'text-sm px-3 py-1.5',
  }

  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`inline-flex items-center gap-1.5 font-semibold rounded-full ${s.class} ${sizeClasses[size]}`}
    >
      {showDot && (
        <span className={`w-1.5 h-1.5 rounded-full ${status === 'available' || status === 'active' || status === 'completed' ? 'bg-current' : 'bg-current opacity-60'}`} />
      )}
      {s.label}
    </motion.span>
  )
}
