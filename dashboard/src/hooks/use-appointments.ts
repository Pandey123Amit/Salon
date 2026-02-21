import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import * as api from '@/api/appointments.api'
import { toast } from 'sonner'

export function useAppointments(params?: Record<string, string>) {
  return useQuery({
    queryKey: queryKeys.appointments.list(params),
    queryFn: () => api.fetchAppointments(params),
    select: (data) => data.appointments,
  })
}

export function useTodayAppointments() {
  return useQuery({
    queryKey: queryKeys.appointments.today,
    queryFn: api.fetchTodayAppointments,
    select: (data) => data.appointments,
  })
}

export function useSlots(params: { date: string; serviceId: string; staffId?: string }) {
  return useQuery({
    queryKey: queryKeys.appointments.slots(params as Record<string, string>),
    queryFn: () => api.fetchSlots(params),
    enabled: !!params.date && !!params.serviceId,
  })
}

export function useCreateAppointment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.createAppointment,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.appointments.all })
      qc.invalidateQueries({ queryKey: queryKeys.analytics.dashboard })
      toast.success('Appointment created')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useUpdateAppointment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; status: string; cancelReason?: string; notes?: string }) =>
      api.updateAppointment(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.appointments.all })
      qc.invalidateQueries({ queryKey: queryKeys.analytics.dashboard })
      qc.invalidateQueries({ queryKey: queryKeys.customers.all })
      toast.success('Appointment updated')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}
