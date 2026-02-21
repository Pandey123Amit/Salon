import api from '@/lib/axios'
import type { Appointment, TimeSlot } from '@/types'

export function fetchAppointments(params?: Record<string, string>) {
  return api.get('/appointments', { params }) as Promise<{ appointments: Appointment[] }>
}

export function fetchTodayAppointments() {
  return api.get('/appointments/today') as Promise<{ appointments: Appointment[] }>
}

export function createAppointment(data: {
  customerId: string
  serviceId: string
  staffId?: string
  date: string
  startTime: string
  notes?: string
  bookedVia?: string
}) {
  return api.post('/appointments', data) as Promise<{ appointment: Appointment }>
}

export function updateAppointment(id: string, data: { status: string; cancelReason?: string; notes?: string }) {
  return api.put(`/appointments/${id}`, data) as Promise<{ appointment: Appointment }>
}

export function fetchSlots(params: { date: string; serviceId: string; staffId?: string }) {
  return api.get('/appointments/slots', { params }) as Promise<{ slots: TimeSlot[]; date: string }>
}
