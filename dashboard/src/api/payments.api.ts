import api from '@/lib/axios'
import type { Payment } from '@/types'

export function fetchPayments(params?: Record<string, string>) {
  return api.get('/payments', { params }) as Promise<{
    payments: Payment[]
    pagination: { page: number; limit: number; total: number }
  }>
}

export function createPaymentLink(appointmentId: string) {
  return api.post('/payments/link', { appointmentId }) as Promise<{
    paymentId: string
    paymentLinkId: string
    paymentLinkUrl: string
    amount: number
  }>
}

export function createOrder(appointmentId: string) {
  return api.post('/payments/order', { appointmentId }) as Promise<{
    paymentId: string
    orderId: string
    amount: number
    currency: string
    keyId: string
  }>
}

export function verifyPayment(data: { orderId: string; paymentId: string; signature: string }) {
  return api.post('/payments/verify', data) as Promise<{ verified: boolean }>
}

export function getPaymentByAppointment(appointmentId: string) {
  return api.get(`/payments/appointment/${appointmentId}`) as Promise<{ payment: Payment }>
}

export function refundPayment(paymentId: string, data?: { amount?: number; reason?: string }) {
  return api.post(`/payments/${paymentId}/refund`, data) as Promise<{
    refundId: string
    status: string
  }>
}
