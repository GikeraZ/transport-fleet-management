import { useState, useEffect, useCallback } from 'react'
import { GenericTable } from '../components/GenericTable'
import { Modal, useForm } from '../components/Modal'
import { api } from '../utils/api'
import type { ColumnDef } from '../types'
import { UserCheck, UserX, Key, Clock, Plus, Eye } from 'lucide-react'

interface UserRecord extends Record<string, unknown> {
  id: string
  username: string
  email: string
  first_name: string
  last_name: string
  phone: string
  role_name: string
  role_id: number
  is_active: boolean
  created_at: string
}

interface ActivityLog {
  table_name: string
  action: string
  description: string
  created_at: string
  changes: Record<string, unknown> | null
}

interface RoleOption {
  id: number
  name: string
  description: string
}

const userColumns: ColumnDef<UserRecord>[] = [
  { key: 'username', header: 'Username', minWidth: 120 },
  { key: 'email', header: 'Email', minWidth: 200 },
  { key: 'first_name', header: 'First Name', minWidth: 120 },
  { key: 'last_name', header: 'Last Name', minWidth: 120 },
  { key: 'phone', header: 'Phone', minWidth: 130 },
  { key: 'role_name', header: 'Role', minWidth: 100 },
  { key: 'is_active', header: 'Active', minWidth: 80 },
  { key: 'created_at', header: 'Created', minWidth: 130 },
]

function validateUser(values: Record<string, unknown>) {
  const errors: Record<string, string> = {}
  if (!values.username) errors.username = 'Username is required'
  if (!values.email) errors.email = 'Email is required'
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email as string)) errors.email = 'Invalid email'
  if (!values.first_name) errors.first_name = 'First name is required'
  if (!values.last_name) errors.last_name = 'Last name is required'
  if (!values.phone) errors.phone = 'Phone is required'
  if (!values.password) errors.password = 'Password is required'
  else if ((values.password as string).length < 6) errors.password = 'Min 6 characters'
  if (!values.role_name) errors.role_name = 'Role is required'
  return errors
}

export function UsersPage() {
  const [data, setData] = useState<UserRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [roles, setRoles] = useState<RoleOption[]>([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [showActivityModal, setShowActivityModal] = useState(false)
  const [activityUser, setActivityUser] = useState<UserRecord | null>(null)
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([])
  const [activityLoading, setActivityLoading] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const form = useForm(
    { username: '', email: '', first_name: '', last_name: '', phone: '', password: '', role_name: 'driver' },
    validateUser
  )

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const fetchRoles = useCallback(async () => {
    try {
      const result = await api.get<{ success: boolean; data: RoleOption[] }>('/roles', false)
      if (result.success) setRoles(result.data || [])
    } catch { /* ignore */ }
  }, [])

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const result = await api.get<{ success: boolean; data: { users: UserRecord[] } }>('/users')
      if (result.success) setData(result.data.users || [])
    } catch (e) { console.error('Failed to fetch users:', e) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchUsers(); fetchRoles() }, [fetchUsers, fetchRoles])

  const toggleActive = async (user: UserRecord) => {
    try {
      const result = await api.put<{ success: boolean }>(`/users/${user.id}`, { is_active: !user.is_active })
      if (result.success) {
        setData(prev => prev.map(u => u.id === user.id ? { ...u, is_active: !user.is_active } : u))
        showToast(`${user.username} ${user.is_active ? 'suspended' : 'activated'}`, 'success')
      }
    } catch { showToast('Failed to update user', 'error') }
  }

  const changeRole = async (user: UserRecord, newRoleName: string) => {
    const matchedRole = roles.find(r => r.name === newRoleName)
    if (!matchedRole) { showToast('Invalid role', 'error'); return }
    try {
      const result = await api.put<{ success: boolean }>(`/users/${user.id}`, { role_id: matchedRole.id })
      if (result.success) {
        setData(prev => prev.map(u => u.id === user.id ? { ...u, role_name: newRoleName } : u))
        showToast(`${user.username} role changed to ${newRoleName}`, 'success')
      }
    } catch { showToast('Failed to change role', 'error') }
  }

  const resetPassword = async (user: UserRecord) => {
    if (!confirm(`Reset password for ${user.username}? A temporary password will be set.`)) return
    try {
      const result = await api.put<{ success: boolean }>(`/users/${user.id}`, { password: 'Temp@123456' })
      if (result.success) showToast(`Password reset to Temp@123456 for ${user.username}`, 'success')
      else showToast('Failed to reset password', 'error')
    } catch { showToast('Failed to reset password', 'error') }
  }

  const addUser = form.handleSubmit(async (values) => {
    try {
      const result = await api.post<{ success: boolean; error?: string; message?: string }>('/users', {
        ...values,
        role_name: values.role_name,
      })
      if (result.success) {
        showToast('User created successfully', 'success')
        setShowAddModal(false)
        form.reset()
        fetchUsers()
      } else {
        showToast(result.error || 'Failed to create user', 'error')
      }
    } catch { showToast('Failed to create user', 'error') }
  })

  const viewActivity = async (user: UserRecord) => {
    setActivityUser(user)
    setShowActivityModal(true)
    setActivityLoading(true)
    try {
      const result = await api.get<{ success: boolean; data: { logs: ActivityLog[] } }>(`/users/${user.id}/activity`)
      if (result.success) setActivityLogs(result.data.logs || [])
    } catch { setActivityLogs([]) }
    finally { setActivityLoading(false) }
  }

  const renderActions = (user: UserRecord) => (
    <div className="flex items-center justify-end gap-1">
      <button onClick={() => toggleActive(user)}
        className={`p-1.5 rounded-md transition-colors ${user.is_active ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-100'}`}
        title={user.is_active ? 'Suspend' : 'Activate'}>
        {user.is_active ? <UserCheck size={15} /> : <UserX size={15} />}
      </button>
      <select
        value={user.role_name}
        onChange={(e) => changeRole(user, e.target.value)}
        className="text-xs border border-gray-300 rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
        title="Change Role"
      >
        {roles.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
      </select>
      <button onClick={() => resetPassword(user)}
        className="p-1.5 rounded-md text-amber-600 hover:bg-amber-50 transition-colors"
        title="Reset Password">
        <Key size={15} />
      </button>
      <button onClick={() => viewActivity(user)}
        className="p-1.5 rounded-md text-blue-600 hover:bg-blue-50 transition-colors"
        title="View Activity">
        <Eye size={15} />
      </button>
    </div>
  )

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent" /></div>

  return (
    <div>
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-white text-sm font-medium ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
          {toast.message}
        </div>
      )}

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-sm text-gray-500 mt-1">Manage system users, roles, and account status.</p>
        </div>
        <button onClick={() => { form.reset(); setShowAddModal(true) }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 shadow-sm">
          <Plus size={16} /> Add User
        </button>
      </div>

      <GenericTable<UserRecord>
        data={data}
        columns={userColumns}
        defaultVisibleColumns={['username', 'email', 'first_name', 'last_name', 'role_name', 'is_active']}
        pageSize={10}
        searchable={true}
        title="Users"
        actions={renderActions}
      />

      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Add New User" size="md"
        footer={
          <div className="flex justify-end gap-3">
            <button onClick={() => setShowAddModal(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">Cancel</button>
            <button onClick={addUser} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">Create User</button>
          </div>
        }>
        <form onSubmit={addUser} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
              <input type="text" value={form.values.first_name as string} onChange={e => form.setValue('first_name', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${form.errors.first_name && form.touched.first_name ? 'border-red-300' : 'border-gray-300'}`} />
              {form.errors.first_name && form.touched.first_name && <p className="text-xs text-red-500 mt-1">{form.errors.first_name}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
              <input type="text" value={form.values.last_name as string} onChange={e => form.setValue('last_name', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${form.errors.last_name && form.touched.last_name ? 'border-red-300' : 'border-gray-300'}`} />
              {form.errors.last_name && form.touched.last_name && <p className="text-xs text-red-500 mt-1">{form.errors.last_name}</p>}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
            <input type="text" value={form.values.username as string} onChange={e => form.setValue('username', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${form.errors.username && form.touched.username ? 'border-red-300' : 'border-gray-300'}`} />
            {form.errors.username && form.touched.username && <p className="text-xs text-red-500 mt-1">{form.errors.username}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input type="email" value={form.values.email as string} onChange={e => form.setValue('email', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${form.errors.email && form.touched.email ? 'border-red-300' : 'border-gray-300'}`} />
            {form.errors.email && form.touched.email && <p className="text-xs text-red-500 mt-1">{form.errors.email}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input type="tel" value={form.values.phone as string} onChange={e => form.setValue('phone', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${form.errors.phone && form.touched.phone ? 'border-red-300' : 'border-gray-300'}`} />
            {form.errors.phone && form.touched.phone && <p className="text-xs text-red-500 mt-1">{form.errors.phone}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input type="password" value={form.values.password as string} onChange={e => form.setValue('password', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${form.errors.password && form.touched.password ? 'border-red-300' : 'border-gray-300'}`} />
            {form.errors.password && form.touched.password && <p className="text-xs text-red-500 mt-1">{form.errors.password}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <select value={form.values.role_name as string} onChange={e => form.setValue('role_name', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              {roles.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
            </select>
            {form.errors.role_name && form.touched.role_name && <p className="text-xs text-red-500 mt-1">{form.errors.role_name}</p>}
          </div>
        </form>
      </Modal>

      <Modal isOpen={showActivityModal} onClose={() => { setShowActivityModal(false); setActivityLogs([]); setActivityUser(null) }}
        title={`Activity Log: ${activityUser?.username || ''}`} size="lg">
        {activityLoading ? (
          <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent" /></div>
        ) : activityLogs.length === 0 ? (
          <p className="text-center text-gray-500 py-8">No activity logs found.</p>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {activityLogs.map((log, i) => (
              <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg text-sm">
                <Clock size={16} className="text-gray-400 mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-gray-800">
                    <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-medium mr-2 ${log.action === 'INSERT' ? 'bg-green-100 text-green-700' : log.action === 'UPDATE' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'}`}>
                      {log.action}
                    </span>
                    <span className="font-medium">{log.table_name}</span>
                  </p>
                  <p className="text-gray-500 text-xs mt-0.5">{new Date(log.created_at).toLocaleString()}</p>
                  {log.changes && (
                    <pre className="mt-1 text-xs text-gray-500 bg-white p-2 rounded border overflow-x-auto">{JSON.stringify(log.changes, null, 2)}</pre>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  )
}
