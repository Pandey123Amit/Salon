import api from '@/lib/axios'
import type {
  DashboardStats,
  RevenueDataPoint,
  ServiceAnalytics,
  StaffAnalytics,
  BookingDataPoint,
  CustomerGrowthPoint,
} from '@/types'

export function fetchDashboardStats() {
  return api.get('/analytics/dashboard') as Promise<DashboardStats>
}

export function fetchRevenueAnalytics(params?: Record<string, string>) {
  return api.get('/analytics/revenue', { params }) as Promise<{ revenue: RevenueDataPoint[] }>
}

export function fetchServiceAnalytics(params?: Record<string, string>) {
  return api.get('/analytics/services', { params }) as Promise<{ services: ServiceAnalytics[] }>
}

export function fetchStaffAnalytics(params?: Record<string, string>) {
  return api.get('/analytics/staff', { params }) as Promise<{ staff: StaffAnalytics[] }>
}

export function fetchBookingAnalytics(params?: Record<string, string>) {
  return api.get('/analytics/bookings', { params }) as Promise<{ bookings: BookingDataPoint[] }>
}

export function fetchCustomerAnalytics(params?: Record<string, string>) {
  return api.get('/analytics/customers', { params }) as Promise<{ customers: CustomerGrowthPoint[] }>
}
