import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Car, Eye, EyeOff, AlertCircle, User, Mail, Phone, Lock, Sprout, Wrench, Navigation } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

const roleDashboard: Record<string, string> = {
  driver: '/driver/dashboard',
  mechanic: '/mechanic/dashboard',
  farm_client: '/client/dashboard',
  admin: '/admin/dashboard',
}

const roleIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  driver: Navigation,
  mechanic: Wrench,
  farm_client: Sprout,
}

const roleColors: Record<string, string> = {
  driver: 'from-blue-500 to-blue-600',
  mechanic: 'from-gray-500 to-gray-600',
  farm_client: 'from-emerald-500 to-emerald-600',
}

export function RegisterPage() {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [role, setRole] = useState('farm_client')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const { register } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      setLoading(false)
      return
    }

    const result = await register({
      first_name: firstName, last_name: lastName, email, phone,
      username: username || (email.split('@')[0] || ''),
      password, role,
    })

    if (result.success) {
      navigate(roleDashboard[role] || '/login', { replace: true })
      return
    }
    setError(result.error || 'Registration failed')
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex">
      {/* Left - Brand Side */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="hidden lg:flex lg:w-[380px] xl:w-[420px] relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-purple-700 to-indigo-900" />
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-64 h-64 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-10 w-80 h-80 bg-purple-300 rounded-full blur-3xl" />
        </div>
        <div className="relative z-10 flex flex-col justify-center px-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-6 shadow-lg">
              <Car className="w-7 h-7 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-white mb-3">Join FleetMgmt</h2>
            <p className="text-base text-indigo-200 leading-relaxed">
              Create your account and start managing transport operations efficiently.
            </p>
            <div className="mt-8 space-y-4">
              {[
                { icon: Navigation, text: 'Track trips in real-time' },
                { icon: Wrench, text: 'Manage vehicle maintenance' },
                { icon: Sprout, text: 'Coordinate farm logistics' },
              ].map((item, i) => {
                const Icon = item.icon
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + i * 0.1 }}
                    className="flex items-center gap-3"
                  >
                    <div className="p-1.5 rounded-lg bg-white/10">
                      <Icon className="w-4 h-4 text-indigo-200" />
                    </div>
                    <span className="text-sm text-indigo-200">{item.text}</span>
                  </motion.div>
                )
              })}
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* Right - Registration Form */}
      <div className="flex-1 flex items-start justify-center p-4 sm:p-8 lg:p-10 bg-background overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-lg py-4"
        >
          <div className="lg:hidden flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg">
              <Car className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold">Fleet<span className="text-indigo-600">Mgmt</span></span>
          </div>

          <div className="mb-6">
            <h2 className="text-2xl font-bold tracking-tight">Create Account</h2>
            <p className="text-sm text-muted-foreground mt-1">Join the Fleet Management System</p>
          </div>

          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex items-center gap-2.5 p-3.5 rounded-xl mb-5 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-400 text-sm"
              >
                <AlertCircle className="w-5 h-5 shrink-0" />
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Role Selection */}
            <div>
              <label className="block text-sm font-medium mb-2">Account Type</label>
              <div className="grid grid-cols-3 gap-3">
                {(['driver', 'mechanic', 'farm_client'] as const).map((r) => {
                  const Icon = roleIcons[r]!
                  const isActive = role === r
                  return (
                    <motion.button
                      key={r}
                      type="button"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setRole(r)}
                      className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 text-sm font-medium transition-all ${
                        isActive
                          ? 'border-primary bg-primary/5 text-primary shadow-sm'
                          : 'border-border text-muted-foreground hover:border-primary/30 hover:text-foreground'
                      }`}
                    >
                      <div className={`p-2 rounded-lg ${isActive ? `bg-gradient-to-br ${roleColors[r]} text-white` : 'bg-muted text-muted-foreground'}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      {r === 'farm_client' ? 'Client' : r.charAt(0).toUpperCase() + r.slice(1)}
                    </motion.button>
                  )
                })}
              </div>
            </div>

            {/* Name Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">First Name</label>
                <input type="text" required value={firstName} onChange={(e) => setFirstName(e.target.value)}
                  className="input-field" placeholder="John" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Last Name</label>
                <input type="text" required value={lastName} onChange={(e) => setLastName(e.target.value)}
                  className="input-field" placeholder="Doe" />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium mb-1.5">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                  className="input-field pl-10" placeholder="you@example.com" />
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium mb-1.5">Phone Number</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                  className="input-field pl-10" placeholder="+1 (555) 000-0000" />
              </div>
            </div>

            {/* Username */}
            <div>
              <label className="block text-sm font-medium mb-1.5">Username</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input type="text" value={username} onChange={(e) => setUsername(e.target.value)}
                  className="input-field pl-10" placeholder="Optional (auto-generated if empty)" />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input type={showPassword ? 'text' : 'password'} required value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field pl-10 pr-10" placeholder="Min. 6 characters" />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground hover:text-foreground">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Minimum 6 characters</p>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium mb-1.5">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input type={showPassword ? 'text' : 'password'} required value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="input-field pl-10" placeholder="Re-enter your password" />
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="btn-primary w-full py-2.5">
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Creating account...
                </span>
              ) : 'Create Account'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-primary hover:text-primary/80">Sign in</Link>
          </p>
        </motion.div>
      </div>
    </div>
  )
}
