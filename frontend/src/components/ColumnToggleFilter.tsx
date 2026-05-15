import { Check, ChevronDown } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import type { ColumnDef } from '../types'

interface ColumnToggleFilterProps<T> {
  columns: ColumnDef<T>[]
  visibleColumns: Set<keyof T>
  onToggle: (key: keyof T) => void
  onReset: () => void
}

export function ColumnToggleFilter<T extends Record<string, unknown>>({
  columns,
  visibleColumns,
  onToggle,
  onReset,
}: ColumnToggleFilterProps<T>) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const visibleCount = visibleColumns.size
  const totalCount = columns.length

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
        </svg>
        Columns
        <ChevronDown
          size={14}
          className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 z-50 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 animate-in fade-in slide-in-from-top-2">
          <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Show/Hide Columns ({visibleCount}/{totalCount})
          </div>
          <div className="max-h-60 overflow-y-auto">
            {columns.map((column) => {
              const isVisible = visibleColumns.has(column.key)
              return (
                <button
                  key={String(column.key)}
                  onClick={() => onToggle(column.key)}
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <div
                    className={`flex h-4 w-4 items-center justify-center rounded border-2 transition-colors ${
                      isVisible
                        ? 'bg-blue-600 border-blue-600'
                        : 'border-gray-300 bg-white'
                    }`}
                  >
                    {isVisible && (
                      <Check size={12} className="text-white" />
                    )}
                  </div>
                  <span className="truncate">{column.header}</span>
                </button>
              )
            })}
          </div>
          <div className="border-t border-gray-100 px-4 py-2">
            <button
              onClick={onReset}
              className="w-full text-left text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              Reset to default
            </button>
          </div>
        </div>
      )}
    </div>
  )
}