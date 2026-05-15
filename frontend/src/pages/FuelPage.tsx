import { useState } from 'react'
import { api } from '../utils/api'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Droplets } from 'lucide-react'

interface FuelRecord {
  id: string
  vehicle_id: string
  driver_id: string
  liters: number
  cost: number
  mileage_at_fill: number
  fuel_type: string
  station_name: string
  notes: string
  filled_at: string
  license_plate: string
  driver_name: string
}

export function FuelPage() {
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [form, setForm] = useState({ vehicle_id: '', driver_id: '', liters: '', cost: '', mileage_at_fill: '', fuel_type: 'diesel', station_name: '', notes: '' })

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const { data: records, isLoading } = useQuery({
    queryKey: ['fuel'],
    queryFn: () => api.get<{ success: boolean; data: FuelRecord[] }>('/fuel'),
    select: (res) => res.data || [],
  })

  const { data: vehicles } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => api.get<{ success: boolean; data: { id: string; license_plate: string }[] }>('/vehicles'),
    select: (res) => res.data || [],
  })

  const { data: fuelStats } = useQuery({
    queryKey: ['fuel-stats'],
    queryFn: () => api.get<{ success: boolean; data: { summary: { total_refills: number; total_liters: number; total_cost: number; avg_cost_per_liter: number }; monthly: { month: string; liters: number; cost: number }[] } }>('/fuel/stats'),
    select: (res) => res.data,
  })

  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post('/fuel', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fuel'] })
      queryClient.invalidateQueries({ queryKey: ['fuel-stats'] })
      showToast('Fuel record added', 'success')
      setShowForm(false)
      setForm({ vehicle_id: '', driver_id: '', liters: '', cost: '', mileage_at_fill: '', fuel_type: 'diesel', station_name: '', notes: '' })
    },
    onError: () => showToast('Failed to add record', 'error'),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.vehicle_id || !form.liters || !form.cost) {
      showToast('Vehicle, liters, and cost are required', 'error'); return
    }
    createMutation.mutate({
      vehicle_id: form.vehicle_id,
      driver_id: form.driver_id || undefined,
      liters: parseFloat(form.liters),
      cost: parseFloat(form.cost),
      mileage_at_fill: form.mileage_at_fill ? parseInt(form.mileage_at_fill) : undefined,
      fuel_type: form.fuel_type,
      station_name: form.station_name || undefined,
      notes: form.notes || undefined,
    })
  }

  if (isLoading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent" /></div>

  return (
    <div>
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-white text-sm font-medium ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
          {toast.message}
        </div>
      )}

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fuel Usage</h1>
          <p className="text-sm text-gray-500 mt-1">Track fuel consumption and costs.</p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 shadow-sm">
          <Plus size={16} /> Add Record
        </button>
      </div>

      {/* Stats Cards */}
      {fuelStats && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Total Refills</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{fuelStats.summary.total_refills}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Total Liters</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{Number(fuelStats.summary.total_liters).toFixed(1)} L</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Total Cost</p>
<p className="text-2xl font-bold text-gray-900 mt-1">KSh {Number(fuelStats.summary.total_cost).toLocaleString()}</p>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Avg Cost/Liter</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">KSh {Number(fuelStats.summary.avg_cost_per_liter || 0).toFixed(2)}</p>
          </div>
        </div>
      )}

      {/* Records Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Vehicle</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Driver</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Liters</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Cost</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Mileage</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Type</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Station</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {(records || []).map((r) => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{r.license_plate}</td>
                <td className="px-4 py-3 text-gray-600">{r.driver_name || '-'}</td>
                <td className="px-4 py-3 text-right">{Number(r.liters).toFixed(1)}</td>
                <td className="px-4 py-3 text-right">KSh {Number(r.cost).toFixed(2)}</td>
                <td className="px-4 py-3 text-right text-gray-500">{r.mileage_at_fill ? `${r.mileage_at_fill.toLocaleString()} km` : '-'}</td>
                <td className="px-4 py-3"><span className="capitalize">{r.fuel_type}</span></td>
                <td className="px-4 py-3 text-gray-500">{r.station_name || '-'}</td>
                <td className="px-4 py-3 text-gray-500">{new Date(r.filled_at).toLocaleDateString()}</td>
              </tr>
            ))}
            {(!records || records.length === 0) && (
              <tr><td colSpan={8} className="text-center py-8 text-gray-400">No fuel records yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg z-50" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold flex items-center gap-2"><Droplets size={20} className="text-blue-600" /> Add Fuel Record</h2>
              <button onClick={() => setShowForm(false)} className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">&times;</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle *</label>
                  <select value={form.vehicle_id} onChange={e => setForm({ ...form, vehicle_id: e.target.value })} required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                    <option value="">Select vehicle</option>
                    {(vehicles || []).map((v: { id: string; license_plate: string }) => (
                      <option key={v.id} value={v.id}>{v.license_plate}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fuel Type</label>
                  <select value={form.fuel_type} onChange={e => setForm({ ...form, fuel_type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                    <option value="diesel">Diesel</option>
                    <option value="petrol">Petrol</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Liters *</label>
                  <input type="number" step="0.1" min="0" value={form.liters} onChange={e => setForm({ ...form, liters: e.target.value })} required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cost ($) *</label>
                  <input type="number" step="0.01" min="0" value={form.cost} onChange={e => setForm({ ...form, cost: e.target.value })} required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mileage at Fill</label>
                  <input type="number" value={form.mileage_at_fill} onChange={e => setForm({ ...form, mileage_at_fill: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="km" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Station Name</label>
                  <input type="text" value={form.station_name} onChange={e => setForm({ ...form, station_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">Cancel</button>
                <button type="submit" disabled={createMutation.isPending}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">
                  {createMutation.isPending ? 'Saving...' : 'Save Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
