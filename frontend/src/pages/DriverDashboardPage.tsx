import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MapPin, Clock, CheckCircle, ArrowRight, Navigation, User, Filter, AlertCircle, Gauge, Star, Crosshair, Ban } from 'lucide-react'
import { api } from '../utils/api'
import { io, Socket } from 'socket.io-client'
import { SOCKET_URL } from '../utils/api'
import { StatusBadge } from '../components/StatusBadge'
import { StatCard } from '../components/StatCard'
import { LoadingScreen } from '../components/LoadingScreen'
import type { Trip } from '../types'

const STATUS_ACTIONS: Record<string, { next: string; label: string; color: string }[]> = {
  taken: [{ next: 'started', label: 'Start Trip', color: 'from-green-500 to-green-600' }],
  started: [{ next: 'on_route', label: 'On Route', color: 'from-purple-500 to-purple-600' }],
  on_route: [{ next: 'completed', label: 'Complete Trip', color: 'from-blue-500 to-blue-600' }],
}

function getSocket(): Socket {
  const key = '__app_socket'
  const existing = (window as any)[key]
  if (existing?.connected) return existing
  const socket = io(SOCKET_URL, { transports: ['polling'], reconnection: true, reconnectionDelay: 2000 })
  ;(window as any)[key] = socket
  return socket
}

export function DriverDashboardPage() {
  const [availableTrips, setAvailableTrips] = useState<Trip[]>([])
  const [myTrips, setMyTrips] = useState<Trip[]>([])
  const [loading, setLoading] = useState(true)
  const [claimingId, setClaimingId] = useState<string | null>(null)
  const [takenByOtherIds, setTakenByOtherIds] = useState<Set<string>>(new Set())
  const [filterLocation, setFilterLocation] = useState('')
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const socketRef = useRef<Socket | null>(null)
  const availableRef = useRef(availableTrips)
  availableRef.current = availableTrips

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const fetchData = useCallback(async () => {
    try {
      const [availRes, myRes] = await Promise.all([
        api.get<{ success: boolean; data: Trip[] }>('/trips/available'),
        api.get<{ success: boolean; data: Trip[] }>('/trips/my-trips'),
      ])
      if (availRes.success) setAvailableTrips(availRes.data || [])
      if (myRes.success) setMyTrips(myRes.data || [])
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  useEffect(() => {
    const socket = getSocket()
    socketRef.current = socket
    const userStr = localStorage.getItem('user')
    const userId = userStr ? JSON.parse(userStr).id : null
    if (userId) socket.emit('joinUserRoom', userId)
    socket.emit('joinAvailableTrips')

    const handleNewTrip = (trip: Trip) => {
      setAvailableTrips(prev => {
        if (prev.find(t => t.id === trip.id)) return prev
        return [trip, ...prev]
      })
      setTakenByOtherIds(prev => { const n = new Set(prev); n.delete(trip.id); return n })
    }
    const handleClaimed = (trip: Trip) => {
      const isMine = userId && trip.driver_id === userId
      setAvailableTrips(prev => prev.filter(t => t.id !== trip.id))
      if (isMine) {
        setMyTrips(prev => {
          if (prev.find(t => t.id === trip.id)) return prev.map(t => t.id === trip.id ? trip : t)
          return [trip, ...prev]
        })
      } else {
        setTakenByOtherIds(prev => { const n = new Set(prev); n.add(trip.id); return n })
      }
    }
    const handleUpdate = (trip: Trip) => {
      setAvailableTrips(prev => prev.map(t => t.id === trip.id ? trip : t))
      setMyTrips(prev => prev.map(t => t.id === trip.id ? trip : t))
    }
    socket.on('trip:new', handleNewTrip)
    socket.on('trip:claimed', handleClaimed)
    socket.on('trip:status-update', handleUpdate)
    return () => {
      socket.off('trip:new', handleNewTrip)
      socket.off('trip:claimed', handleClaimed)
      socket.off('trip:status-update', handleUpdate)
    }
  }, [])

  const claimTrip = async (tripId: string) => {
    setClaimingId(tripId)
    const tripToClaim = availableRef.current.find(t => t.id === tripId)
    if (tripToClaim) {
      setAvailableTrips(prev => prev.filter(t => t.id !== tripId))
    }
    try {
      const res = await api.post<{ success: boolean; data: Trip }>(`/trips/${tripId}/claim`)
      if (res.success) {
        setMyTrips(prev => {
          if (prev.find(t => t.id === tripId)) return prev
          return [res.data!, ...prev]
        })
        showToast('Trip claimed successfully!', 'success')
      } else {
        showToast('Trip already taken', 'error')
      }
    } catch {
      if (tripToClaim) {
        setAvailableTrips(prev => [tripToClaim, ...prev])
      }
      showToast('Failed to claim trip', 'error')
    } finally {
      setClaimingId(null)
    }
  }

  const updateStatus = async (trip: Trip, newStatus: string) => {
    setMyTrips(prev => prev.map(t => t.id === trip.id ? { ...t, status: newStatus } : t))
    try {
      const res = await api.put<{ success: boolean; data: Trip }>(`/trips/${trip.id}`, { status: newStatus })
      if (res.success) {
        showToast(`Trip ${newStatus.replace(/_/g, ' ')}`, 'success')
        if (res.data) setMyTrips(prev => prev.map(t => t.id === trip.id ? res.data! : t))
      }
    } catch {
      setMyTrips(prev => prev.map(t => t.id === trip.id ? { ...t, status: trip.status } : t))
      showToast('Failed to update', 'error')
    }
  }

  const filteredAvailable = filterLocation
    ? availableTrips.filter(t =>
        t.pickup_location?.toLowerCase().includes(filterLocation.toLowerCase()) ||
        t.dropoff_location?.toLowerCase().includes(filterLocation.toLowerCase()))
    : availableTrips

  const activeTrips = myTrips.filter(t => !['completed', 'cancelled'].includes(t.status))
  const completedTrips = myTrips.filter(t => ['completed', 'cancelled'].includes(t.status))

  if (loading) return <LoadingScreen fullScreen={false} />

  return (
    <div className="space-y-6">
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: '-50%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-4 left-1/2 z-50 px-5 py-3 rounded-xl shadow-lg text-white text-sm font-medium ${toast.type === 'success' ? 'bg-gradient-to-r from-green-500 to-emerald-600' : 'bg-gradient-to-r from-red-500 to-rose-600'}`}
          >
            <div className="flex items-center gap-2">
              {toast.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              {toast.message}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Driver Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Browse available trips and manage your assignments.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground bg-card border rounded-full px-3 py-1.5">
            <Gauge className="w-3.5 h-3.5 text-primary" />
            {activeTrips.length} active · {completedTrips.length} completed
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Available Trips" value={filteredAvailable.length} icon={Crosshair} color="blue" delay={0} />
        <StatCard label="My Active Trips" value={activeTrips.length} icon={Navigation} color="emerald" delay={0.05} />
        <StatCard label="Completed Today" value={completedTrips.length} icon={CheckCircle} color="purple" delay={0.1} />
        <StatCard label="Rating" value="4.8" icon={Star} color="amber" delay={0.15} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Available Trips */}
        <div className="lg:col-span-3">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="dashboard-card"
          >
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <div className="p-1 rounded-md bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
                  <MapPin className="w-4 h-4" />
                </div>
                Available Trips ({filteredAvailable.length})
              </h2>
              <div className="relative">
                <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <input type="text" placeholder="Filter by location..." value={filterLocation}
                  onChange={e => setFilterLocation(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs input-field w-44" />
              </div>
            </div>

            {filteredAvailable.length === 0 ? (
              <div className="p-12 text-center">
                <motion.div
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  className="w-16 h-16 mx-auto rounded-2xl bg-muted flex items-center justify-center mb-3"
                >
                  <MapPin className="w-8 h-8 text-muted-foreground" />
                </motion.div>
                <p className="text-sm font-medium">No available trips right now</p>
                <p className="text-xs text-muted-foreground mt-1">Check back later or adjust your filters</p>
              </div>
            ) : (
              <div className="divide-y divide-border max-h-[600px] overflow-y-auto scrollbar-thin">
                    {filteredAvailable.map((trip, idx) => {
                      const isTaken = takenByOtherIds.has(trip.id)
                      return (
                      <motion.div
                        key={trip.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.03 }}
                        className={`px-5 py-4 hover:bg-accent/50 transition-colors ${isTaken ? 'opacity-60' : ''}`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0 space-y-2">
                            <div className="flex items-center gap-2">
                              <StatusBadge status={isTaken ? 'taken' : 'available'} size="sm" />
                              {trip.route_name && <span className="text-sm font-semibold truncate">{trip.route_name}</span>}
                            </div>
                            <div className="flex items-start gap-2 text-xs text-muted-foreground">
                              <div className="flex items-center gap-1.5">
                                <div className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
                                <span className="truncate max-w-[140px]">{trip.pickup_location}</span>
                              </div>
                              <ArrowRight className="w-3 h-3 shrink-0 text-border" />
                              <div className="flex items-center gap-1.5">
                                <div className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                                <span className="truncate max-w-[140px]">{trip.dropoff_location}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {new Date(trip.scheduled_departure).toLocaleString()}
                              </span>
                              <span className="flex items-center gap-1">
                                <User className="w-3 h-3" />
                                {trip.passenger_count} passenger{trip.passenger_count !== 1 ? 's' : ''}
                              </span>
                              {trip.client_name && (
                                <span className="flex items-center gap-1">
                                  <Star className="w-3 h-3" />
                                  {trip.client_name}
                                </span>
                              )}
                            </div>
                          </div>
                          {isTaken ? (
                            <span className="shrink-0 px-4 py-2 rounded-xl text-xs font-semibold bg-muted text-muted-foreground flex items-center gap-1.5">
                              <Ban className="w-3.5 h-3.5" />
                              Taken
                            </span>
                          ) : (
                          <motion.button
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={() => claimTrip(trip.id)}
                            disabled={claimingId === trip.id}
                            className="shrink-0 px-5 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                          >
                            {claimingId === trip.id ? (
                              <span className="flex items-center gap-1.5">
                                <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                                Accepting...
                              </span>
                            ) : 'Accept Trip'}
                          </motion.button>
                          )}
                        </div>
                      </motion.div>
                    )
                  })}
              </div>
            )}
          </motion.div>
        </div>

        {/* Right Column - Active & History */}
        <div className="lg:col-span-2 space-y-4">
          {/* Active Trips */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="dashboard-card"
          >
            <div className="px-5 py-4 border-b border-border">
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <Navigation className="w-4 h-4 text-primary" />
                My Active Trips ({activeTrips.length})
              </h2>
            </div>
            {activeTrips.length === 0 ? (
              <div className="p-8 text-center">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-muted flex items-center justify-center mb-2">
                  <Navigation className="w-6 h-6 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium">No active trips</p>
                <p className="text-xs text-muted-foreground mt-1">Accept an available trip to get started</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {activeTrips.map(trip => (
                  <div key={trip.id} className="px-5 py-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <StatusBadge status={trip.status} size="sm" />
                      {trip.route_name && <span className="text-xs font-semibold truncate">{trip.route_name}</span>}
                    </div>
                    <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
                      <MapPin className="w-3 h-3 mt-0.5 shrink-0 text-green-500" />
                      <span className="truncate">{trip.pickup_location}</span>
                      <ArrowRight className="w-3 h-3 mt-0.5 shrink-0 text-border" />
                      <span className="truncate">{trip.dropoff_location}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(trip.scheduled_departure).toLocaleString()}</span>
                      {trip.client_name && <span className="flex items-center gap-1"><User className="w-3 h-3" /> {trip.client_name}</span>}
                    </div>
                    <div className="flex gap-2 pt-1">
                      {STATUS_ACTIONS[trip.status]?.map(action => (
                        <motion.button
                          key={action.next}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => updateStatus(trip, action.next)}
                          className={`px-4 py-1.5 text-xs font-semibold text-white rounded-lg bg-gradient-to-r ${action.color} transition-all shadow-sm`}
                        >
                          {action.label}
                        </motion.button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>

          {/* History */}
          {completedTrips.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="dashboard-card"
            >
              <div className="px-5 py-4 border-b border-border">
                <h2 className="text-sm font-semibold flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                  Recent History
                </h2>
              </div>
              <div className="divide-y divide-border">
                {completedTrips.slice(0, 5).map(trip => (
                  <div key={trip.id} className="px-5 py-3 flex items-center justify-between text-sm">
                    <span className="text-muted-foreground truncate">
                      {trip.pickup_location} <ArrowRight className="w-3 h-3 inline text-border" /> {trip.dropoff_location}
                    </span>
                    <StatusBadge status={trip.status} size="sm" />
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Safety Notice */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="rounded-xl border border-amber-200 dark:border-amber-900/50 p-4 bg-amber-50 dark:bg-amber-950/30"
          >
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">Safety Reminder</p>
                <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">Report vehicle issues immediately via the maintenance section. Always perform pre-trip inspections.</p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
