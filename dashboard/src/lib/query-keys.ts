export const queryKeys = {
  // Auth
  me: ['me'] as const,

  // Services
  services: {
    all: ['services'] as const,
    list: (params?: Record<string, string>) => ['services', 'list', params] as const,
  },

  // Staff
  staff: {
    all: ['staff'] as const,
    list: (params?: Record<string, string>) => ['staff', 'list', params] as const,
  },

  // Appointments
  appointments: {
    all: ['appointments'] as const,
    list: (params?: Record<string, string>) => ['appointments', 'list', params] as const,
    today: ['appointments', 'today'] as const,
    slots: (params: Record<string, string>) => ['appointments', 'slots', params] as const,
  },

  // Customers
  customers: {
    all: ['customers'] as const,
    list: (params?: Record<string, string>) => ['customers', 'list', params] as const,
    detail: (id: string) => ['customers', id] as const,
    appointments: (id: string) => ['customers', id, 'appointments'] as const,
  },

  // Analytics
  analytics: {
    dashboard: ['analytics', 'dashboard'] as const,
    revenue: (params?: Record<string, string>) => ['analytics', 'revenue', params] as const,
    services: (params?: Record<string, string>) => ['analytics', 'services', params] as const,
    staff: (params?: Record<string, string>) => ['analytics', 'staff', params] as const,
    bookings: (params?: Record<string, string>) => ['analytics', 'bookings', params] as const,
    customers: (params?: Record<string, string>) => ['analytics', 'customers', params] as const,
  },

  // Payments
  payments: {
    all: ['payments'] as const,
    list: (params?: Record<string, string>) => ['payments', 'list', params] as const,
    byAppointment: (id: string) => ['payments', 'appointment', id] as const,
  },

  // Salon settings
  salon: ['salon'] as const,
}
