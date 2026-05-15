import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { MapPin, CheckCircle, Clock, Plus, ArrowRight, XCircle, Navigation, User, AlertCircle, Sprout, Wrench } from 'lucide-react'
import { api } from '../utils/api'
import { StatusBadge } from '../components/StatusBadge'
import { StatCard } from '../components/StatCard'
import { LoadingScreen } from '../components/LoadingScreen'
import { io, Socket } from 'socket.io-client'
import { SOCKET_URL } from '../utils/api'
import type { Trip } from '../types'

const STATUS_FLOW = ['available', 'taken', 'started', 'on_route', 'completed']

function getSocket(): Socket {
  const key = '__app_socket'
  const existing = (window as any)[key]
  if (existing?.connected) return existing
  const socket = io(SOCKET_URL, { transports: ['polling'], reconnection: true, reconnectionDelay: 2000 })
  ;(window as any)[key] = socket
  return socket
}

export function ClientDashboardPage() {
  const [requests, setRequests] = useState<Trip[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const socketRef = useRef<Socket | null>(null)

  const [showMaintForm, setShowMaintForm] = useState(false)
  const [maintSubmitting, setMaintSubmitting] = useState(false)
  const [maintForm, setMaintForm] = useState({ vehicle_id: '', task_type: 'repair', description: '', scheduled_date: '' })

  const { data: vehicles } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => api.get<{ success: boolean; data: { id: string; license_plate: string }[] }>('/vehicles'),
    select: (res) => res.data || [],
  })

  const submitMaintRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!maintForm.vehicle_id || !maintForm.scheduled_date) {
      showToast('Please fill required fields', 'error'); return
    }
    setMaintSubmitting(true)
    try {
      const res = await api.post<{ success: boolean }>('/maintenance/client-request', maintForm)
      if (res.success) {
        showToast('Maintenance request submitted!', 'success')
        setShowMaintForm(false)
        setMaintForm({ vehicle_id: '', task_type: 'repair', description: '', scheduled_date: '' })
      } else showToast('Failed to submit', 'error')
    } catch { showToast('Failed to submit', 'error') }
    finally { setMaintSubmitting(false) }
  }

  const [formValues, setFormValues] = useState({
    pickup_location: '', dropoff_location: '', scheduled_departure: '',
    passenger_count: 1, notes: '', route_name: ''
  })

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const fetchRequests = async () => {
    try {
      const res = await api.get<{ success: boolean; data: Trip[] }>('/trips/my-requests')
      if (res.success) setRequests(res.data || [])
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchRequests() }, [])

  useEffect(() => {
    const socket = getSocket()
    socketRef.current = socket
    socket.emit('joinUserRoom', JSON.parse(localStorage.getItem('user') || '{}').id)
    const handleUpdate = (trip: Trip) => { setRequests(prev => prev.map(r => r.id === trip.id ? trip : r)) }
    const handleNew = (trip: Trip) => { setRequests(prev => [trip, ...prev]) }
    socket.on('trip:status-update', handleUpdate)
    socket.on('trip:request-created', handleNew)
    socket.on('trip:assigned', handleUpdate)
    return () => {
      socket.off('trip:status-update', handleUpdate)
      socket.off('trip:request-created', handleNew)
      socket.off('trip:assigned', handleUpdate)
    }
  }, [])

  const submitRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formValues.pickup_location || !formValues.dropoff_location || !formValues.scheduled_departure) {
      showToast('Please fill in all required fields', 'error')
      return
    }
    setSubmitting(true)
    try {
      const res = await api.post<{ success: boolean; data: Trip; error?: string }>('/trips/client-request', formValues)
      if (res.success) {
        showToast('Trip request submitted!', 'success')
        setShowForm(false)
        setFormValues({ pickup_location: '', dropoff_location: '', scheduled_departure: '', passenger_count: 1, notes: '', route_name: '' })
        fetchRequests()
      } else showToast(res.error || 'Failed to submit request', 'error')
    } catch { showToast('Failed to submit request', 'error') }
    finally { setSubmitting(false) }
  }

  const cancelRequest = async (trip: Trip) => {
    if (!confirm('Cancel this trip request?')) return
    try {
      const res = await api.put<{ success: boolean }>(`/trips/${trip.id}`, { status: 'cancelled' })
      if (res.success) { showToast('Trip cancelled', 'success'); fetchRequests() }
    } catch { showToast('Failed to cancel', 'error') }
  }

  const activeStats = {
    active: requests.filter(r => !['completed', 'cancelled'].includes(r.status)).length,
    completed: requests.filter(r => r.status === 'completed').length,
    cancelled: requests.filter(r => r.status === 'cancelled').length,
    total: requests.length,
  }

  if (loading) return <LoadingScreen fullScreen={false} />

  return (
    <div className="space-y-6">
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: '-50%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-4 left-1/2 z-50 px-5 py-3 rounded-xl shadow-lg text-white text-sm font-medium ${
              toast.type === 'success' ? 'bg-gradient-to-r from-green-500 to-emerald-600' : 'bg-gradient-to-r from-red-500 to-rose-600'
            }`}
          >
            <div className="flex items-center gap-2">
              {toast.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              {toast.message}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50">
            <Sprout className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">My Transport Requests</h1>
            <p className="text-sm text-muted-foreground mt-1">Create and track your transport trip requests.</p>
          </div>
        </div>
          <div className="flex gap-2">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => { setShowMaintForm(true) }}
              className="btn-secondary"
            >
              <Wrench className="w-4 h-4" /> Request Repair
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => { setFormValues({ pickup_location: '', dropoff_location: '', scheduled_departure: '', passenger_count: 1, notes: '', route_name: '' }); setShowForm(true) }}
              className="btn-primary"
            >
              <Plus className="w-4 h-4" /> New Request
            </motion.button>
          </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Total Requests" value={activeStats.total} icon={MapPin} color="emerald" delay={0} />
        <StatCard label="Active" value={activeStats.active} icon={Navigation} color="blue" delay={0.05} />
        <StatCard label="Completed" value={activeStats.completed} icon={CheckCircle} color="emerald" delay={0.1} />
        <StatCard label="Cancelled" value={activeStats.cancelled} icon={XCircle} color="rose" delay={0.15} />
      </div>

      {/* Requests List */}
      {requests.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="dashboard-card p-12 text-center"
        >
          <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950/30 dark:to-green-950/30 flex items-center justify-center mb-4">
            <MapPin className="w-10 h-10 text-emerald-500 dark:text-emerald-400" />
          </div>
          <h3 className="text-lg font-semibold mb-1">No trip requests yet</h3>
          <p className="text-sm text-muted-foreground mb-6">Create your first transport request to get started.</p>
          <button onClick={() => setShowForm(true)}
            className="btn-primary">
            <Plus className="w-4 h-4" /> Create Request
          </button>
        </motion.div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {requests.map((trip, idx) => (
              <motion.div
                key={trip.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.03 }}
                className="dashboard-card p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0 space-y-3">
                    <div className="flex items-center gap-2">
                      <StatusBadge status={trip.status} />
                      {trip.route_name && <span className="text-sm font-semibold truncate">{trip.route_name}</span>}
                    </div>

                    <div className="flex items-start gap-2 text-sm">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 mt-1" />
                        <span className="text-muted-foreground">{trip.pickup_location}</span>
                      </div>
                      <ArrowRight className="w-4 h-4 mt-1 shrink-0 text-border" />
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-red-500 shrink-0 mt-1" />
                        <span className="text-muted-foreground">{trip.dropoff_location}</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(trip.scheduled_departure).toLocaleString()}</span>
                      <span>{trip.passenger_count} passenger{trip.passenger_count !== 1 ? 's' : ''}</span>
                      {trip.driver_name && (
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" /> Driver: {trip.driver_name}
                        </span>
                      )}
                    </div>

                    {trip.status === 'taken' && (
                      <div className="flex items-center gap-2 text-xs font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 px-3 py-2 rounded-lg">
                        <Navigation className="w-3.5 h-3.5" />
                        Trip accepted by {trip.driver_name || 'a driver'} — awaiting start
                      </div>
                    )}
                    {trip.status === 'started' && (
                      <div className="flex items-center gap-2 text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 px-3 py-2 rounded-lg">
                        <Navigation className="w-3.5 h-3.5" />
                        Driver is on the way!
                      </div>
                    )}
                    {trip.status === 'on_route' && (
                      <div className="flex items-center gap-2 text-xs font-medium text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/30 px-3 py-2 rounded-lg">
                        <Navigation className="w-3.5 h-3.5" />
                        En route with passengers
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {trip.status === 'available' && (
                      <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                        onClick={() => cancelRequest(trip)}
                        className="px-3 py-1.5 text-xs font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 rounded-lg hover:bg-red-100 dark:hover:bg-red-950/50 transition-all">
                        Cancel
                      </motion.button>
                    )}
                  </div>
                </div>

                {/* Progress indicator */}
                {['taken', 'started', 'on_route'].includes(trip.status) && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <div className="flex items-center gap-1">
                      {STATUS_FLOW.filter(s => s !== 'completed').map((s, i) => {
                        const idx = STATUS_FLOW.indexOf(trip.status)
                        const done = i <= idx
                        return (
                          <div key={s} className="flex items-center flex-1">
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className={`w-2.5 h-2.5 rounded-full ${done ? 'bg-emerald-500' : 'bg-border'}`}
                            />
                            {i < STATUS_FLOW.length - 2 && (
                              <div className={`flex-1 h-0.5 ${i < idx ? 'bg-emerald-500' : 'bg-border'}`} />
                            )}
                          </div>
                        )
                      })}
                    </div>
                    <div className="flex justify-between mt-1.5 text-[10px] text-muted-foreground">
                      <span>Requested</span>
                      <span>Taken</span>
                      <span>Started</span>
                      <span>En Route</span>
                      <span>Done</span>
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* New Request Modal */}
      <AnimatePresence>
        {showForm && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40"
              onClick={() => setShowForm(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <div className="w-full max-w-lg rounded-2xl border shadow-2xl" style={{ background: 'hsl(var(--card))' }}>
                <div className="px-6 py-4 border-b border-border flex items-center justify-between">
                  <h2 className="text-lg font-semibold">New Transport Request</h2>
                  <button onClick={() => setShowForm(false)} className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-all">
                    <XCircle className="w-5 h-5" />
                  </button>
                </div>
                <form onSubmit={submitRequest} className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Route Name (optional)</label>
                    <input type="text" value={formValues.route_name} onChange={e => setFormValues({ ...formValues, route_name: e.target.value })}
                      className="input-field" placeholder="e.g. Farm to Market" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1.5">Pickup Location *</label>
                      <input type="text" value={formValues.pickup_location} onChange={e => setFormValues({ ...formValues, pickup_location: e.target.value })}
                        className="input-field" placeholder="Enter pickup address" required />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1.5">Destination *</label>
                      <input type="text" value={formValues.dropoff_location} onChange={e => setFormValues({ ...formValues, dropoff_location: e.target.value })}
                        className="input-field" placeholder="Enter destination" required />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1.5">Pickup Date/Time *</label>
                      <input type="datetime-local" value={formValues.scheduled_departure} onChange={e => setFormValues({ ...formValues, scheduled_departure: e.target.value })}
                        className="input-field" required />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1.5">Passengers</label>
                      <input type="number" min={1} value={formValues.passenger_count} onChange={e => setFormValues({ ...formValues, passenger_count: parseInt(e.target.value) || 1 })}
                        className="input-field" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Notes</label>
                    <textarea value={formValues.notes} onChange={e => setFormValues({ ...formValues, notes: e.target.value })} rows={3}
                      className="input-field" placeholder="Any special requirements..." />
                  </div>
                  <div className="flex justify-end gap-3 pt-2">
                    <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
                    <button type="submit" disabled={submitting} className="btn-primary">
                      {submitting ? (
                        <span className="flex items-center gap-2">
                          <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          Submitting...
                        </span>
                      ) : 'Submit Request'}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Maintenance Request Modal */}
      <AnimatePresence>
        {showMaintForm && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40" onClick={() => setShowMaintForm(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }} className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="w-full max-w-lg rounded-2xl border shadow-2xl" style={{ background: 'hsl(var(--card))' }}>
                <div className="px-6 py-4 border-b border-border flex items-center justify-between">
                  <h2 className="text-lg font-semibold flex items-center gap-2"><Wrench className="w-5 h-5" /> Request Vehicle Repair</h2>
                  <button onClick={() => setShowMaintForm(false)} className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-all">
                    <XCircle className="w-5 h-5" />
                  </button>
                </div>
                <form onSubmit={submitMaintRequest} className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Vehicle *</label>
                    <select value={maintForm.vehicle_id} onChange={e => setMaintForm({ ...maintForm, vehicle_id: e.target.value })} required
                      className="input-field">
                      <option value="">Select vehicle</option>
                      {(vehicles || []).map((v: { id: string; license_plate: string }) => (
                        <option key={v.id} value={v.id}>{v.license_plate}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Task Type</label>
                    <select value={maintForm.task_type} onChange={e => setMaintForm({ ...maintForm, task_type: e.target.value })}
                      className="input-field">
                      <option value="repair">Repair</option>
                      <option value="service">Service</option>
                      <option value="inspection">Inspection</option>
                      <option value="tire_change">Tire Change</option>
                      <option value="engine">Engine</option>
                      <option value="brake">Brake</option>
                      <option value="electrical">Electrical</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Scheduled Date *</label>
                    <input type="date" value={maintForm.scheduled_date} onChange={e => setMaintForm({ ...maintForm, scheduled_date: e.target.value })}
                      className="input-field" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Description</label>
                    <textarea value={maintForm.description} onChange={e => setMaintForm({ ...maintForm, description: e.target.value })} rows={3}
                      className="input-field" placeholder="Describe the issue..." />
                  </div>
                  <div className="flex justify-end gap-3 pt-2">
                    <button type="button" onClick={() => setShowMaintForm(false)} className="btn-secondary">Cancel</button>
                    <button type="submit" disabled={maintSubmitting} className="btn-primary">
                      {maintSubmitting ? 'Submitting...' : 'Submit Request'}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
