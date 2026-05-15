
export interface User {
  id: string
  username: string
  email: string
  first_name: string
  last_name: string
  phone: string
  avatar_url: string | null
  is_active: boolean
  is_verified: boolean
  role: string
  created_at: string
  last_login: string | null
  permissions: string[]
}

export interface LoginFormData {
  email: string
  password: string
  remember: boolean
}

export interface RegisterFormData {
  first_name: string
  last_name: string
  email: string
  phone: string
  username: string
  password: string
  confirmPassword?: string
  role: string
}

export interface ResetPasswordFormData {
  password: string
  confirmPassword: string
}

export interface ForgotPasswordFormData {
  email: string
}

export interface UpdateUserFormData {
  first_name?: string
  last_name?: string
  phone?: string
  avatar_url?: string
}

export interface AuthResponse {
  success: boolean
  data?: {
    user: User
    tokens: {
      accessToken: string
      refreshToken: string
    }
  }
  message?: string
  error?: string
}

export interface Vehicle {
  id: string
  license_plate: string
  make: string
  model: string
  year: number
  vehicle_type: string
  capacity: number
  status: string
  last_service_date: string
  next_service_date: string
  mileage: number
  vin: string
}

export interface Driver {
  id: string
  first_name: string
  last_name: string
  email: string
  phone: string
  license_number: string
  license_type: string
  license_expiry: string
  hire_date: string
  emergency_contact_name: string
  emergency_contact_phone: string
  is_available: boolean
}

export interface Mechanic {
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

export interface Trip {
  id: string
  farm_name: string
  vehicle_license_plate: string
  driver_name: string
  route_name: string
  pickup_location: string
  dropoff_location: string
  scheduled_departure: string
  scheduled_arrival: string
  status: string
  passenger_count: number
  notes: string
  client_id: string
  client_name: string
  driver_id: string
  created_at: string
  accepted_at: string | null
  completed_at: string | null
}

export interface MaintenanceTask {
  id: string
  vehicle_id: string
  mechanic_id: string
  task_type: string
  description: string
  scheduled_date: string
  start_date: string
  completion_date: string
  status: string
  parts_used: string
  labor_hours: number
  cost: number
}

export interface ColumnDef<T> {
  key: keyof T
  header: string
  minWidth?: number
}

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  pagination?: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}