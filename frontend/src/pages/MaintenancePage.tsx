import { useState, useEffect, useCallback } from 'react'
import { GenericTable } from '../components/GenericTable'
import { Modal, useForm } from '../components/Modal'
import { api } from '../utils/api'
import type { ColumnDef } from '../types'
import { Plus, Play, CheckCircle } from 'lucide-react'

interface MaintenanceRecord extends Record<string, unknown> {
  id: string
  vehicle_license_plate: string
  mechanic_name: string
  task_type: string
  description: string
  scheduled_date: string
  start_date: string
  completion_date: string
  status: string
  parts_used: string
  labor_hours: number
  cost: number
  vehicle_id: string
  mechanic_id: string
}

interface SelectOption {
  id: string
  [key: string]: unknown
}

const TASK_TYPES = ['oil_change', 'tire_rotation', 'brake_service', 'engine_repair', 'transmission', 'electrical', 'hvac', 'inspection', 'body_repair', 'other']

const maintenanceColumns: ColumnDef<MaintenanceRecord>[] = [
  { key: 'vehicle_license_plate', header: 'Vehicle', minWidth: 120 },
  { key: 'mechanic_name', header: 'Mechanic', minWidth: 150 },
  { key: 'task_type', header: 'Task Type', minWidth: 120 },
  { key: 'description', header: 'Description', minWidth: 180 },
  { key: 'scheduled_date', header: 'Scheduled', minWidth: 120 },
  { key: 'start_date', header: 'Start Date', minWidth: 120 },
  { key: 'completion_date', header: 'Completion', minWidth: 120 },
  { key: 'status', header: 'Status', minWidth: 100 },
  { key: 'parts_used', header: 'Parts Used', minWidth: 130 },
  { key: 'labor_hours', header: 'Labor Hrs', minWidth: 100 },
  { key: 'cost', header: 'Cost', minWidth: 100 },
]

interface MaintenancePageProps { isMechanicView?: boolean }

export function MaintenancePage({ isMechanicView }: MaintenancePageProps = {}) {
  const [tasks, setTasks] = useState<MaintenanceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [vehicles, setVehicles] = useState<SelectOption[]>([])
  const [mechanics, setMechanics] = useState<SelectOption[]>([])
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const form = useForm({
    vehicle_id: '', mechanic_id: '', task_type: 'inspection',
    description: '', scheduled_date: '', start_date: '',
    labor_hours: 0, cost: 0, parts_used: ''
  }, (values) => {
    const errors: Record<string, string> = {}
    if (!values.vehicle_id) errors.vehicle_id = 'Required'
    if (!values.mechanic_id) errors.mechanic_id = 'Required'
    if (!values.task_type) errors.task_type = 'Required'
    if (!values.scheduled_date) errors.scheduled_date = 'Required'
    return errors
  })

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const fetchTasks = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await api.get<{ success: boolean; data: MaintenanceRecord[]; error?: string }>('/maintenance')
      if (result.success) setTasks(result.data || [])
      else setError(result.error || 'Failed to load maintenance tasks')
    } catch { setError('Failed to connect to server') }
    finally { setLoading(false) }
  }, [])

  const fetchSelectData = useCallback(async () => {
    const [vehiclesRes, mechanicsRes] = await Promise.all([
      api.get<{ success: boolean; data: SelectOption[] }>('/vehicles'),
      api.get<{ success: boolean; data: SelectOption[] }>('/mechanics'),
    ])
    if (vehiclesRes.success) setVehicles(vehiclesRes.data || [])
    if (mechanicsRes.success) setMechanics(mechanicsRes.data || [])
  }, [])

  useEffect(() => { fetchTasks() }, [fetchTasks])

  const updateStatus = async (task: MaintenanceRecord, status: string) => {
    const body: Record<string, unknown> = { status }
    if (status === 'in_progress') body.start_date = new Date().toISOString().split('T')[0]
    if (status === 'completed') body.completion_date = new Date().toISOString().split('T')[0]
    try {
      const result = await api.put<{ success: boolean }>(`/maintenance/${task.id}`, body)
      if (result.success) {
        setTasks(prev => prev.map(t => t.id === task.id ? { ...t, ...body } : t))
        showToast(`Task ${status}`, 'success')
      } else showToast('Failed to update task', 'error')
    } catch { showToast('Failed to update task', 'error') }
  }

  const openCreate = async () => {
    form.reset()
    await fetchSelectData()
    setShowModal(true)
  }

  const handleCreate = form.handleSubmit(async (values) => {
    try {
      const result = await api.post<{ success: boolean }>('/maintenance', values)
      if (result.success) {
        showToast('Task created', 'success')
        setShowModal(false)
        form.reset()
        fetchTasks()
      } else showToast('Failed to create task', 'error')
    } catch { showToast('Failed to create task', 'error') }
  })

  const renderActions = (task: MaintenanceRecord) => (
    <div className="flex items-center justify-end gap-1">
      {!isMechanicView && (task.status === 'scheduled' || task.status === 'assigned') && (
        <button onClick={() => updateStatus(task, 'in_progress')}
          className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100">
          <Play size={12} /> Start
        </button>
      )}
      {!isMechanicView && task.status === 'in_progress' && (
        <button onClick={() => updateStatus(task, 'completed')}
          className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-amber-600 bg-amber-50 rounded-md hover:bg-amber-100">
          <CheckCircle size={12} /> Complete
        </button>
      )}
      {isMechanicView && task.status === 'scheduled' && (
        <button onClick={() => updateStatus(task, 'in_progress')}
          className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-green-600 bg-green-50 rounded-md hover:bg-green-100">
          <Play size={12} /> Start
        </button>
      )}
      {isMechanicView && task.status === 'in_progress' && (
        <button onClick={() => updateStatus(task, 'completed')}
          className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-amber-600 bg-amber-50 rounded-md hover:bg-amber-100">
          <CheckCircle size={12} /> Complete
        </button>
      )}
    </div>
  )

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent" /></div>
  if (error) return <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">{error}</div>

  const defaultVisibleColumns = isMechanicView
    ? ['vehicle_license_plate', 'task_type', 'description', 'status', 'scheduled_date', 'labor_hours']
    : ['vehicle_license_plate', 'mechanic_name', 'task_type', 'status', 'scheduled_date', 'cost']

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
            {isMechanicView ? 'Work Orders' : 'Maintenance Tasks'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {isMechanicView ? 'View and update your assigned maintenance tasks.' : 'Track and manage all maintenance activities.'}
          </p>
        </div>
        {!isMechanicView && (
          <button onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 shadow-sm">
            <Plus size={16} /> Create Task
          </button>
        )}
      </div>

      <GenericTable<MaintenanceRecord>
        data={tasks}
        columns={maintenanceColumns}
        defaultVisibleColumns={defaultVisibleColumns}
        pageSize={10}
        searchable={true}
        title={isMechanicView ? 'Work Orders' : 'Maintenance Schedule'}
        actions={renderActions}
      />

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Create Maintenance Task"
        size="lg"
        footer={
          <div className="flex justify-end gap-3">
            <button onClick={() => setShowModal(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">Cancel</button>
            <button onClick={handleCreate}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">Create Task</button>
          </div>
        }>
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Mechanic *</label>
              <select value={form.values.mechanic_id as string} onChange={e => form.setValue('mechanic_id', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${form.errors.mechanic_id && form.touched.mechanic_id ? 'border-red-300' : 'border-gray-300'}`}>
                <option value="">Select Mechanic</option>
                {mechanics.map(m => <option key={m.id} value={m.id}>{String(m.first_name) + ' ' + String(m.last_name)}</option>)}
              </select>
              {form.errors.mechanic_id && form.touched.mechanic_id && <p className="text-xs text-red-500 mt-1">{form.errors.mechanic_id}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Task Type *</label>
              <select value={form.values.task_type as string} onChange={e => form.setValue('task_type', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {TASK_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Scheduled Date *</label>
              <input type="date" value={form.values.scheduled_date as string} onChange={e => form.setValue('scheduled_date', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${form.errors.scheduled_date && form.touched.scheduled_date ? 'border-red-300' : 'border-gray-300'}`} />
              {form.errors.scheduled_date && form.touched.scheduled_date && <p className="text-xs text-red-500 mt-1">{form.errors.scheduled_date}</p>}
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea value={form.values.description as string} onChange={e => form.setValue('description', e.target.value)} rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
        </form>
      </Modal>
    </div>
  )
}
