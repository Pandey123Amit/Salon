import { useEffect } from 'react'
import { useForm, useFieldArray, type Resolver } from 'react-hook-form'
import { z } from 'zod/v4'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Loader2 } from 'lucide-react'
import type { Staff, Service } from '@/types'

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const

const workingHourSchema = z.object({
  day: z.string(),
  isAvailable: z.boolean(),
  startTime: z.string(),
  endTime: z.string(),
})

const staffSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  phone: z.string().optional(),
  role: z.string().optional(),
  services: z.array(z.string()),
  workingHours: z.array(workingHourSchema),
})

type StaffFormData = z.infer<typeof staffSchema>

interface StaffFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  staff?: Staff | null
  allServices: Service[]
  onSubmit: (data: StaffFormData) => void
  loading?: boolean
}

const defaultWorkingHours = DAYS.map((day) => ({
  day,
  isAvailable: day !== 'sunday',
  startTime: '09:00',
  endTime: '21:00',
}))

export function StaffFormDialog({
  open,
  onOpenChange,
  staff,
  allServices,
  onSubmit,
  loading,
}: StaffFormDialogProps) {
  const form = useForm<StaffFormData>({
    resolver: zodResolver(staffSchema) as Resolver<StaffFormData>,
    defaultValues: {
      name: '',
      phone: '',
      role: 'Stylist',
      services: [],
      workingHours: defaultWorkingHours,
    },
  })

  const { fields } = useFieldArray({
    control: form.control,
    name: 'workingHours',
  })

  useEffect(() => {
    if (staff) {
      form.reset({
        name: staff.name,
        phone: staff.phone || '',
        role: staff.role,
        services: (staff.services as (string | Service)[]).map((s) =>
          typeof s === 'string' ? s : s._id
        ),
        workingHours: staff.workingHours.length
          ? staff.workingHours
          : defaultWorkingHours,
      })
    } else {
      form.reset({
        name: '',
        phone: '',
        role: 'Stylist',
        services: [],
        workingHours: defaultWorkingHours,
      })
    }
  }, [staff, form])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{staff ? 'Edit Staff' : 'Add Staff'}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh] pr-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role</FormLabel>
                      <FormControl>
                        <Input placeholder="Stylist" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Services */}
              <FormField
                control={form.control}
                name="services"
                render={() => (
                  <FormItem>
                    <FormLabel>Services</FormLabel>
                    <div className="grid grid-cols-2 gap-2 rounded-md border p-3">
                      {allServices.map((service) => (
                        <FormField
                          key={service._id}
                          control={form.control}
                          name="services"
                          render={({ field }) => (
                            <FormItem className="flex items-center gap-2 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value.includes(service._id)}
                                  onCheckedChange={(checked) => {
                                    const next = checked
                                      ? [...field.value, service._id]
                                      : field.value.filter((v: string) => v !== service._id)
                                    field.onChange(next)
                                  }}
                                />
                              </FormControl>
                              <span className="text-sm">{service.name}</span>
                            </FormItem>
                          )}
                        />
                      ))}
                      {!allServices.length && (
                        <p className="text-sm text-muted-foreground col-span-2">No services created yet</p>
                      )}
                    </div>
                  </FormItem>
                )}
              />

              {/* Working Hours */}
              <div>
                <FormLabel>Working Hours</FormLabel>
                <div className="space-y-2 mt-2 rounded-md border p-3">
                  {fields.map((field, index) => (
                    <div key={field.id} className="flex items-center gap-3">
                      <FormField
                        control={form.control}
                        name={`workingHours.${index}.isAvailable`}
                        render={({ field: switchField }) => (
                          <FormItem className="flex items-center gap-2 space-y-0 w-28">
                            <FormControl>
                              <Switch
                                checked={switchField.value}
                                onCheckedChange={switchField.onChange}
                              />
                            </FormControl>
                            <span className="text-sm capitalize">
                              {DAYS[index].slice(0, 3)}
                            </span>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`workingHours.${index}.startTime`}
                        render={({ field: timeField }) => (
                          <Input
                            type="time"
                            className="w-28"
                            {...timeField}
                            disabled={!form.watch(`workingHours.${index}.isAvailable`)}
                          />
                        )}
                      />
                      <span className="text-muted-foreground">-</span>
                      <FormField
                        control={form.control}
                        name={`workingHours.${index}.endTime`}
                        render={({ field: timeField }) => (
                          <Input
                            type="time"
                            className="w-28"
                            {...timeField}
                            disabled={!form.watch(`workingHours.${index}.isAvailable`)}
                          />
                        )}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {staff ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </Form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
