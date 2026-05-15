import { useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from 'recharts'

const monthlyData = [
  { month: 'Jan', trips: 45, maintenance: 12, revenue: 12000 },
  { month: 'Feb', trips: 52, maintenance: 8, revenue: 15000 },
  { month: 'Mar', trips: 48, maintenance: 15, revenue: 13500 },
  { month: 'Apr', trips: 70, maintenance: 10, revenue: 18500 },
  { month: 'May', trips: 63, maintenance: 14, revenue: 17200 },
  { month: 'Jun', trips: 58, maintenance: 9, revenue: 16000 },
]

const vehicleUtilization = [
  { name: 'Bus #1', utilization: 85 },
  { name: 'Bus #2', utilization: 72 },
  { name: 'Van #1', utilization: 90 },
  { name: 'Van #2', utilization: 45 },
  { name: 'Truck #1', utilization: 68 },
]

export function ReportsPage() {
  const [period, setPeriod] = useState('6months')

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-sm text-gray-500 mt-1">View operational metrics and performance data.</p>
        </div>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="30days">Last 30 Days</option>
          <option value="3months">Last 3 Months</option>
          <option value="6months">Last 6 Months</option>
          <option value="12months">Last 12 Months</option>
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Monthly Trips & Maintenance</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="trips" fill="#3B82F6" name="Trips" radius={[4, 4, 0, 0]} />
                <Bar dataKey="maintenance" fill="#F59E0B" name="Maintenance" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Revenue Trend</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="revenue" stroke="#10B981" strokeWidth={2} name="Revenue" dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Vehicle Utilization Rate (%)</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={vehicleUtilization} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" tick={{ fontSize: 12 }} domain={[0, 100]} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 12 }} width={100} />
                <Tooltip />
                <Bar dataKey="utilization" fill="#8B5CF6" name="Utilization %" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Summary Metrics</h3>
          <div className="space-y-4">
            {[
              { label: 'Total Trips (Period)', value: '336', change: '+12%', positive: true },
              { label: 'Avg. Trip Duration', value: '2.4 hrs', change: '-5%', positive: true },
              { label: 'Fleet Availability', value: '94%', change: '+3%', positive: true },
              { label: 'On-Time Performance', value: '87%', change: '-2%', positive: false },
              { label: 'Maintenance Cost', value: '$8,450', change: '+8%', positive: false },
              { label: 'Avg. Revenue/Trip', value: '$285', change: '+7%', positive: true },
            ].map((metric) => (
              <div key={metric.label} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <span className="text-sm text-gray-600">{metric.label}</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-900">{metric.value}</span>
                  <span className={`text-xs font-medium ${metric.positive ? 'text-green-600' : 'text-red-600'}`}>{metric.change}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
