import { useEffect } from 'react'
import { useForm, type Resolver } from 'react-hook-form'
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
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Loader2 } from 'lucide-react'
import type { Service } from '@/types'

const categories = ['Hair', 'Skin', 'Nails', 'Makeup', 'Spa', 'Beard', 'Bridal', 'Other'] as const
const genders = ['male', 'female', 'unisex'] as const

const serviceSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  category: z.enum(categories),
  duration: z.number().min(5).max(480),
  price: z.number().min(0),
  description: z.string().max(500).optional(),
  gender: z.enum(genders),
})

type ServiceFormData = z.infer<typeof serviceSchema>

interface ServiceFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  service?: Service | null
  onSubmit: (data: ServiceFormData) => void
  loading?: boolean
}

export function ServiceFormDialog({
  open,
  onOpenChange,
  service,
  onSubmit,
  loading,
}: ServiceFormDialogProps) {
  const form = useForm<ServiceFormData>({
    resolver: zodResolver(serviceSchema) as Resolver<ServiceFormData>,
    defaultValues: {
      name: '',
      category: 'Hair',
      duration: 30,
      price: 0,
      description: '',
      gender: 'unisex',
    },
  })

  useEffect(() => {
    if (service) {
      form.reset({
        name: service.name,
        category: service.category as ServiceFormData['category'],
        duration: service.duration,
        price: service.price,
        description: service.description || '',
        gender: service.gender as ServiceFormData['gender'],
      })
    } else {
      form.reset({
        name: '',
        category: 'Hair',
        duration: 30,
        price: 0,
        description: '',
        gender: 'unisex',
      })
    }
  }, [service, form])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{service ? 'Edit Service' : 'Add Service'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Haircut" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories.map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="gender"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gender</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {genders.map((g) => (
                          <SelectItem key={g} value={g} className="capitalize">{g}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="duration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duration (min)</FormLabel>
                    <FormControl>
                      <Input type="number" min={5} max={480} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price (₹)</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} step={10} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Optional description..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {service ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
