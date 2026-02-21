import { useState, useMemo } from 'react'
import { PageHeader } from '@/components/layout/page-header'
import { SearchInput } from '@/components/shared/search-input'
import { EmptyState } from '@/components/shared/empty-state'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { ServiceFormDialog } from './service-form-dialog'
import { useServices, useCreateService, useUpdateService, useDeleteService } from '@/hooks/use-services'
import { useMobile } from '@/hooks/use-mobile'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Plus, Scissors, Pencil, Trash2 } from 'lucide-react'
import type { Service } from '@/types'

export default function ServicesPage() {
  const { data: services, isLoading } = useServices()
  const createMutation = useCreateService()
  const updateMutation = useUpdateService()
  const deleteMutation = useDeleteService()
  const isMobile = useMobile()

  const [search, setSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Service | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Service | null>(null)

  const filtered = useMemo(() => {
    if (!services) return []
    if (!search) return services
    const q = search.toLowerCase()
    return services.filter(
      (s) => s.name.toLowerCase().includes(q) || s.category.toLowerCase().includes(q)
    )
  }, [services, search])

  function handleEdit(service: Service) {
    setEditing(service)
    setFormOpen(true)
  }

  function handleFormSubmit(data: Partial<Service>) {
    if (editing) {
      updateMutation.mutate(
        { id: editing._id, data },
        { onSuccess: () => { setFormOpen(false); setEditing(null) } }
      )
    } else {
      createMutation.mutate(data, {
        onSuccess: () => setFormOpen(false),
      })
    }
  }

  function handleDelete() {
    if (!deleteTarget) return
    deleteMutation.mutate(deleteTarget._id, {
      onSuccess: () => setDeleteTarget(null),
    })
  }

  return (
    <div>
      <PageHeader title="Services" description="Manage your salon services">
        <Button onClick={() => { setEditing(null); setFormOpen(true) }}>
          <Plus className="h-4 w-4 mr-2" />
          Add Service
        </Button>
      </PageHeader>

      <div className="mb-4 max-w-sm">
        <SearchInput value={search} onChange={setSearch} placeholder="Search services..." />
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : !filtered.length ? (
        <EmptyState
          icon={Scissors}
          title={search ? 'No services found' : 'No services yet'}
          description={search ? 'Try a different search' : 'Add your first service to get started'}
        >
          {!search && (
            <Button onClick={() => setFormOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Service
            </Button>
          )}
        </EmptyState>
      ) : isMobile ? (
        // Mobile: card list
        <div className="space-y-3">
          {filtered.map((service) => (
            <Card key={service._id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="min-w-0">
                    <p className="font-medium">{service.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline">{service.category}</Badge>
                      <span className="text-sm text-muted-foreground">{service.duration} min</span>
                    </div>
                  </div>
                  <p className="font-semibold whitespace-nowrap">₹{service.price}</p>
                </div>
                <div className="flex justify-end gap-2 mt-3">
                  <Button size="sm" variant="ghost" onClick={() => handleEdit(service)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setDeleteTarget(service)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        // Desktop: table
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Gender</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((service) => (
                <TableRow key={service._id}>
                  <TableCell className="font-medium">{service.name}</TableCell>
                  <TableCell><Badge variant="outline">{service.category}</Badge></TableCell>
                  <TableCell>{service.duration} min</TableCell>
                  <TableCell>₹{service.price}</TableCell>
                  <TableCell className="capitalize">{service.gender}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => handleEdit(service)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => setDeleteTarget(service)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <ServiceFormDialog
        open={formOpen}
        onOpenChange={(open) => { setFormOpen(open); if (!open) setEditing(null) }}
        service={editing}
        onSubmit={handleFormSubmit}
        loading={createMutation.isPending || updateMutation.isPending}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}
        title="Delete Service"
        description={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        onConfirm={handleDelete}
        loading={deleteMutation.isPending}
      />
    </div>
  )
}
