import { motion } from 'framer-motion'
import { Car } from 'lucide-react'

export function LoadingScreen({ fullScreen = true }: { fullScreen?: boolean }) {
  const content = (
    <div className="flex flex-col items-center justify-center gap-4">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30"
      >
        <Car className="w-8 h-8 text-white" />
      </motion.div>
      <div className="space-y-2 text-center">
        <p className="text-sm font-medium text-muted-foreground animate-pulse">Loading</p>
        <div className="flex gap-1 justify-center">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0.3 }}
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
              className="w-2 h-2 rounded-full bg-primary"
            />
          ))}
        </div>
      </div>
    </div>
  )

  if (fullScreen) {
    return <div className="min-h-screen flex items-center justify-center bg-background">{content}</div>
  }

  return <div className="flex items-center justify-center py-20">{content}</div>
}

export function SkeletonCard() {
  return (
    <div className="rounded-xl border p-5 space-y-3">
      <div className="shimmer-loading h-4 w-24 rounded" />
      <div className="shimmer-loading h-8 w-16 rounded" />
      <div className="shimmer-loading h-3 w-32 rounded" />
    </div>
  )
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="rounded-xl border overflow-hidden">
      <div className="px-4 py-3 border-b">
        <div className="shimmer-loading h-4 w-48 rounded" />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="px-4 py-3 border-b last:border-0 flex items-center gap-4">
          <div className="shimmer-loading h-8 w-8 rounded-full" />
          <div className="space-y-1.5 flex-1">
            <div className="shimmer-loading h-3.5 w-3/4 rounded" />
            <div className="shimmer-loading h-3 w-1/2 rounded" />
          </div>
        </div>
      ))}
    </div>
  )
}
