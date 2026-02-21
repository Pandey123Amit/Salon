import { useState, useMemo } from 'react'
import { PageHeader } from '@/components/layout/page-header'
import { StatusBadge } from '@/components/shared/status-badge'
import { EmptyState } from '@/components/shared/empty-state'
import { AppointmentFormDialog } from './appointment-form-dialog'
import { useAppointments, useUpdateAppointment } from '@/hooks/use-appointments'
import { useMobile } from '@/hooks/use-mobile'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Plus, Calendar as CalendarIcon } from 'lucide-react'
import { format } from 'date-fns'
import type { AppointmentStatus } from '@/types'

const STATUSES: AppointmentStatus[] = ['pending', 'confirmed', 'in-progress', 'completed', 'cancelled', 'no-show']
const TRANSITIONS: Record<string, string[]> = {
  pending: ['confirmed', 'cancelled', 'no-show'],
  confirmed: ['in-progress', 'cancelled', 'no-show'],
  'in-progress': ['completed', 'cancelled'],
}

export default function AppointmentsPage() {
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [formOpen, setFormOpen] = useState(false)

  const params = useMemo(() => {
    const p: Record<string, string> = {}
    if (date) p.date = date
    if (statusFilter && statusFilter !== 'all') p.status = statusFilter
    return p
  }, [date, statusFilter])

  const { data: appointments, isLoading } = useAppointments(params)
  const updateMutation = useUpdateAppointment()
  const isMobile = useMobile()

  function handleStatusChange(id: string, status: string) {
    updateMutation.mutate({ id, status })
  }

  return (
    <div>
      <PageHeader title="Appointments" description="Manage bookings">
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Appointment
        </Button>
      </PageHeader>

      <Tabs defaultValue="list">
        <TabsList className="mb-4">
          <TabsTrigger value="list">List</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
        </TabsList>

        <div className="flex flex-wrap gap-3 mb-4">
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-auto"
          />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <TabsContent value="list">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : !appointments?.length ? (
            <EmptyState
              icon={CalendarIcon}
              title="No appointments"
              description="No appointments found for this date"
            />
          ) : isMobile ? (
            <div className="space-y-3">
              {appointments.map((appt) => (
                <Card key={appt._id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-medium">
                          {'name' in appt.customerId
                            ? appt.customerId.name || appt.customerId.phone
                            : 'Customer'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {appt.startTime} - {appt.endTime}
                        </p>
                      </div>
                      <StatusBadge status={appt.status} />
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Badge variant="outline">
                        {'name' in appt.serviceId ? appt.serviceId.name : 'Service'}
                      </Badge>
                      <span className="text-muted-foreground">₹{appt.price}</span>
                      {appt.staffId && 'name' in appt.staffId && (
                        <span className="text-muted-foreground">{appt.staffId.name}</span>
                      )}
                    </div>
                    {TRANSITIONS[appt.status]?.length > 0 && (
                      <div className="flex gap-2 mt-3">
                        {TRANSITIONS[appt.status].map((next) => (
                          <Button
                            key={next}
                            size="sm"
                            variant={next === 'cancelled' || next === 'no-show' ? 'destructive' : 'outline'}
                            onClick={() => handleStatusChange(appt._id, next)}
                            disabled={updateMutation.isPending}
                            className="capitalize text-xs"
                          >
                            {next}
                          </Button>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead>Staff</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {appointments.map((appt) => (
                    <TableRow key={appt._id}>
                      <TableCell className="whitespace-nowrap">
                        {appt.startTime} - {appt.endTime}
                      </TableCell>
                      <TableCell>
                        {'name' in appt.customerId
                          ? appt.customerId.name || appt.customerId.phone
                          : 'Customer'}
                      </TableCell>
                      <TableCell>
                        {'name' in appt.serviceId ? appt.serviceId.name : 'Service'}
                      </TableCell>
                      <TableCell>
                        {appt.staffId && 'name' in appt.staffId ? appt.staffId.name : '-'}
                      </TableCell>
                      <TableCell>₹{appt.price}</TableCell>
                      <TableCell>
                        <StatusBadge status={appt.status} />
                      </TableCell>
                      <TableCell>
                        {TRANSITIONS[appt.status]?.length > 0 && (
                          <Select onValueChange={(v) => handleStatusChange(appt._id, v)}>
                            <SelectTrigger className="w-32 h-8">
                              <SelectValue placeholder="Change..." />
                            </SelectTrigger>
                            <SelectContent>
                              {TRANSITIONS[appt.status].map((next) => (
                                <SelectItem key={next} value={next} className="capitalize">
                                  {next}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="calendar">
          {/* Simple timeline view */}
          <div className="space-y-1">
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : !appointments?.length ? (
              <EmptyState icon={CalendarIcon} title="No appointments" description="Nothing scheduled" />
            ) : (
              appointments.map((appt) => (
                <div
                  key={appt._id}
                  className="flex items-center gap-4 p-3 rounded-md border hover:bg-muted/50"
                >
                  <div className="text-sm font-mono w-24 shrink-0">
                    {appt.startTime} - {appt.endTime}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">
                      {'name' in appt.customerId
                        ? appt.customerId.name || appt.customerId.phone
                        : 'Customer'}
                    </p>
                    <p className="text-sm text-muted-foreground truncate">
                      {'name' in appt.serviceId ? appt.serviceId.name : 'Service'}
                      {appt.staffId && 'name' in appt.staffId && ` · ${appt.staffId.name}`}
                    </p>
                  </div>
                  <StatusBadge status={appt.status} />
                </div>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      <AppointmentFormDialog open={formOpen} onOpenChange={setFormOpen} />
    </div>
  )
}
