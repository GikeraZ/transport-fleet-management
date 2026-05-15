import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { api } from '../utils/api'
import type { User } from '../types'

export function ProfilePage() {
  const { user, refreshUser } = useAuth()
  const [profile, setProfile] = useState<Partial<User>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      setProfile({
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        phone: user.phone || '',
        username: user.username,
        avatar_url: user.avatar_url,
      })
      if (user.avatar_url) setAvatarPreview(user.avatar_url)
    }
  }, [user])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)
    if (!profile.first_name?.trim() || !profile.last_name?.trim()) {
      setError('First name and last name are required')
      setLoading(false)
      return
    }
    try {
      const result = await api.put<{ success: boolean; data?: any; error?: string }>(`/users/${user?.id}`, profile)
      if (result.success) {
        setSuccess('Profile updated successfully')
        await refreshUser()
      } else {
        setError(result.error || 'Failed to update profile')
      }
    } catch { setError('Network error. Please try again.') }
    finally { setLoading(false) }
  }

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) { setError('File size must be less than 5MB'); return }
      const reader = new FileReader()
      reader.onload = (event) => setAvatarPreview(event.target?.result as string)
      reader.readAsDataURL(file)
      setProfile((prev) => ({ ...prev, avatar_url: URL.createObjectURL(file) }))
    }
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
        <p className="text-sm text-gray-500 mt-1">View and update your account information.</p>
      </div>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-8 bg-gradient-to-br from-blue-600 to-indigo-700">
          <div className="flex items-center gap-6">
            <div className="relative">
              <div className="h-20 w-20 rounded-full bg-white/20 backdrop-blur-sm border-2 border-white/30 flex items-center justify-center overflow-hidden">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Profile" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-3xl font-bold text-white">
                    {profile.first_name?.charAt(0)}{profile.last_name?.charAt(0)}
                  </span>
                )}
              </div>
              <label htmlFor="avatar-upload" className="absolute bottom-0 right-0 bg-white rounded-full p-1.5 shadow-lg cursor-pointer hover:bg-gray-50 transition-colors border border-gray-200" title="Change profile photo">
                <svg className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </label>
              <input id="avatar-upload" type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            </div>
            <div className="text-white">
              <h2 className="text-xl font-bold">{profile.first_name} {profile.last_name}</h2>
              <p className="text-blue-200 text-sm">{profile.email}</p>
              {user?.role && <span className="inline-block mt-2 px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-medium">{user.role}</span>}
            </div>
          </div>
        </div>
        <div className="px-6 py-6">
          {success && <div className="mb-4 bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-lg text-sm">{success}</div>}
          {error && <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">{error}</div>}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                <input type="text" value={profile.first_name || ''} onChange={(e) => setProfile((prev) => ({ ...prev, first_name: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                <input type="text" value={profile.last_name || ''} onChange={(e) => setProfile((prev) => ({ ...prev, last_name: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" required />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
              <input type="text" value={profile.username || ''} disabled readOnly className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-gray-50" />
              <p className="mt-1 text-xs text-gray-400">Username cannot be changed</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
              <input type="email" value={profile.email || ''} disabled readOnly className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-gray-50 text-gray-500" />
              <p className="mt-1 text-xs text-gray-400">Email cannot be changed for security reasons</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
              <input type="tel" value={profile.phone || ''} onChange={(e) => setProfile((prev) => ({ ...prev, phone: e.target.value }))}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="+1 (555) 000-0000" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Account Role</label>
              <div className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-gray-50"><span className="font-medium capitalize">{user?.role}</span></div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Account Status</label>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${user?.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {user?.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Member Since</label>
              <div className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-gray-50">
                {new Date(user?.created_at || '').toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 pt-4 border-t">
              <button type="button" onClick={() => { if (user) { setProfile({ first_name: user.first_name, last_name: user.last_name, email: user.email, phone: user.phone || '', username: user.username, avatar_url: user.avatar_url }); setError(''); setSuccess('') } }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">Reset</button>
              <button type="submit" disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 shadow-sm">
                {loading ? <span className="flex items-center gap-2"><svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Saving...</span> : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
      <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-5 border-b">
          <h3 className="text-base font-semibold text-gray-900">Change Password</h3>
          <p className="text-sm text-gray-500 mt-1">Update your account password.</p>
        </div>
        <div className="px-6 py-5">
          <Link to="/change-password" className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-500">Go to password change page →</Link>
        </div>
      </div>
    </div>
  )
}
