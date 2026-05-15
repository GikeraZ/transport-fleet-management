import { useState, useEffect, useCallback } from 'react'
import { GenericTable } from '../components/GenericTable'
import { api } from '../utils/api'
import type { ColumnDef } from '../types'

interface MechanicRecord extends Record<string, unknown> {
  id: string
  first_name: string
  last_name: string
  email: string
  phone: string
  specialization: string
  certification_level: string
  hire_date: string
  is_available: boolean
}

const mechanicColumns: ColumnDef<MechanicRecord>[] = [
  { key: 'first_name', header: 'First Name', minWidth: 120 },
  { key: 'last_name', header: 'Last Name', minWidth: 120 },
  { key: 'email', header: 'Email', minWidth: 200 },
  { key: 'phone', header: 'Phone', minWidth: 130 },
  { key: 'specialization', header: 'Specialization', minWidth: 150 },
  { key: 'certification_level', header: 'Certification', minWidth: 150 },
  { key: 'hire_date', header: 'Hire Date', minWidth: 110 },
  { key: 'is_available', header: 'Available', minWidth: 90 },
]

export function MechanicsPage() {
  const [mechanics, setMechanics] = useState<MechanicRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchMechanics = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await api.get<{ success: boolean; data: MechanicRecord[]; error?: string }>('/mechanics')
      if (result.success) setMechanics(result.data || [])
      else setError(result.error || 'Failed to load mechanics')
    } catch (e) {
      setError('Failed to connect to server')
      console.error('Get mechanics error:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchMechanics() }, [fetchMechanics])

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent" /></div>
  if (error) return <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">{error}</div>

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Mechanics</h1>
        <p className="text-sm text-gray-500 mt-1">Manage mechanics and their specializations.</p>
      </div>
      <GenericTable<MechanicRecord>
        data={mechanics}
        columns={mechanicColumns}
        defaultVisibleColumns={['first_name', 'last_name', 'specialization', 'certification_level', 'is_available']}
        pageSize={10}
        searchable={true}
        title="Mechanic Registry"
      />
    </div>
  )
}
