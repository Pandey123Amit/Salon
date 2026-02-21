import { PageHeader } from '@/components/layout/page-header'
import { StatsCard, StatsCardSkeleton } from '@/components/shared/stats-card'
import { StatusBadge } from '@/components/shared/status-badge'
import { useDashboardStats, useRevenueAnalytics } from '@/hooks/use-analytics'
import { useTodayAppointments } from '@/hooks/use-appointments'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Calendar,
  IndianRupee,
  TrendingUp,
  Users,
  UserCheck,
} from 'lucide-react'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts'
import { format } from 'date-fns'
import type { AppointmentStatus } from '@/types'

export default function DashboardPage() {
  const { data: stats, isLoading: statsLoading } = useDashboardStats()
  const { data: todayAppts, isLoading: apptsLoading } = useTodayAppointments()
  const { data: revenueData } = useRevenueAnalytics({
    period: 'daily',
    startDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  })

  return (
    <div>
      <PageHeader title="Dashboard" description="Overview of your salon" />

      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 mb-6">
        {statsLoading ? (
          Array.from({ length: 4 }).map((_, i) => <StatsCardSkeleton key={i} />)
        ) : (
          <>
            <StatsCard
              title="Today's Appointments"
              value={stats?.todayAppointments ?? 0}
              icon={Calendar}
            />
            <StatsCard
              title="Today's Revenue"
              value={`₹${stats?.todayRevenue?.toLocaleString('en-IN') ?? 0}`}
              icon={IndianRupee}
            />
            <StatsCard
              title="Monthly Revenue"
              value={`₹${stats?.monthRevenue?.toLocaleString('en-IN') ?? 0}`}
              icon={TrendingUp}
            />
            <StatsCard
              title="Total Customers"
              value={stats?.totalCustomers ?? 0}
              icon={Users}
              description={`${stats?.totalStaff ?? 0} staff members`}
            />
          </>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Today's Appointments */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <UserCheck className="h-4 w-4" />
              Today&apos;s Schedule
            </CardTitle>
          </CardHeader>
          <CardContent>
            {apptsLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : !todayAppts?.length ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No appointments today
              </p>
            ) : (
              <div className="space-y-2">
                {todayAppts.slice(0, 8).map((appt) => (
                  <div
                    key={appt._id}
                    className="flex items-center justify-between p-2 rounded-md border text-sm"
                  >
                    <div className="min-w-0">
                      <p className="font-medium truncate">
                        {'name' in appt.customerId
                          ? appt.customerId.name || appt.customerId.phone
                          : 'Customer'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {appt.startTime} &middot;{' '}
                        {'name' in appt.serviceId ? appt.serviceId.name : 'Service'}
                      </p>
                    </div>
                    <StatusBadge status={appt.status as AppointmentStatus} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Mini Revenue Chart */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Revenue (Last 14 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!revenueData?.revenue?.length ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No revenue data yet
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={revenueData.revenue}>
                  <defs>
                    <linearGradient id="revGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v: string) => {
                      try { return format(new Date(v), 'dd MMM') } catch { return v }
                    }}
                  />
                  <YAxis tick={{ fontSize: 11 }} width={50} />
                  <Tooltip
                    formatter={(value) => [`₹${Number(value).toLocaleString('en-IN')}`, 'Revenue']}
                    labelFormatter={(label) => {
                      try { return format(new Date(String(label)), 'dd MMM yyyy') } catch { return String(label) }
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="var(--color-primary)"
                    fill="url(#revGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
