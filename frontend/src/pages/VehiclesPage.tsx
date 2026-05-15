import { useState } from 'react'
import { GenericTable } from '../components/GenericTable'
import { Modal, useForm } from '../components/Modal'
import { api } from '../utils/api'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { ColumnDef } from '../types'
import { Plus, Pencil, Trash2, ClipboardList, Calendar } from 'lucide-react'

interface VehicleRecord extends Record<string, unknown> {
  id: string
  license_plate: string
  make: string
  model: string
  year: number
  vehicle_type: string
  capacity: number
  status: string
  last_service_date: string
  next_service_date: string
  mileage: number
  vin: string
  insurance_expiry: string
  registration_expiry: string
  assigned_driver_id: string
  assigned_driver_name: string
}

interface ServiceRecord {
  id: string
  task_type: string
  description: string
  scheduled_date: string
  status: string
  cost: number
  mechanic_name: string
}

const vehicleColumns: ColumnDef<VehicleRecord>[] = [
  { key: 'license_plate', header: 'License Plate', minWidth: 130 },
  { key: 'make', header: 'Make', minWidth: 100 },
  { key: 'model', header: 'Model', minWidth: 120 },
  { key: 'year', header: 'Year', minWidth: 70 },
  { key: 'vehicle_type', header: 'Type', minWidth: 80 },
  { key: 'capacity', header: 'Capacity', minWidth: 90 },
  { key: 'status', header: 'Status', minWidth: 100 },
  { key: 'assigned_driver_name', header: 'Assigned Driver', minWidth: 140 },
  { key: 'last_service_date', header: 'Last Service', minWidth: 120 },
  { key: 'next_service_date', header: 'Next Service', minWidth: 120 },
  { key: 'mileage', header: 'Mileage', minWidth: 90 },
  { key: 'vin', header: 'VIN', minWidth: 150 },
  { key: 'insurance_expiry', header: 'Insurance', minWidth: 120 },
  { key: 'registration_expiry', header: 'Registration', minWidth: 120 },
]

const VEHICLE_TYPES = ['bus', 'minibus', 'van', 'truck', 'car', 'trailer']
const STATUS_OPTIONS = ['active', 'maintenance', 'out_of_service', 'retired']

export function VehiclesPage() {
  const queryClient = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [editVehicle, setEditVehicle] = useState<VehicleRecord | null>(null)
  const [showServiceModal, setShowServiceModal] = useState(false)
  const [serviceVehicle, setServiceVehicle] = useState<VehicleRecord | null>(null)
  const [serviceHistory, setServiceHistory] = useState<ServiceRecord[]>([])
  const [serviceLoading, setServiceLoading] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const { data: vehicles, isLoading, error } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => api.get<{ success: boolean; data: VehicleRecord[] }>('/vehicles'),
    select: (res) => res.data || [],
  })

  const { data: drivers } = useQuery({
    queryKey: ['drivers'],
    queryFn: () => api.get<{ success: boolean; data: { id: string; first_name: string; last_name: string }[] }>('/drivers'),
    select: (res) => res.data || [],
  })

  const form = useForm(
    { license_plate: '', make: '', model: '', year: new Date().getFullYear(), vehicle_type: 'bus', capacity: 30, status: 'active', vin: '', mileage: 0, last_service_date: '', next_service_date: '', insurance_expiry: '', registration_expiry: '', assigned_driver_id: '' },
    (values) => {
      const errors: Record<string, string> = {}
      if (!values.license_plate) errors.license_plate = 'Required'
      if (!values.make) errors.make = 'Required'
      if (!values.model) errors.model = 'Required'
      if (!values.year) errors.year = 'Required'
      else if (Number(values.year) < 1900 || Number(values.year) > 2100) errors.year = 'Invalid'
      if (!values.vehicle_type) errors.vehicle_type = 'Required'
      return errors
    }
  )

  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post('/vehicles', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] })
      showToast('Vehicle created', 'success')
      setShowModal(false)
      form.reset()
    },
    onError: () => showToast('Failed to create vehicle', 'error'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) => api.put(`/vehicles/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] })
      showToast('Vehicle updated', 'success')
      setShowModal(false)
      setEditVehicle(null)
      form.reset()
    },
    onError: () => showToast('Failed to update vehicle', 'error'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/vehicles/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] })
      showToast('Vehicle deleted', 'success')
    },
    onError: () => showToast('Failed to delete vehicle', 'error'),
  })

  const openAdd = () => {
    setEditVehicle(null)
    form.reset()
    setShowModal(true)
  }

  const openEdit = (vehicle: VehicleRecord) => {
    setEditVehicle(vehicle)
    form.setAll({
      license_plate: vehicle.license_plate as string,
      make: vehicle.make as string,
      model: vehicle.model as string,
      year: vehicle.year as number,
      vehicle_type: vehicle.vehicle_type as string,
      capacity: vehicle.capacity as number,
      status: vehicle.status as string,
      vin: vehicle.vin as string,
      mileage: vehicle.mileage as number,
      last_service_date: vehicle.last_service_date as string,
      next_service_date: vehicle.next_service_date as string,
      insurance_expiry: vehicle.insurance_expiry as string,
      registration_expiry: vehicle.registration_expiry as string,
      assigned_driver_id: vehicle.assigned_driver_id as string,
    })
    setShowModal(true)
  }

  const handleSave = form.handleSubmit(async (values) => {
    if (editVehicle) {
      updateMutation.mutate({ id: editVehicle.id, data: values })
    } else {
      createMutation.mutate(values)
    }
  })

  const handleDelete = (vehicle: VehicleRecord) => {
    if (!confirm(`Delete vehicle ${vehicle.license_plate}? This cannot be undone.`)) return
    deleteMutation.mutate(vehicle.id)
  }

  const viewServiceHistory = async (vehicle: VehicleRecord) => {
    setServiceVehicle(vehicle)
    setShowServiceModal(true)
    setServiceLoading(true)
    try {
      const result = await api.get<{ success: boolean; data: ServiceRecord[] }>(`/maintenance/vehicle/${vehicle.id}`)
      if (result.success) setServiceHistory(result.data || [])
    } catch { setServiceHistory([]) }
    finally { setServiceLoading(false) }
  }

  const renderActions = (vehicle: VehicleRecord) => (
    <div className="flex items-center justify-end gap-1">
      <button onClick={() => openEdit(vehicle)}
        className="p-1.5 rounded-md text-blue-600 hover:bg-blue-50 transition-colors" title="Edit">
        <Pencil size={15} />
      </button>
      <button onClick={() => viewServiceHistory(vehicle)}
        className="p-1.5 rounded-md text-purple-600 hover:bg-purple-50 transition-colors" title="Service History">
        <ClipboardList size={15} />
      </button>
      <button onClick={() => handleDelete(vehicle)}
        className="p-1.5 rounded-md text-red-600 hover:bg-red-50 transition-colors" title="Delete">
        <Trash2 size={15} />
      </button>
    </div>
  )

  if (isLoading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent" /></div>
  if (error) return <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">Failed to load vehicles</div>

  return (
    <div>
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-white text-sm font-medium ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
          {toast.message}
        </div>
      )}

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vehicles</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your fleet of vehicles.</p>
        </div>
        <button onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 shadow-sm">
          <Plus size={16} /> Add Vehicle
        </button>
      </div>

      <GenericTable<VehicleRecord>
        data={vehicles || []}
        columns={vehicleColumns}
        defaultVisibleColumns={['license_plate', 'make', 'model', 'vehicle_type', 'status', 'capacity', 'last_service_date', 'insurance_expiry']}
        pageSize={10}
        searchable={true}
        title="Vehicle Fleet"
        actions={renderActions}
      />

      <Modal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setEditVehicle(null); form.reset() }}
        title={editVehicle ? 'Edit Vehicle' : 'Add New Vehicle'}
        size="lg"
        footer={
          <div className="flex justify-end gap-3">
            <button onClick={() => { setShowModal(false); setEditVehicle(null); form.reset() }}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">Cancel</button>
            <button onClick={handleSave}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">
              {editVehicle ? 'Update Vehicle' : 'Create Vehicle'}
            </button>
          </div>
        }>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">License Plate *</label>
              <input type="text" value={form.values.license_plate as string} onChange={e => form.setValue('license_plate', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${form.errors.license_plate && form.touched.license_plate ? 'border-red-300' : 'border-gray-300'}`} />
              {form.errors.license_plate && form.touched.license_plate && <p className="text-xs text-red-500 mt-1">{form.errors.license_plate}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Type *</label>
              <select value={form.values.vehicle_type as string} onChange={e => form.setValue('vehicle_type', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {VEHICLE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Make *</label>
              <input type="text" value={form.values.make as string} onChange={e => form.setValue('make', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${form.errors.make && form.touched.make ? 'border-red-300' : 'border-gray-300'}`} />
              {form.errors.make && form.touched.make && <p className="text-xs text-red-500 mt-1">{form.errors.make}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Model *</label>
              <input type="text" value={form.values.model as string} onChange={e => form.setValue('model', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${form.errors.model && form.touched.model ? 'border-red-300' : 'border-gray-300'}`} />
              {form.errors.model && form.touched.model && <p className="text-xs text-red-500 mt-1">{form.errors.model}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Year *</label>
              <input type="number" value={form.values.year as number} onChange={e => form.setValue('year', parseInt(e.target.value) || 0)}
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${form.errors.year && form.touched.year ? 'border-red-300' : 'border-gray-300'}`} />
              {form.errors.year && form.touched.year && <p className="text-xs text-red-500 mt-1">{form.errors.year}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Capacity</label>
              <input type="number" value={form.values.capacity as number} onChange={e => form.setValue('capacity', parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select value={form.values.status as string} onChange={e => form.setValue('status', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">VIN</label>
              <input type="text" value={form.values.vin as string} onChange={e => form.setValue('vin', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mileage</label>
              <input type="number" value={form.values.mileage as number} onChange={e => form.setValue('mileage', parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Last Service</label>
              <input type="date" value={form.values.last_service_date as string} onChange={e => form.setValue('last_service_date', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Next Service</label>
              <input type="date" value={form.values.next_service_date as string} onChange={e => form.setValue('next_service_date', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Assigned Driver</label>
              <select value={form.values.assigned_driver_id as string} onChange={e => form.setValue('assigned_driver_id', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">None</option>
                {(drivers || []).map((d: { id: string; first_name: string; last_name: string }) => (
                  <option key={d.id} value={d.id}>{d.first_name} {d.last_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Insurance Expiry</label>
              <input type="date" value={form.values.insurance_expiry as string} onChange={e => form.setValue('insurance_expiry', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Registration Expiry</label>
              <input type="date" value={form.values.registration_expiry as string} onChange={e => form.setValue('registration_expiry', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={showServiceModal}
        onClose={() => { setShowServiceModal(false); setServiceHistory([]); setServiceVehicle(null) }}
        title={`Service History: ${serviceVehicle?.license_plate || ''}`}
        size="lg">
        {serviceLoading ? (
          <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent" /></div>
        ) : serviceHistory.length === 0 ? (
          <p className="text-center text-gray-500 py-8">No service records found.</p>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {serviceHistory.map((s) => (
              <div key={s.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg text-sm">
                <Calendar size={16} className="text-gray-400 mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${s.status === 'completed' ? 'bg-green-100 text-green-700' : s.status === 'in_progress' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {s.status}
                    </span>
                    <span className="font-medium text-gray-800">{s.task_type}</span>
                  </div>
                  {s.description && <p className="text-gray-500 mt-1">{s.description}</p>}
                  <div className="flex items-center gap-4 mt-1 text-xs text-gray-400">
                    <span>{s.mechanic_name}</span>
                    <span>{new Date(s.scheduled_date).toLocaleDateString()}</span>
                    {s.cost > 0 && <span>${Number(s.cost).toFixed(2)}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  )
}
