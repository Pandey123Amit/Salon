import { useParams, useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/layout/page-header'
import { StatusBadge } from '@/components/shared/status-badge'
import { useCustomer, useCustomerAppointments } from '@/hooks/use-customers'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Phone, Mail, User } from 'lucide-react'
import { format } from 'date-fns'
import type { AppointmentStatus } from '@/types'

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: customer, isLoading } = useCustomer(id!)
  const { data: appointments, isLoading: apptsLoading } = useCustomerAppointments(id!)

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!customer) {
    return <p className="text-muted-foreground">Customer not found</p>
  }

  return (
    <div>
      <div className="mb-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/customers')}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
      </div>

      <PageHeader title={customer.name || 'Unnamed Customer'} />

      <div className="grid gap-4 lg:grid-cols-3 mb-6">
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span>{customer.phone}</span>
            </div>
            {customer.email && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>{customer.email}</span>
              </div>
            )}
            {customer.gender && (
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="capitalize">{customer.gender}</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total Visits</p>
            <p className="text-2xl font-bold">{customer.totalVisits}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Last Visit</p>
            <p className="text-2xl font-bold">
              {customer.lastVisit
                ? format(new Date(customer.lastVisit), 'dd MMM yyyy')
                : 'Never'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Appointment History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Appointment History</CardTitle>
        </CardHeader>
        <CardContent>
          {apptsLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : !appointments?.length ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No appointment history
            </p>
          ) : (
            <div className="space-y-2">
              {appointments.map((appt) => (
                <div
                  key={appt._id}
                  className="flex items-center justify-between p-3 rounded-md border text-sm"
                >
                  <div>
                    <p className="font-medium">
                      {'name' in appt.serviceId ? appt.serviceId.name : 'Service'}
                    </p>
                    <p className="text-muted-foreground">
                      {format(new Date(appt.date), 'dd MMM yyyy')} at {appt.startTime}
                      {appt.staffId && 'name' in appt.staffId && ` · ${appt.staffId.name}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">₹{appt.price}</Badge>
                    <StatusBadge status={appt.status as AppointmentStatus} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
