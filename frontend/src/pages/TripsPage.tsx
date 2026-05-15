import { useState, useEffect, useCallback } from 'react'
import { GenericTable } from '../components/GenericTable'
import { Modal, useForm } from '../components/Modal'
import { api } from '../utils/api'
import { io, Socket } from 'socket.io-client'
import { SOCKET_URL } from '../utils/api'
import type { ColumnDef } from '../types'
import { Plus, CheckCircle, XCircle, Play } from 'lucide-react'

function getSocket(): Socket {
  const key = '__app_socket'
  const existing = (window as any)[key]
  if (existing?.connected) return existing
  const socket = io(SOCKET_URL, { transports: ['polling'], reconnection: true, reconnectionDelay: 2000 })
  ;(window as any)[key] = socket
  return socket
}

interface TripRecord extends Record<string, unknown> {
  id: string
  farm_name: string
  vehicle_license_plate: string
  driver_name: string
  route_name: string
  pickup_location: string
  dropoff_location: string
  scheduled_departure: string
  scheduled_arrival: string
  status: string
  passenger_count: number
  notes: string
  farm_id: string
  vehicle_id: string
  driver_id: string
}

interface SelectOption {
  id: string
  name: string
  [key: string]: unknown
}

const tripColumns: ColumnDef<TripRecord>[] = [
  { key: 'farm_name', header: 'Farm', minWidth: 150 },
  { key: 'vehicle_license_plate', header: 'Vehicle', minWidth: 120 },
  { key: 'driver_name', header: 'Driver', minWidth: 150 },
  { key: 'route_name', header: 'Route', minWidth: 150 },
  { key: 'pickup_location', header: 'Pickup', minWidth: 150 },
  { key: 'dropoff_location', header: 'Dropoff', minWidth: 150 },
  { key: 'scheduled_departure', header: 'Departure', minWidth: 160 },
  { key: 'scheduled_arrival', header: 'Arrival', minWidth: 160 },
  { key: 'status', header: 'Status', minWidth: 100 },
  { key: 'passenger_count', header: 'Passengers', minWidth: 110 },
  { key: 'notes', header: 'Notes', minWidth: 150 },
]

interface TripsPageProps { isDriverView?: boolean; isClientView?: boolean }

export function TripsPage({ isDriverView, isClientView }: TripsPageProps = {}) {
  const [trips, setTrips] = useState<TripRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [farms, setFarms] = useState<SelectOption[]>([])
  const [vehicles, setVehicles] = useState<SelectOption[]>([])
  const [drivers, setDrivers] = useState<SelectOption[]>([])
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const form = useForm({
    farm_id: '', vehicle_id: '', driver_id: '', route_name: '',
    pickup_location: '', dropoff_location: '',
    scheduled_departure: '', scheduled_arrival: '',
    passenger_count: 0, notes: ''
  }, (values) => {
    const errors: Record<string, string> = {}
    if (!values.farm_id) errors.farm_id = 'Required'
    if (!values.vehicle_id) errors.vehicle_id = 'Required'
    if (!values.scheduled_departure) errors.scheduled_departure = 'Required'
    if (!values.scheduled_arrival) errors.scheduled_arrival = 'Required'
    return errors
  })

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const fetchTrips = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const endpoint = isClientView ? '/trips/my-requests' : isDriverView ? '/trips/my-trips' : '/trips'
      const result = await api.get<{ success: boolean; data: TripRecord[]; error?: string }>(endpoint)
      if (result.success) setTrips(result.data || [])
      else setError(result.error || 'Failed to load trips')
    } catch { setError('Failed to connect to server') }
    finally { setLoading(false) }
  }, [isClientView, isDriverView])

  const fetchSelectData = useCallback(async () => {
    const [farmsRes, vehiclesRes, driversRes] = await Promise.all([
      api.get<{ success: boolean; data: SelectOption[] }>('/reports/farms'),
      api.get<{ success: boolean; data: SelectOption[] }>('/vehicles'),
      api.get<{ success: boolean; data: SelectOption[] }>('/drivers'),
    ])
    if (farmsRes.success) setFarms(farmsRes.data || [])
    if (vehiclesRes.success) setVehicles(vehiclesRes.data || [])
    if (driversRes.success) setDrivers(driversRes.data || [])
  }, [])

  useEffect(() => { fetchTrips() }, [fetchTrips])

  useEffect(() => {
    const socket = getSocket()
    if (!isDriverView && !isClientView) {
      socket.emit('joinAdminRoom')
    }
    const userStr = localStorage.getItem('user')
    const userId = userStr ? JSON.parse(userStr).id : null
    if (userId) socket.emit('joinUserRoom', userId)

    let refreshTimer: ReturnType<typeof setTimeout> | null = null
    const scheduleRefresh = () => {
      if (refreshTimer) clearTimeout(refreshTimer)
      refreshTimer = setTimeout(() => {
        api.clearCache('/trips')
        fetchTrips()
      }, 500)
    }

    const handleClaimed = () => scheduleRefresh()
    const handleStatusUpdate = () => scheduleRefresh()
    const handleNewTrip = () => scheduleRefresh()

    socket.on('trip:claimed', handleClaimed)
    socket.on('trip:status-update', handleStatusUpdate)
    socket.on('trip:new', handleNewTrip)

    return () => {
      if (!isDriverView && !isClientView) socket.emit('leaveAdminRoom')
      if (userId) socket.emit('leaveUserRoom', userId)
      socket.off('trip:claimed', handleClaimed)
      socket.off('trip:status-update', handleStatusUpdate)
      socket.off('trip:new', handleNewTrip)
      if (refreshTimer) clearTimeout(refreshTimer)
    }
  }, [fetchTrips, isDriverView, isClientView])

  const updateTripStatus = async (trip: TripRecord, status: string) => {
    try {
      const result = await api.put<{ success: boolean }>(`/trips/${trip.id}`, { status })
      if (result.success) {
        setTrips(prev => prev.map(t => t.id === trip.id ? { ...t, status } : t))
        showToast(`Trip ${status}`, 'success')
      } else showToast('Failed to update trip', 'error')
    } catch { showToast('Failed to update trip', 'error') }
  }

  const openCreate = async () => {
    form.reset()
    await fetchSelectData()
    setShowModal(true)
  }

  const handleCreate = form.handleSubmit(async (values) => {
    try {
      const result = await api.post<{ success: boolean; data: TripRecord }>('/trips', values)
      if (result.success) {
        showToast('Trip created', 'success')
        setShowModal(false)
        form.reset()
        fetchTrips()
      } else showToast('Failed to create trip', 'error')
    } catch { showToast('Failed to create trip', 'error') }
  })

  const renderActions = (trip: TripRecord) => {
    if (isDriverView) {
      return (
        <div className="flex items-center justify-end gap-1">
          {trip.status === 'taken' && (
            <button onClick={() => updateTripStatus(trip, 'started')}
              className="px-2 py-1 text-xs font-medium text-green-600 bg-green-50 rounded-md hover:bg-green-100">
              <Play size={12} /> Start
            </button>
          )}
          {trip.status === 'started' && (
            <button onClick={() => updateTripStatus(trip, 'on_route')}
              className="px-2 py-1 text-xs font-medium text-purple-600 bg-purple-50 rounded-md hover:bg-purple-100">
              On Route
            </button>
          )}
          {trip.status === 'on_route' && (
            <button onClick={() => updateTripStatus(trip, 'completed')}
              className="px-2 py-1 text-xs font-medium text-amber-600 bg-amber-50 rounded-md hover:bg-amber-100">
              <CheckCircle size={12} /> Complete
            </button>
          )}
          {(trip.status === 'scheduled' || trip.status === 'assigned') && (
            <button onClick={() => updateTripStatus(trip, 'in_progress')} className="text-xs text-green-600">Legacy Start</button>
          )}
        </div>
      )
    }
    if (isClientView && trip.status === 'available') {
      return (
        <button onClick={() => updateTripStatus(trip, 'cancelled')}
          className="px-2 py-1 text-xs font-medium text-red-600 bg-red-50 rounded-md hover:bg-red-100">
          <XCircle size={12} /> Cancel
        </button>
      )
    }

    return (
      <div className="flex items-center justify-end gap-1">
        {trip.status === 'available' && (
          <button onClick={() => updateTripStatus(trip, 'taken')}
            className="px-2 py-1 text-xs font-medium text-green-600 bg-green-50 rounded-md hover:bg-green-100">
            Mark Taken
          </button>
        )}
        {trip.status === 'taken' && (
          <button onClick={() => updateTripStatus(trip, 'started')}
            className="px-2 py-1 text-xs font-medium text-green-600 bg-green-50 rounded-md hover:bg-green-100">
            <Play size={12} /> Start
          </button>
        )}
        {trip.status === 'started' && (
          <button onClick={() => updateTripStatus(trip, 'on_route')}
            className="px-2 py-1 text-xs font-medium text-purple-600 bg-purple-50 rounded-md hover:bg-purple-100">
            On Route
          </button>
        )}
        {trip.status === 'on_route' && (
          <button onClick={() => updateTripStatus(trip, 'completed')}
            className="px-2 py-1 text-xs font-medium text-amber-600 bg-amber-50 rounded-md hover:bg-amber-100">
            <CheckCircle size={12} /> Complete
          </button>
        )}
        {(trip.status === 'available' || trip.status === 'taken' || trip.status === 'started') && (
          <button onClick={() => updateTripStatus(trip, 'cancelled')}
            className="px-2 py-1 text-xs font-medium text-red-600 bg-red-50 rounded-md hover:bg-red-100">
            <XCircle size={12} /> Cancel
          </button>
        )}
      </div>
    )
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent" /></div>
  if (error) return <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">{error}</div>

  const defaultVisibleColumns = isClientView
    ? ['farm_name', 'vehicle_license_plate', 'driver_name', 'route_name', 'scheduled_departure', 'status']
    : isDriverView
    ? ['route_name', 'vehicle_license_plate', 'pickup_location', 'dropoff_location', 'scheduled_departure', 'status']
    : ['farm_name', 'vehicle_license_plate', 'driver_name', 'route_name', 'scheduled_departure', 'status']

  return (
    <div>
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-white text-sm font-medium ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
          {toast.message}
        </div>
      )}

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isDriverView ? 'My Trips' : isClientView ? 'My Requests' : 'Trip Management'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {isDriverView ? 'View and manage your assigned trips.' : isClientView ? 'Track your transport requests.' : 'Manage and monitor all scheduled transport trips.'}
          </p>
        </div>
        {!isDriverView && !isClientView && (
          <button onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 shadow-sm">
            <Plus size={16} /> Create Trip
          </button>
        )}
      </div>

      <GenericTable<TripRecord>
        data={trips}
        columns={tripColumns}
        defaultVisibleColumns={defaultVisibleColumns}
        pageSize={10}
        searchable={true}
        title={isDriverView ? 'Assigned Trips' : isClientView ? 'Transport Requests' : 'Trip Schedule'}
        actions={renderActions}
      />

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Create New Trip"
        size="lg"
        footer={
          <div className="flex justify-end gap-3">
            <button onClick={() => setShowModal(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">Cancel</button>
            <button onClick={handleCreate}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">Create Trip</button>
          </div>
        }>
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Farm *</label>
              <select value={form.values.farm_id as string} onChange={e => form.setValue('farm_id', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${form.errors.farm_id && form.touched.farm_id ? 'border-red-300' : 'border-gray-300'}`}>
                <option value="">Select Farm</option>
                {farms.map(f => <option key={f.id} value={f.id}>{String(f.name)}</option>)}
              </select>
              {form.errors.farm_id && form.touched.farm_id && <p className="text-xs text-red-500 mt-1">{form.errors.farm_id}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle *</label>
              <select value={form.values.vehicle_id as string} onChange={e => form.setValue('vehicle_id', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${form.errors.vehicle_id && form.touched.vehicle_id ? 'border-red-300' : 'border-gray-300'}`}>
                <option value="">Select Vehicle</option>
                {vehicles.map(v => <option key={v.id} value={v.id}>{String(v.license_plate || '') || String(v.make) + ' ' + String(v.model)}</option>)}
              </select>
              {form.errors.vehicle_id && form.touched.vehicle_id && <p className="text-xs text-red-500 mt-1">{form.errors.vehicle_id}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Driver</label>
              <select value={form.values.driver_id as string} onChange={e => form.setValue('driver_id', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Select Driver</option>
                {drivers.map(d => <option key={d.id} value={d.id}>{String(d.first_name) + ' ' + String(d.last_name)}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Route Name</label>
              <input type="text" value={form.values.route_name as string} onChange={e => form.setValue('route_name', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pickup Location</label>
              <input type="text" value={form.values.pickup_location as string} onChange={e => form.setValue('pickup_location', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Dropoff Location</label>
              <input type="text" value={form.values.dropoff_location as string} onChange={e => form.setValue('dropoff_location', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Scheduled Departure *</label>
              <input type="datetime-local" value={form.values.scheduled_departure as string} onChange={e => form.setValue('scheduled_departure', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${form.errors.scheduled_departure && form.touched.scheduled_departure ? 'border-red-300' : 'border-gray-300'}`} />
              {form.errors.scheduled_departure && form.touched.scheduled_departure && <p className="text-xs text-red-500 mt-1">{form.errors.scheduled_departure}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Scheduled Arrival *</label>
              <input type="datetime-local" value={form.values.scheduled_arrival as string} onChange={e => form.setValue('scheduled_arrival', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${form.errors.scheduled_arrival && form.touched.scheduled_arrival ? 'border-red-300' : 'border-gray-300'}`} />
              {form.errors.scheduled_arrival && form.touched.scheduled_arrival && <p className="text-xs text-red-500 mt-1">{form.errors.scheduled_arrival}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Passenger Count</label>
              <input type="number" value={form.values.passenger_count as number} onChange={e => form.setValue('passenger_count', parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea value={form.values.notes as string} onChange={e => form.setValue('notes', e.target.value)} rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
        </form>
      </Modal>
    </div>
  )
}
