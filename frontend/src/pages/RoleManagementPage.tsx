import { useState, useEffect, useCallback } from 'react'
import { api } from '../utils/api'
import { Modal, useForm } from '../components/Modal'
import { Shield, Plus, Trash2 } from 'lucide-react'

interface Role {
  id: number
  name: string
  description: string
}

interface Permission {
  id: number
  name: string
  module: string
  description: string
}

export function RoleManagementPage() {
  const [roles, setRoles] = useState<Role[]>([])
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [rolePermissions, setRolePermissions] = useState<Record<number, Set<number>>>({})
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const form = useForm({ name: '', description: '' }, (values) => {
    const errors: Record<string, string> = {}
    if (!values.name) errors.name = 'Required'
    return errors
  })

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [rolesRes, permsRes] = await Promise.all([
        api.get<{ success: boolean; data: Role[] }>('/roles'),
        api.get<{ success: boolean; data: Permission[] }>('/roles/permissions'),
      ])
      if (rolesRes.success) {
        setRoles(rolesRes.data || [])
        const permMap: Record<number, Set<number>> = {}
        for (const role of (rolesRes.data || [])) {
          const rp = await api.get<{ success: boolean; data: Permission[] }>(`/roles/${role.id}/permissions`)
          if (rp.success) permMap[role.id] = new Set((rp.data || []).map(p => p.id))
        }
        setRolePermissions(permMap)
      }
      if (permsRes.success) setPermissions(permsRes.data || [])
    } catch { showToast('Failed to load data', 'error') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const togglePermission = async (roleId: number, permissionId: number, assigned: boolean) => {
    setRolePermissions(prev => {
      const next = { ...prev }
      const set = new Set(prev[roleId] || [])
      if (assigned) set.add(permissionId)
      else set.delete(permissionId)
      next[roleId] = set
      return next
    })

    try {
      const result = await api.post<{ success: boolean }>('/roles/assign-permission', { role_id: roleId, permission_id: permissionId, assigned })
      if (!result.success) {
        setRolePermissions(prev => {
          const next = { ...prev }
          const set = new Set(prev[roleId] || [])
          if (assigned) set.delete(permissionId)
          else set.add(permissionId)
          next[roleId] = set
          return next
        })
        showToast('Failed to update permission', 'error')
      }
    } catch {
      setRolePermissions(prev => {
        const next = { ...prev }
        const set = new Set(prev[roleId] || [])
        if (assigned) set.delete(permissionId)
        else set.add(permissionId)
        next[roleId] = set
        return next
      })
      showToast('Failed to update permission', 'error')
    }
  }

  const createRole = form.handleSubmit(async (values) => {
    try {
      const result = await api.post<{ success: boolean; data: Role }>('/roles', values)
      if (result.success) {
        showToast('Role created', 'success')
        setShowCreateModal(false)
        form.reset()
        fetchData()
      } else showToast('Failed to create role', 'error')
    } catch { showToast('Failed to create role', 'error') }
  })

  const deleteRole = async (role: Role) => {
    if (!confirm(`Delete role "${role.name}"? This cannot be undone.`)) return
    try {
      const result = await api.delete<{ success: boolean }>(`/roles/${role.id}`)
      if (result.success) {
        showToast('Role deleted', 'success')
        fetchData()
      } else showToast('Failed to delete role', 'error')
    } catch { showToast('Failed to delete role', 'error') }
  }

  const modules = [...new Set(permissions.map(p => p.module))]

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
          <h1 className="text-2xl font-bold text-gray-900">Role Management</h1>
          <p className="text-sm text-gray-500 mt-1">Manage roles and assign permissions.</p>
        </div>
        <button onClick={() => { form.reset(); setShowCreateModal(true) }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 shadow-sm">
          <Plus size={16} /> Create Role
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-[140px]">Permission</th>
                {roles.map(role => (
                  <th key={role.id} className="px-3 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-[120px]">
                    <div className="flex items-center justify-center gap-1">
                      <Shield size={14} />
                      <span>{role.name}</span>
                      {role.name !== 'admin' && role.name !== 'superadmin' && (
                        <button onClick={() => deleteRole(role)}
                          className="p-0.5 text-red-400 hover:text-red-600" title="Delete role">
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                    <span className="block text-[10px] font-normal text-gray-400 mt-0.5">{role.description}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {modules.map(module => (
                <>
                  <tr key={module} className="bg-gray-50/50">
                    <td colSpan={roles.length + 1} className="px-4 py-2 text-xs font-bold text-gray-600 uppercase tracking-wider border-t border-gray-200">
                      {module}
                    </td>
                  </tr>
                  {permissions.filter(p => p.module === module).map(perm => (
                    <tr key={perm.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-2.5 text-sm text-gray-700 border-t border-gray-100">
                        <span className="font-medium">{perm.name}</span>
                        {perm.description && <span className="block text-xs text-gray-400">{perm.description}</span>}
                      </td>
                      {roles.map(role => (
                        <td key={role.id} className="px-3 py-2.5 text-center border-t border-gray-100">
                          <label className="inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={rolePermissions[role.id]?.has(perm.id) || false}
                              onChange={(e) => togglePermission(role.id, perm.id, e.target.checked)}
                              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                              disabled={role.name === 'superadmin'}
                            />
                          </label>
                        </td>
                      ))}
                    </tr>
                  ))}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New Role"
        footer={
          <div className="flex justify-end gap-3">
            <button onClick={() => setShowCreateModal(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">Cancel</button>
            <button onClick={createRole}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">Create Role</button>
          </div>
        }>
        <form onSubmit={createRole} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role Name *</label>
            <input type="text" value={form.values.name as string} onChange={e => form.setValue('name', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${form.errors.name && form.touched.name ? 'border-red-300' : 'border-gray-300'}`} />
            {form.errors.name && form.touched.name && <p className="text-xs text-red-500 mt-1">{form.errors.name}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea value={form.values.description as string} onChange={e => form.setValue('description', e.target.value)} rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </form>
      </Modal>
    </div>
  )
}
