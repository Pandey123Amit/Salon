import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import * as servicesApi from '@/api/services.api'
import type { Service } from '@/types'
import { toast } from 'sonner'

export function useServices() {
  return useQuery({
    queryKey: queryKeys.services.all,
    queryFn: servicesApi.fetchServices,
    select: (data) => data.services,
  })
}

export function useCreateService() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<Service>) => servicesApi.createService(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.services.all })
      qc.invalidateQueries({ queryKey: queryKeys.analytics.dashboard })
      toast.success('Service created')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useUpdateService() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Service> }) =>
      servicesApi.updateService(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.services.all })
      toast.success('Service updated')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useDeleteService() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => servicesApi.deleteService(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.services.all })
      qc.invalidateQueries({ queryKey: queryKeys.analytics.dashboard })
      toast.success('Service deleted')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}
