import api from '@/lib/axios'
import type { Staff } from '@/types'

export function fetchStaff() {
  return api.get('/staff') as Promise<{ staff: Staff[] }>
}

export function createStaff(data: Partial<Staff>) {
  return api.post('/staff', data) as Promise<{ staff: Staff }>
}

export function updateStaff(id: string, data: Partial<Staff>) {
  return api.put(`/staff/${id}`, data) as Promise<{ staff: Staff }>
}

export function deleteStaff(id: string) {
  return api.delete(`/staff/${id}`) as Promise<void>
}
