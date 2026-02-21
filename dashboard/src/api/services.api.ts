import api from '@/lib/axios'
import type { Service } from '@/types'

export function fetchServices() {
  return api.get('/services') as Promise<{ services: Service[] }>
}

export function createService(data: Partial<Service>) {
  return api.post('/services', data) as Promise<{ service: Service }>
}

export function updateService(id: string, data: Partial<Service>) {
  return api.put(`/services/${id}`, data) as Promise<{ service: Service }>
}

export function deleteService(id: string) {
  return api.delete(`/services/${id}`) as Promise<void>
}
