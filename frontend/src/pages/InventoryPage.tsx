import { useState, useEffect, useCallback } from 'react'
import { GenericTable } from '../components/GenericTable'
import { Modal, useForm } from '../components/Modal'
import { api } from '../utils/api'
import type { ColumnDef } from '../types'
import { Plus, Pencil, Trash2 } from 'lucide-react'

interface InventoryRecord extends Record<string, unknown> {
  id: string
  item_name: string
  item_code: string
  category: string
  quantity: number
  unit: string
  min_threshold: number
  unit_cost: number
  supplier: string
  location: string
}

const inventoryColumns: ColumnDef<InventoryRecord>[] = [
  { key: 'item_name', header: 'Item Name', minWidth: 150 },
  { key: 'item_code', header: 'Item Code', minWidth: 120 },
  { key: 'category', header: 'Category', minWidth: 120 },
  { key: 'quantity', header: 'Quantity', minWidth: 90 },
  { key: 'unit', header: 'Unit', minWidth: 70 },
  { key: 'min_threshold', header: 'Min Threshold', minWidth: 120 },
  { key: 'unit_cost', header: 'Unit Cost', minWidth: 100 },
  { key: 'supplier', header: 'Supplier', minWidth: 150 },
  { key: 'location', header: 'Location', minWidth: 130 },
]

const CATEGORIES = ['engine_parts', 'brake_system', 'electrical', 'suspension', 'transmission', 'body_parts', 'fluids', 'filters', 'tires', 'tools', 'safety', 'other']

export function InventoryPage() {
  const [data, setData] = useState<InventoryRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem] = useState<InventoryRecord | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const form = useForm({
    item_name: '', item_code: '', category: 'other', quantity: 0,
    unit: 'piece', min_threshold: 5, unit_cost: 0, supplier: '', location: ''
  }, (values) => {
    const errors: Record<string, string> = {}
    if (!values.item_name) errors.item_name = 'Required'
    if (!values.quantity && values.quantity !== 0) errors.quantity = 'Required'
    else if (Number(values.quantity) < 0) errors.quantity = 'Cannot be negative'
    return errors
  })

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const fetchInventory = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await api.get<{ success: boolean; data: InventoryRecord[]; error?: string }>('/inventory')
      if (result.success) setData(result.data || [])
      else setError(result.error || 'Failed to load inventory')
    } catch { setError('Failed to connect to server') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchInventory() }, [fetchInventory])

  const openAdd = () => {
    setEditItem(null)
    form.reset()
    setShowModal(true)
  }

  const openEdit = (item: InventoryRecord) => {
    setEditItem(item)
    form.setAll({
      item_name: item.item_name as string,
      item_code: item.item_code as string,
      category: item.category as string,
      quantity: item.quantity as number,
      unit: item.unit as string,
      min_threshold: item.min_threshold as number,
      unit_cost: item.unit_cost as number,
      supplier: item.supplier as string,
      location: item.location as string,
    })
    setShowModal(true)
  }

  const handleSave = form.handleSubmit(async (values) => {
    try {
      if (editItem) {
        const result = await api.put<{ success: boolean }>(`/inventory/${editItem.id}`, values)
        if (result.success) showToast('Item updated', 'success')
        else { showToast('Failed to update', 'error'); return }
      } else {
        const result = await api.post<{ success: boolean }>('/inventory', values)
        if (result.success) showToast('Item created', 'success')
        else { showToast('Failed to create', 'error'); return }
      }
      setShowModal(false)
      setEditItem(null)
      form.reset()
      fetchInventory()
    } catch { showToast('Failed to save item', 'error') }
  })

  const handleDelete = async (item: InventoryRecord) => {
    if (!confirm(`Delete ${item.item_name}?`)) return
    try {
      const result = await api.delete<{ success: boolean }>(`/inventory/${item.id}`)
      if (result.success) {
        showToast('Item deleted', 'success')
        fetchInventory()
      } else showToast('Failed to delete', 'error')
    } catch { showToast('Failed to delete', 'error') }
  }

  const renderActions = (item: InventoryRecord) => (
    <div className="flex items-center justify-end gap-1">
      <button onClick={() => openEdit(item)}
        className="p-1.5 rounded-md text-blue-600 hover:bg-blue-50 transition-colors" title="Edit">
        <Pencil size={15} />
      </button>
      <button onClick={() => handleDelete(item)}
        className="p-1.5 rounded-md text-red-600 hover:bg-red-50 transition-colors" title="Delete">
        <Trash2 size={15} />
      </button>
    </div>
  )

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent" /></div>
  if (error) return <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">{error}</div>

  const lowStock = data.filter((item) => item.quantity <= item.min_threshold)

  return (
    <div>
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-white text-sm font-medium ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
          {toast.message}
        </div>
      )}

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory Management</h1>
          <p className="text-sm text-gray-500 mt-1">Manage spare parts and inventory items.</p>
        </div>
        <button onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 shadow-sm">
          <Plus size={16} /> Add Item
        </button>
      </div>

      {lowStock.length > 0 && (
        <div className="mb-4 bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-amber-700 font-medium text-sm mb-1">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Low Stock Alert
          </div>
          <p className="text-sm text-amber-600">{lowStock.length} item(s) are below minimum threshold.</p>
        </div>
      )}

      <GenericTable<InventoryRecord>
        data={data}
        columns={inventoryColumns}
        defaultVisibleColumns={['item_name', 'item_code', 'category', 'quantity', 'unit_cost', 'supplier']}
        pageSize={10}
        searchable={true}
        title="Spare Parts & Inventory"
        actions={renderActions}
      />

      <Modal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setEditItem(null); form.reset() }}
        title={editItem ? 'Edit Inventory Item' : 'Add Inventory Item'}
        size="lg"
        footer={
          <div className="flex justify-end gap-3">
            <button onClick={() => { setShowModal(false); setEditItem(null); form.reset() }}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">Cancel</button>
            <button onClick={handleSave}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">
              {editItem ? 'Update Item' : 'Create Item'}
            </button>
          </div>
        }>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Item Name *</label>
              <input type="text" value={form.values.item_name as string} onChange={e => form.setValue('item_name', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${form.errors.item_name && form.touched.item_name ? 'border-red-300' : 'border-gray-300'}`} />
              {form.errors.item_name && form.touched.item_name && <p className="text-xs text-red-500 mt-1">{form.errors.item_name}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Item Code</label>
              <input type="text" value={form.values.item_code as string} onChange={e => form.setValue('item_code', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select value={form.values.category as string} onChange={e => form.setValue('category', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {CATEGORIES.map(c => <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
              <select value={form.values.unit as string} onChange={e => form.setValue('unit', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="piece">Piece</option>
                <option value="liter">Liter</option>
                <option value="kg">Kg</option>
                <option value="meter">Meter</option>
                <option value="box">Box</option>
                <option value="set">Set</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quantity *</label>
              <input type="number" value={form.values.quantity as number} onChange={e => form.setValue('quantity', parseInt(e.target.value) || 0)}
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${form.errors.quantity && form.touched.quantity ? 'border-red-300' : 'border-gray-300'}`} />
              {form.errors.quantity && form.touched.quantity && <p className="text-xs text-red-500 mt-1">{form.errors.quantity}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Min Threshold</label>
              <input type="number" value={form.values.min_threshold as number} onChange={e => form.setValue('min_threshold', parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unit Cost ($)</label>
              <input type="number" step="0.01" value={form.values.unit_cost as number} onChange={e => form.setValue('unit_cost', parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Supplier</label>
              <input type="text" value={form.values.supplier as string} onChange={e => form.setValue('supplier', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
              <input type="text" value={form.values.location as string} onChange={e => form.setValue('location', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
        </form>
      </Modal>
    </div>
  )
}
