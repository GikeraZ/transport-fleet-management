import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts'
import { api } from '../utils/api'
import { useQuery } from '@tanstack/react-query'

const COLORS = ['#3B82F6', '#F59E0B', '#10B981', '#EF4444', '#8B5CF6', '#EC4899']

export function ReportsPage() {
  const { data: tripAnalytics } = useQuery({
    queryKey: ['report-trips'],
    queryFn: () => api.get<{ success: boolean; data: { status: { status: string; count: number }[]; daily: { day: string; trip_count: number; total_passengers: number }[]; topDrivers: { driver_name: string; trip_count: number }[] } }>('/reports/trips/analytics'),
    select: (res) => res.data,
  })

  const { data: maintStats } = useQuery({
    queryKey: ['report-maintenance'],
    queryFn: () => api.get<{ success: boolean; data: { status: { status: string; count: number }[]; cost: { month: string; total_cost: number; task_count: number }[]; type: { task_type: string; count: number; avg_cost: number }[] } }>('/reports/maintenance/stats'),
    select: (res) => res.data,
  })

  const { data: vehicleStatus } = useQuery({
    queryKey: ['report-vehicles'],
    queryFn: () => api.get<{ success: boolean; data: { status: string; count: number }[] }>('/reports/vehicles/status'),
    select: (res) => res.data,
  })

  const { data: driverPerf } = useQuery({
    queryKey: ['report-drivers'],
    queryFn: () => api.get<{ success: boolean; data: { id: string; first_name: string; last_name: string; total_trips: number; completed_trips: number; cancelled_trips: number; on_time_departures: number; completion_rate: number; avg_late_minutes: number }[] }>('/reports/drivers/performance'),
    select: (res) => res.data,
  })

  const { data: operational } = useQuery({
    queryKey: ['report-operational'],
    queryFn: () => api.get<{ success: boolean; data: { trips: { total_trips: number; completed_trips: number; active_trips: number; cancelled_trips: number }; vehicles: { total: number; active_vehicles: number; in_maintenance: number }; maintenance: { pending_tasks: number }; fuel: { total_fuel_cost: number; total_liters: number } } }>('/reports/operational/summary'),
    select: (res) => res.data,
  })

  const monthlyData = (tripAnalytics?.daily || []).slice(0, 6).map(d => ({
    month: new Date(d.day).toLocaleDateString('en', { month: 'short' }),
    trips: d.trip_count,
    passengers: d.total_passengers,
  }))

  const tripStatusData = (tripAnalytics?.status || []).map(s => ({
    name: s.status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    value: s.count,
  }))

  const maintTypeData = (maintStats?.type || []).map(t => ({
    name: t.task_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    count: t.count,
  }))

  return (
    <div className="space-y-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-sm text-gray-500 mt-1">View operational metrics and performance data.</p>
        </div>
      </div>

      {/* Operational Summary */}
      {operational && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <p className="text-xs text-gray-500 uppercase">Total Trips</p>
            <p className="text-2xl font-bold mt-1">{operational.trips.total_trips}</p>
            <p className="text-xs text-green-600">{operational.trips.completed_trips} completed</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <p className="text-xs text-gray-500 uppercase">Active Trips</p>
            <p className="text-2xl font-bold mt-1 text-blue-600">{operational.trips.active_trips}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <p className="text-xs text-gray-500 uppercase">Fleet Status</p>
            <p className="text-2xl font-bold mt-1">{operational.vehicles.active_vehicles}<span className="text-sm text-gray-400">/{operational.vehicles.total}</span></p>
            <p className="text-xs text-amber-600">{operational.vehicles.in_maintenance} in maintenance</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <p className="text-xs text-gray-500 uppercase">Fuel Cost</p>
            <p className="text-2xl font-bold mt-1">${Number(operational.fuel.total_fuel_cost).toLocaleString()}</p>
            <p className="text-xs text-gray-400">{Number(operational.fuel.total_liters).toFixed(0)} L total</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Daily Trips (Last 30 Days)</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="trips" fill="#3B82F6" name="Trips" radius={[4, 4, 0, 0]} />
                <Bar dataKey="passengers" fill="#10B981" name="Passengers" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Trip Status Distribution</h3>
          <div className="h-72 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={tripStatusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {tripStatusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Maintenance Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Maintenance by Type</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={maintTypeData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 12 }} width={120} />
                <Tooltip />
                <Bar dataKey="count" fill="#F59E0B" name="Tasks" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Driver Performance</h3>
          <div className="overflow-y-auto max-h-72">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 uppercase">
                  <th className="pb-2 pr-2">Driver</th>
                  <th className="pb-2 pr-2 text-right">Trips</th>
                  <th className="pb-2 pr-2 text-right">Rate</th>
                  <th className="pb-2 text-right">Late (min)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(driverPerf || []).map(d => (
                  <tr key={d.id} className="text-gray-700">
                    <td className="py-2 pr-2 font-medium">{d.first_name} {d.last_name}</td>
                    <td className="py-2 pr-2 text-right">{d.completed_trips}/{d.total_trips}</td>
                    <td className="py-2 pr-2 text-right">{d.completion_rate}%</td>
                    <td className="py-2 text-right">{d.avg_late_minutes || 0}</td>
                  </tr>
                ))}
                {(!driverPerf || driverPerf.length === 0) && (
                  <tr><td colSpan={4} className="py-4 text-center text-gray-400">No data yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Vehicle Status */}
      {vehicleStatus && vehicleStatus.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Vehicle Fleet Status</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {vehicleStatus.map((v, i) => (
              <div key={v.status} className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold" style={{ color: COLORS[i % COLORS.length] }}>{v.count}</p>
                <p className="text-xs text-gray-500 capitalize">{v.status.replace(/_/g, ' ')}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
