import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import * as api from '@/api/customers.api'
import type { Customer } from '@/types'
import { toast } from 'sonner'

export function useCustomers(params?: Record<string, string>) {
  return useQuery({
    queryKey: queryKeys.customers.list(params),
    queryFn: () => api.fetchCustomers(params),
    select: (data) => data.customers,
  })
}

export function useCustomer(id: string) {
  return useQuery({
    queryKey: queryKeys.customers.detail(id),
    queryFn: () => api.fetchCustomer(id),
    select: (data) => data.customer,
    enabled: !!id,
  })
}

export function useCustomerAppointments(id: string) {
  return useQuery({
    queryKey: queryKeys.customers.appointments(id),
    queryFn: () => api.fetchCustomerAppointments(id),
    select: (data) => data.appointments,
    enabled: !!id,
  })
}

export function useCreateCustomer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<Customer>) => api.createCustomer(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.customers.all })
      qc.invalidateQueries({ queryKey: queryKeys.analytics.dashboard })
      toast.success('Customer created')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useUpdateCustomer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Customer> }) =>
      api.updateCustomer(id, data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.customers.detail(variables.id) })
      qc.invalidateQueries({ queryKey: queryKeys.customers.all })
      toast.success('Customer updated')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}
