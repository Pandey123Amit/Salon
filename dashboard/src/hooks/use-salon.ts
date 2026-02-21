import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import * as salonApi from '@/api/salon.api'
import type { Salon } from '@/types'
import { toast } from 'sonner'

export function useSalon() {
  return useQuery({
    queryKey: queryKeys.salon,
    queryFn: salonApi.fetchSalon,
    select: (data) => data.salon,
  })
}

export function useUpdateProfile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<Salon>) => salonApi.updateSalonProfile(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.salon })
      qc.invalidateQueries({ queryKey: queryKeys.me })
      toast.success('Profile updated')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useUpdateWorkingHours() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { workingHours: Salon['workingHours'] }) =>
      salonApi.updateWorkingHours(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.salon })
      toast.success('Working hours updated')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useUpdateSlotSettings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { slotDuration: number; bufferTime: number }) =>
      salonApi.updateSlotSettings(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.salon })
      toast.success('Slot settings updated')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}
