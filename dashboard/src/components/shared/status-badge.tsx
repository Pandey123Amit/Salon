import { Badge } from '@/components/ui/badge'
import type { AppointmentStatus } from '@/types'

const statusConfig: Record<AppointmentStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending: { label: 'Pending', variant: 'outline' },
  confirmed: { label: 'Confirmed', variant: 'default' },
  'in-progress': { label: 'In Progress', variant: 'secondary' },
  completed: { label: 'Completed', variant: 'default' },
  cancelled: { label: 'Cancelled', variant: 'destructive' },
  'no-show': { label: 'No Show', variant: 'destructive' },
}

interface StatusBadgeProps {
  status: AppointmentStatus
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status] || { label: status, variant: 'outline' as const }
  return <Badge variant={config.variant}>{config.label}</Badge>
}
