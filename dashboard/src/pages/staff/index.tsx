import { useState, useMemo } from 'react'
import { PageHeader } from '@/components/layout/page-header'
import { SearchInput } from '@/components/shared/search-input'
import { EmptyState } from '@/components/shared/empty-state'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { StaffFormDialog } from './staff-form-dialog'
import { useStaff, useCreateStaff, useUpdateStaff, useDeleteStaff } from '@/hooks/use-staff'
import { useServices } from '@/hooks/use-services'
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
import { Plus, Users, Pencil, Trash2 } from 'lucide-react'
import type { Staff, Service } from '@/types'

export default function StaffPage() {
  const { data: staff, isLoading } = useStaff()
  const { data: services } = useServices()
  const createMutation = useCreateStaff()
  const updateMutation = useUpdateStaff()
  const deleteMutation = useDeleteStaff()
  const isMobile = useMobile()

  const [search, setSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Staff | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Staff | null>(null)

  const filtered = useMemo(() => {
    if (!staff) return []
    if (!search) return staff
    const q = search.toLowerCase()
    return staff.filter(
      (s) => s.name.toLowerCase().includes(q) || s.role.toLowerCase().includes(q)
    )
  }, [staff, search])

  function handleEdit(member: Staff) {
    setEditing(member)
    setFormOpen(true)
  }

  function handleFormSubmit(data: Partial<Staff>) {
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

  function getServiceNames(staffServices: Staff['services']) {
    return (staffServices as (string | Service)[])
      .map((s) => (typeof s === 'string' ? services?.find((sv) => sv._id === s)?.name : s.name))
      .filter(Boolean)
  }

  return (
    <div>
      <PageHeader title="Staff" description="Manage your team">
        <Button onClick={() => { setEditing(null); setFormOpen(true) }}>
          <Plus className="h-4 w-4 mr-2" />
          Add Staff
        </Button>
      </PageHeader>

      <div className="mb-4 max-w-sm">
        <SearchInput value={search} onChange={setSearch} placeholder="Search staff..." />
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : !filtered.length ? (
        <EmptyState
          icon={Users}
          title={search ? 'No staff found' : 'No staff yet'}
          description={search ? 'Try a different search' : 'Add your first team member'}
        >
          {!search && (
            <Button onClick={() => setFormOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Staff
            </Button>
          )}
        </EmptyState>
      ) : isMobile ? (
        <div className="space-y-3">
          {filtered.map((member) => (
            <Card key={member._id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="min-w-0">
                    <p className="font-medium">{member.name}</p>
                    <p className="text-sm text-muted-foreground">{member.role}</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {getServiceNames(member.services).slice(0, 3).map((name) => (
                        <Badge key={name} variant="secondary" className="text-xs">
                          {name}
                        </Badge>
                      ))}
                      {getServiceNames(member.services).length > 3 && (
                        <Badge variant="secondary" className="text-xs">
                          +{getServiceNames(member.services).length - 3}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => handleEdit(member)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setDeleteTarget(member)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Services</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((member) => (
                <TableRow key={member._id}>
                  <TableCell className="font-medium">{member.name}</TableCell>
                  <TableCell>{member.role}</TableCell>
                  <TableCell>{member.phone || '-'}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {getServiceNames(member.services).slice(0, 3).map((name) => (
                        <Badge key={name} variant="secondary" className="text-xs">
                          {name}
                        </Badge>
                      ))}
                      {getServiceNames(member.services).length > 3 && (
                        <Badge variant="secondary" className="text-xs">
                          +{getServiceNames(member.services).length - 3}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => handleEdit(member)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => setDeleteTarget(member)}>
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

      <StaffFormDialog
        open={formOpen}
        onOpenChange={(open) => { setFormOpen(open); if (!open) setEditing(null) }}
        staff={editing}
        allServices={services || []}
        onSubmit={handleFormSubmit}
        loading={createMutation.isPending || updateMutation.isPending}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}
        title="Delete Staff"
        description={`Are you sure you want to remove "${deleteTarget?.name}"? This action cannot be undone.`}
        onConfirm={handleDelete}
        loading={deleteMutation.isPending}
      />
    </div>
  )
}
