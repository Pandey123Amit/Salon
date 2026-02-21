// ── Salon ────────────────────────────────────────
export interface WorkingHour {
  day: string
  isOpen: boolean
  openTime: string
  closeTime: string
}

export interface SalonAddress {
  street?: string
  city?: string
  state?: string
  pincode?: string
}

export interface WhatsAppConfig {
  phoneNumberId?: string
  isConnected: boolean
  connectedAt?: string
}

export interface Salon {
  _id: string
  name: string
  email: string
  phone: string
  isPhoneVerified: boolean
  address: SalonAddress
  gstNumber?: string
  description?: string
  gender: 'male' | 'female' | 'unisex'
  workingHours: WorkingHour[]
  slotDuration: number
  bufferTime: number
  holidays: string[]
  isActive: boolean
  whatsapp: WhatsAppConfig
  createdAt: string
  updatedAt: string
}

// ── Service ──────────────────────────────────────
export type ServiceCategory =
  | 'Hair' | 'Skin' | 'Nails' | 'Makeup'
  | 'Spa' | 'Beard' | 'Bridal' | 'Other'

export interface Service {
  _id: string
  salonId: string
  name: string
  category: ServiceCategory
  duration: number
  price: number
  description?: string
  gender: 'male' | 'female' | 'unisex'
  isActive: boolean
  createdAt: string
  updatedAt: string
}

// ── Staff ────────────────────────────────────────
export interface StaffWorkingHour {
  day: string
  isAvailable: boolean
  startTime: string
  endTime: string
}

export interface Staff {
  _id: string
  salonId: string
  name: string
  phone?: string
  role: string
  services: string[] | Service[]
  workingHours: StaffWorkingHour[]
  isActive: boolean
  createdAt: string
  updatedAt: string
}

// ── Customer ─────────────────────────────────────
export interface Customer {
  _id: string
  salonId: string
  name?: string
  phone: string
  email?: string
  gender?: 'male' | 'female' | 'other'
  notes?: string
  totalVisits: number
  lastVisit?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

// ── Appointment ──────────────────────────────────
export type AppointmentStatus =
  | 'pending' | 'confirmed' | 'in-progress'
  | 'completed' | 'cancelled' | 'no-show'

export type BookingChannel = 'whatsapp' | 'dashboard' | 'walkin'

export interface Appointment {
  _id: string
  salonId: string
  customerId: Customer | { _id: string; name?: string; phone: string }
  serviceId: Service | { _id: string; name: string; category: string; duration: number; price: number }
  staffId?: Staff | { _id: string; name: string } | null
  date: string
  startTime: string
  endTime: string
  duration: number
  price: number
  status: AppointmentStatus
  notes?: string
  cancelReason?: string
  bookedVia: BookingChannel
  createdAt: string
  updatedAt: string
}

export interface TimeSlot {
  startTime: string
  endTime: string
  staffId: string
  staffName: string
}

// ── Analytics ────────────────────────────────────
export interface DashboardStats {
  todayAppointments: number
  appointmentsByStatus: Record<string, number>
  todayRevenue: number
  monthRevenue: number
  totalCustomers: number
  totalStaff: number
}

export interface RevenueDataPoint {
  date: string
  revenue: number
  count: number
}

export interface ServiceAnalytics {
  serviceId: string
  name: string
  category: string
  count: number
  revenue: number
}

export interface StaffAnalytics {
  staffId: string
  name: string
  appointments: number
  revenue: number
}

export interface BookingDataPoint {
  date: string
  whatsapp: number
  dashboard: number
  walkin: number
}

export interface CustomerGrowthPoint {
  date: string
  count: number
}

// ── Auth ─────────────────────────────────────────
export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterData {
  name: string
  email: string
  password: string
  phone: string
}

export interface AuthResponse {
  token: string
  salon: Salon
}

// ── API ──────────────────────────────────────────
export interface ApiResponse<T> {
  success: boolean
  message: string
  data: T
}
