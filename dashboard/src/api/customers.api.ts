import api from '@/lib/axios'
import type { Customer, Appointment } from '@/types'

export function fetchCustomers(params?: Record<string, string>) {
  return api.get('/customers', { params }) as Promise<{ customers: Customer[] }>
}

export function fetchCustomer(id: string) {
  return api.get(`/customers/${id}`) as Promise<{ customer: Customer }>
}

export function createCustomer(data: Partial<Customer>) {
  return api.post('/customers', data) as Promise<{ customer: Customer }>
}

export function updateCustomer(id: string, data: Partial<Customer>) {
  return api.put(`/customers/${id}`, data) as Promise<{ customer: Customer }>
}

export function fetchCustomerAppointments(id: string) {
  return api.get(`/customers/${id}/appointments`) as Promise<{ appointments: Appointment[] }>
}
