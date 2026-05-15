import { useState, useEffect, useCallback } from 'react'
import { GenericTable } from '../components/GenericTable'
import { api } from '../utils/api'
import type { ColumnDef } from '../types'

interface DriverRecord extends Record<string, unknown> {
  id: string
  first_name: string
  last_name: string
  email: string
  phone: string
  license_number: string
  license_type: string
  license_expiry: string
  hire_date: string
  emergency_contact_name: string
  emergency_contact_phone: string
  is_available: boolean
}

const driverColumns: ColumnDef<DriverRecord>[] = [
  { key: 'first_name', header: 'First Name', minWidth: 120 },
  { key: 'last_name', header: 'Last Name', minWidth: 120 },
  { key: 'email', header: 'Email', minWidth: 200 },
  { key: 'phone', header: 'Phone', minWidth: 130 },
  { key: 'license_number', header: 'License #', minWidth: 140 },
  { key: 'license_type', header: 'License Type', minWidth: 120 },
  { key: 'license_expiry', header: 'License Expiry', minWidth: 120 },
  { key: 'hire_date', header: 'Hire Date', minWidth: 110 },
  { key: 'emergency_contact_name', header: 'Emergency Contact', minWidth: 160 },
  { key: 'emergency_contact_phone', header: 'Emergency Phone', minWidth: 150 },
  { key: 'is_available', header: 'Available', minWidth: 90 },
]

export function DriversPage() {
  const [drivers, setDrivers] = useState<DriverRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDrivers = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await api.get<{ success: boolean; data: DriverRecord[]; error?: string }>('/drivers')
      if (result.success) setDrivers(result.data || [])
      else setError(result.error || 'Failed to load drivers')
    } catch (e) {
      setError('Failed to connect to server')
      console.error('Get drivers error:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchDrivers() }, [fetchDrivers])

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent" /></div>
  if (error) return <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">{error}</div>

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Drivers</h1>
        <p className="text-sm text-gray-500 mt-1">Manage drivers and their credentials.</p>
      </div>
      <GenericTable<DriverRecord>
        data={drivers}
        columns={driverColumns}
        defaultVisibleColumns={['first_name', 'last_name', 'license_number', 'phone', 'is_available']}
        pageSize={10}
        searchable={true}
        title="Driver Registry"
      />
    </div>
  )
}
