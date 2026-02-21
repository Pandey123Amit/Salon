import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import * as staffApi from '@/api/staff.api'
import type { Staff } from '@/types'
import { toast } from 'sonner'

export function useStaff() {
  return useQuery({
    queryKey: queryKeys.staff.all,
    queryFn: staffApi.fetchStaff,
    select: (data) => data.staff,
  })
}

export function useCreateStaff() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<Staff>) => staffApi.createStaff(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.staff.all })
      qc.invalidateQueries({ queryKey: queryKeys.analytics.dashboard })
      toast.success('Staff member added')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useUpdateStaff() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Staff> }) =>
      staffApi.updateStaff(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.staff.all })
      toast.success('Staff member updated')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useDeleteStaff() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => staffApi.deleteStaff(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.staff.all })
      qc.invalidateQueries({ queryKey: queryKeys.analytics.dashboard })
      toast.success('Staff member removed')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}
