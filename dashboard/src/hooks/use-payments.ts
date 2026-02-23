import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import * as paymentsApi from '@/api/payments.api'
import { toast } from 'sonner'

export function usePayments(params?: Record<string, string>) {
  return useQuery({
    queryKey: queryKeys.payments.list(params),
    queryFn: () => paymentsApi.fetchPayments(params),
  })
}

export function useCreatePaymentLink() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (appointmentId: string) => paymentsApi.createPaymentLink(appointmentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.payments.all })
      qc.invalidateQueries({ queryKey: queryKeys.appointments.all })
      toast.success('Payment link created')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useRefundPayment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ paymentId, amount, reason }: { paymentId: string; amount?: number; reason?: string }) =>
      paymentsApi.refundPayment(paymentId, { amount, reason }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.payments.all })
      qc.invalidateQueries({ queryKey: queryKeys.appointments.all })
      toast.success('Refund initiated')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}
