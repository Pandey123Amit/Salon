import api from '@/lib/axios'
import type { Salon } from '@/types'

export function fetchSalon() {
  return api.get('/salon/profile') as Promise<{ salon: Salon }>
}

export function updateSalonProfile(data: Partial<Salon>) {
  return api.put('/salon/profile', data) as Promise<{ salon: Salon }>
}

export function updateWorkingHours(data: { workingHours: Salon['workingHours'] }) {
  return api.put('/salon/working-hours', data) as Promise<{ salon: Salon }>
}

export function updateSlotSettings(data: { slotDuration: number; bufferTime: number }) {
  return api.put('/salon/settings', data) as Promise<{ salon: Salon }>
}
