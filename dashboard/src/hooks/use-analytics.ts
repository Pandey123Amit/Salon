import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import {
  fetchDashboardStats,
  fetchRevenueAnalytics,
  fetchServiceAnalytics,
  fetchStaffAnalytics,
  fetchBookingAnalytics,
  fetchCustomerAnalytics,
} from '@/api/analytics.api'

export function useDashboardStats() {
  return useQuery({
    queryKey: queryKeys.analytics.dashboard,
    queryFn: fetchDashboardStats,
  })
}

export function useRevenueAnalytics(params?: Record<string, string>) {
  return useQuery({
    queryKey: queryKeys.analytics.revenue(params),
    queryFn: () => fetchRevenueAnalytics(params),
  })
}

export function useServiceAnalytics(params?: Record<string, string>) {
  return useQuery({
    queryKey: queryKeys.analytics.services(params),
    queryFn: () => fetchServiceAnalytics(params),
  })
}

export function useStaffAnalytics(params?: Record<string, string>) {
  return useQuery({
    queryKey: queryKeys.analytics.staff(params),
    queryFn: () => fetchStaffAnalytics(params),
  })
}

export function useBookingAnalytics(params?: Record<string, string>) {
  return useQuery({
    queryKey: queryKeys.analytics.bookings(params),
    queryFn: () => fetchBookingAnalytics(params),
  })
}

export function useCustomerAnalytics(params?: Record<string, string>) {
  return useQuery({
    queryKey: queryKeys.analytics.customers(params),
    queryFn: () => fetchCustomerAnalytics(params),
  })
}
