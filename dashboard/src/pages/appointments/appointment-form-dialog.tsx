import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Loader2 } from 'lucide-react'
import { useServices } from '@/hooks/use-services'
import { useStaff } from '@/hooks/use-staff'
import { useCustomers } from '@/hooks/use-customers'
import { useSlots, useCreateAppointment } from '@/hooks/use-appointments'
import { format } from 'date-fns'

interface AppointmentFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AppointmentFormDialog({ open, onOpenChange }: AppointmentFormDialogProps) {
  const { data: services } = useServices()
  const { data: staff } = useStaff()
  const { data: customers } = useCustomers()
  const createMutation = useCreateAppointment()

  const [customerId, setCustomerId] = useState('')
  const [serviceId, setServiceId] = useState('')
  const [staffId, setStaffId] = useState('')
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [startTime, setStartTime] = useState('')
  const [notes, setNotes] = useState('')

  const { data: slotsData, isLoading: slotsLoading } = useSlots({
    date,
    serviceId,
    staffId: staffId || undefined,
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    createMutation.mutate(
      {
        customerId,
        serviceId,
        staffId: staffId || undefined,
        date,
        startTime,
        notes: notes || undefined,
        bookedVia: 'dashboard',
      },
      {
        onSuccess: () => {
          onOpenChange(false)
          resetForm()
        },
      }
    )
  }

  function resetForm() {
    setCustomerId('')
    setServiceId('')
    setStaffId('')
    setDate(format(new Date(), 'yyyy-MM-dd'))
    setStartTime('')
    setNotes('')
  }

  // Deduplicate slots by startTime
  const uniqueSlots = slotsData?.slots
    ? Array.from(new Map(slotsData.slots.map((s) => [s.startTime, s])).values())
    : []

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) resetForm() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Appointment</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Customer */}
          <div className="space-y-2">
            <Label>Customer</Label>
            <Select value={customerId} onValueChange={setCustomerId}>
              <SelectTrigger>
                <SelectValue placeholder="Select customer..." />
              </SelectTrigger>
              <SelectContent>
                {customers?.map((c) => (
                  <SelectItem key={c._id} value={c._id}>
                    {c.name || c.phone}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Service */}
          <div className="space-y-2">
            <Label>Service</Label>
            <Select value={serviceId} onValueChange={(v) => { setServiceId(v); setStartTime('') }}>
              <SelectTrigger>
                <SelectValue placeholder="Select service..." />
              </SelectTrigger>
              <SelectContent>
                {services?.map((s) => (
                  <SelectItem key={s._id} value={s._id}>
                    {s.name} — {s.duration}min — ₹{s.price}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Staff (optional) */}
          <div className="space-y-2">
            <Label>Staff (optional)</Label>
            <Select value={staffId} onValueChange={(v) => { setStaffId(v); setStartTime('') }}>
              <SelectTrigger>
                <SelectValue placeholder="Auto-assign" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Auto-assign</SelectItem>
                {staff?.map((s) => (
                  <SelectItem key={s._id} value={s._id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date */}
          <div className="space-y-2">
            <Label>Date</Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => { setDate(e.target.value); setStartTime('') }}
              min={format(new Date(), 'yyyy-MM-dd')}
            />
          </div>

          {/* Time Slot */}
          {serviceId && date && (
            <div className="space-y-2">
              <Label>Time Slot</Label>
              {slotsLoading ? (
                <div className="grid grid-cols-4 gap-2">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <Skeleton key={i} className="h-9" />
                  ))}
                </div>
              ) : !uniqueSlots.length ? (
                <p className="text-sm text-muted-foreground py-2">No available slots</p>
              ) : (
                <div className="grid grid-cols-4 gap-2 max-h-40 overflow-y-auto">
                  {uniqueSlots.map((slot) => (
                    <Button
                      key={slot.startTime}
                      type="button"
                      variant={startTime === slot.startTime ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setStartTime(slot.startTime)}
                    >
                      {slot.startTime}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notes</Label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes..."
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!customerId || !serviceId || !startTime || createMutation.isPending}
            >
              {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Book Appointment
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
