import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { useState, useMemo, useCallback, memo } from 'react'
import type { ColumnDef } from '../types'
import { ColumnToggleFilter } from './ColumnToggleFilter'
import { Pagination } from './Pagination'

interface GenericTableProps<T extends Record<string, unknown>> {
  data: T[]
  columns: ColumnDef<T>[]
  defaultVisibleColumns?: (keyof T)[]
  pageSize?: number
  searchable?: boolean
  onRowClick?: (row: T) => void
  emptyMessage?: string
  title?: string
  actions?: (row: T) => React.ReactNode
}

type SortDirection = 'asc' | 'desc' | null

const SortIndicator = memo(({ columnKey, sortKey, sortDirection, handleSort }: {
  columnKey: string
  sortKey: string | null
  sortDirection: SortDirection
  handleSort: (key: string) => void
}) => {
  if (sortKey !== columnKey) {
    return (
      <button
        onClick={() => handleSort(columnKey)}
        className="ml-1 inline-flex items-center opacity-0 group-hover:opacity-100 transition-opacity"
        title="Sort"
      >
        <ArrowUpDown size={14} className="text-gray-400" />
      </button>
    )
  }
  if (sortDirection === 'asc') {
    return <ArrowUp size={14} className="text-blue-600 ml-1" />
  }
  if (sortDirection === 'desc') {
    return <ArrowDown size={14} className="text-blue-600 ml-1" />
  }
  return null
})
SortIndicator.displayName = 'SortIndicator'

export function GenericTable<T extends Record<string, unknown>>({
  data,
  columns,
  defaultVisibleColumns,
  pageSize = 10,
  searchable = true,
  onRowClick,
  emptyMessage = 'No records found',
  title,
  actions,
}: GenericTableProps<T>) {
  const initialVisibleColumns =
    defaultVisibleColumns
      ? new Set(defaultVisibleColumns)
      : new Set(columns.slice(0, Math.min(columns.length, 6)).map((c) => c.key))

  const [visibleColumns, setVisibleColumns] = useState<Set<keyof T>>(initialVisibleColumns)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortKey, setSortKey] = useState<keyof T | null>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSizeState, setPageSize] = useState(pageSize)

  // Search across all visible data
  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return data
    const query = searchQuery.toLowerCase()
    return data.filter((row) =>
      columns.some((col) => {
        if (!visibleColumns.has(col.key)) return false
        const value = row[col.key]
        return value != null && String(value).toLowerCase().includes(query)
      })
    )
  }, [data, searchQuery, columns, visibleColumns])

  // Sort data
  const sortedData = useMemo(() => {
    if (!sortKey || !sortDirection) return filteredData
    const sorted = [...filteredData].sort((a, b) => {
      const aVal = a[sortKey as keyof T]
      const bVal = b[sortKey as keyof T]
      if (aVal == null && bVal == null) return 0
      if (aVal == null) return 1
      if (bVal == null) return -1
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal
      }
      const aStr = String(aVal)
      const bStr = String(bVal)
      return sortDirection === 'asc'
        ? aStr.localeCompare(bStr)
        : bStr.localeCompare(aStr)
    })
    return sorted
  }, [filteredData, sortKey, sortDirection])

  // Paginate
  const totalPages = Math.ceil(sortedData.length / pageSizeState) || 1
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSizeState
    return sortedData.slice(start, start + pageSizeState)
  }, [sortedData, currentPage, pageSizeState])

  const handleSort = useCallback(
    (key: keyof T) => {
      if (sortKey === key) {
        setSortDirection((prev) => {
          if (prev === 'asc') return 'desc'
          if (prev === 'desc') return null
          return null
        })
        if (sortDirection === 'desc') {
          setSortKey(null)
          setSortDirection(null)
          return
        }
      } else {
        setSortKey(key)
        setSortDirection('asc')
      }
    },
    [sortKey, sortDirection]
  )

  const handleToggleColumn = useCallback((key: keyof T) => {
    setVisibleColumns((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        if (next.size <= 1) return next // Keep at least one column
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
    setCurrentPage(1)
  }, [])

  const handleResetColumns = useCallback(() => {
    setVisibleColumns(
      new Set(columns.slice(0, Math.min(columns.length, 6)).map((c) => c.key))
    )
    setCurrentPage(1)
  }, [columns])

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page)
  }, [])

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query)
    setCurrentPage(1)
  }, [])

  const handlePageSizeChange = useCallback((size: number) => {
    setPageSize(size)
    setCurrentPage(1)
  }, [])

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between flex-wrap gap-2">
        {title && (
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
        )}
        <div className="flex items-center gap-3">
          {searchable && (
            <div className="relative">
              <input
                type="text"
                placeholder="Search across columns..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-48 lg:w-64"
              />
              <svg
                className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
          )}
          <ColumnToggleFilter
            columns={columns}
            visibleColumns={visibleColumns}
            onToggle={handleToggleColumn}
            onReset={handleResetColumns}
          />
        </div>
      </div>

      {/* Table */}
      <div className="table-container">
        <table className="min-w-full">
          <thead>
            <tr>
              {columns
                .filter((col) => visibleColumns.has(col.key))
                .map((col) => (
                  <th
                    key={String(col.key)}
                    className="cursor-pointer select-none"
                    onClick={() => handleSort(col.key)}
                  >
                    <div className="flex items-center">
                      {col.header}
                      <SortIndicator columnKey={String(col.key)} sortKey={sortKey ? String(sortKey) : null} sortDirection={sortDirection} handleSort={handleSort} />
                    </div>
                  </th>
                ))}
              {actions && <th className="text-right">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {paginatedData.length === 0 ? (
              <tr>
                <td
                  colSpan={
                    visibleColumns.size + (actions ? 1 : 0)
                  }
                  className="text-center py-12 text-gray-500"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              paginatedData.map((row, rowIdx) => (
                <tr
                  key={rowIdx}
                  onClick={() => onRowClick?.(row)}
                  style={onRowClick ? { cursor: 'pointer' } : undefined}
                >
                  {columns
                    .filter((col) => visibleColumns.has(col.key))
                    .map((col) => (
                      <td key={String(col.key)}>
                        {String(row[col.key] ?? '–')}
                      </td>
                    ))}
                  {actions && (
                    <td className="text-right">{actions(row)}</td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {sortedData.length > pageSizeState && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSizeState}
          totalItems={sortedData.length}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
        />
      )}
    </div>
  )
}