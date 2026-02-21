import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/layout/page-header'
import { SearchInput } from '@/components/shared/search-input'
import { EmptyState } from '@/components/shared/empty-state'
import { useCustomers } from '@/hooks/use-customers'
import { useMobile } from '@/hooks/use-mobile'
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
import { UserCircle } from 'lucide-react'
import { format } from 'date-fns'

export default function CustomersPage() {
  const { data: customers, isLoading } = useCustomers()
  const isMobile = useMobile()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    if (!customers) return []
    if (!search) return customers
    const q = search.toLowerCase()
    return customers.filter(
      (c) =>
        c.name?.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        c.email?.toLowerCase().includes(q)
    )
  }, [customers, search])

  return (
    <div>
      <PageHeader title="Customers" description="Manage your clients" />

      <div className="mb-4 max-w-sm">
        <SearchInput value={search} onChange={setSearch} placeholder="Search by name, phone, email..." />
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : !filtered.length ? (
        <EmptyState
          icon={UserCircle}
          title={search ? 'No customers found' : 'No customers yet'}
          description={search ? 'Try a different search term' : 'Customers appear here after their first booking'}
        />
      ) : isMobile ? (
        <div className="space-y-3">
          {filtered.map((c) => (
            <Card
              key={c._id}
              className="cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => navigate(`/customers/${c._id}`)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{c.name || 'Unnamed'}</p>
                    <p className="text-sm text-muted-foreground">{c.phone}</p>
                  </div>
                  <div className="text-right text-sm">
                    <p>{c.totalVisits} visits</p>
                    {c.lastVisit && (
                      <p className="text-xs text-muted-foreground">
                        Last: {format(new Date(c.lastVisit), 'dd MMM')}
                      </p>
                    )}
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
                <TableHead>Phone</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Visits</TableHead>
                <TableHead>Last Visit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c) => (
                <TableRow
                  key={c._id}
                  className="cursor-pointer"
                  onClick={() => navigate(`/customers/${c._id}`)}
                >
                  <TableCell className="font-medium">{c.name || 'Unnamed'}</TableCell>
                  <TableCell>{c.phone}</TableCell>
                  <TableCell>{c.email || '-'}</TableCell>
                  <TableCell>{c.totalVisits}</TableCell>
                  <TableCell>
                    {c.lastVisit ? format(new Date(c.lastVisit), 'dd MMM yyyy') : '-'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
