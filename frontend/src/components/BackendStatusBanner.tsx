import { useState, useEffect } from 'react'
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

export function BackendStatusBanner() {
  const [showWarning, setShowWarning] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function check() {
      try {
        const res = await fetch(`${API_BASE_URL.replace('/api', '')}/api/health`, { signal: AbortSignal.timeout(5000) })
        if (!cancelled) setShowWarning(!res.ok)
      } catch {
        if (!cancelled) setShowWarning(true)
      }
    }
    check()
    return () => { cancelled = true }
  }, [])

  if (!showWarning || dismissed) return null

  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center justify-between gap-2">
      <p className="text-sm text-amber-800 flex items-center gap-2">
        <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        Backend server unreachable. API requests will fail. Make sure the server is running on port 3001.
      </p>
      <button onClick={() => setDismissed(true)} className="text-amber-600 hover:text-amber-800 shrink-0" aria-label="Dismiss">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}
