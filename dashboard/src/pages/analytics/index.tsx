import { useState, useMemo } from 'react'
import { PageHeader } from '@/components/layout/page-header'
import {
  useRevenueAnalytics,
  useServiceAnalytics,
  useStaffAnalytics,
  useBookingAnalytics,
  useCustomerAnalytics,
} from '@/hooks/use-analytics'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import { format, subDays } from 'date-fns'

const COLORS = [
  'var(--color-chart-1)',
  'var(--color-chart-2)',
  'var(--color-chart-3)',
  'var(--color-chart-4)',
  'var(--color-chart-5)',
]

function DateRangeFilter({
  startDate,
  endDate,
  period,
  onStartChange,
  onEndChange,
  onPeriodChange,
  showPeriod = true,
}: {
  startDate: string
  endDate: string
  period?: string
  onStartChange: (v: string) => void
  onEndChange: (v: string) => void
  onPeriodChange?: (v: string) => void
  showPeriod?: boolean
}) {
  return (
    <div className="flex flex-wrap gap-3 mb-4">
      <div className="space-y-1">
        <Label className="text-xs">From</Label>
        <Input type="date" value={startDate} onChange={(e) => onStartChange(e.target.value)} className="w-auto" />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">To</Label>
        <Input type="date" value={endDate} onChange={(e) => onEndChange(e.target.value)} className="w-auto" />
      </div>
      {showPeriod && onPeriodChange && (
        <div className="space-y-1">
          <Label className="text-xs">Group by</Label>
          <Select value={period} onValueChange={onPeriodChange}>
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  )
}

function ChartSkeleton() {
  return <Skeleton className="h-64 w-full" />
}

export default function AnalyticsPage() {
  const today = format(new Date(), 'yyyy-MM-dd')
  const thirtyDaysAgo = format(subDays(new Date(), 30), 'yyyy-MM-dd')

  const [startDate, setStartDate] = useState(thirtyDaysAgo)
  const [endDate, setEndDate] = useState(today)
  const [period, setPeriod] = useState('daily')

  const params = useMemo(
    () => ({ startDate, endDate, period }),
    [startDate, endDate, period]
  )
  const rangeParams = useMemo(
    () => ({ startDate, endDate }),
    [startDate, endDate]
  )

  const { data: revenueData, isLoading: revLoading } = useRevenueAnalytics(params)
  const { data: serviceData, isLoading: svcLoading } = useServiceAnalytics(rangeParams)
  const { data: staffData, isLoading: staffLoading } = useStaffAnalytics(rangeParams)
  const { data: bookingData, isLoading: bookLoading } = useBookingAnalytics(params)
  const { data: customerData, isLoading: custLoading } = useCustomerAnalytics(params)

  return (
    <div>
      <PageHeader title="Analytics" description="Reports and insights" />

      <DateRangeFilter
        startDate={startDate}
        endDate={endDate}
        period={period}
        onStartChange={setStartDate}
        onEndChange={setEndDate}
        onPeriodChange={setPeriod}
      />

      <Tabs defaultValue="revenue">
        <TabsList className="mb-4 flex-wrap">
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="services">Services</TabsTrigger>
          <TabsTrigger value="staff">Staff</TabsTrigger>
          <TabsTrigger value="bookings">Bookings</TabsTrigger>
          <TabsTrigger value="customers">Customers</TabsTrigger>
        </TabsList>

        {/* Revenue Chart */}
        <TabsContent value="revenue">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Revenue Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              {revLoading ? (
                <ChartSkeleton />
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={revenueData?.revenue || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v) => [`₹${Number(v).toLocaleString('en-IN')}`, 'Revenue']} />
                    <Area type="monotone" dataKey="revenue" stroke={COLORS[0]} fill={COLORS[0]} fillOpacity={0.2} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Service Popularity */}
        <TabsContent value="services">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Service Bookings</CardTitle>
              </CardHeader>
              <CardContent>
                {svcLoading ? (
                  <ChartSkeleton />
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={serviceData?.services || []} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="count" fill={COLORS[1]} name="Bookings" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Service Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                {svcLoading ? (
                  <ChartSkeleton />
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={serviceData?.services || []}
                        dataKey="revenue"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label={({ name, percent }) => `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`}
                      >
                        {(serviceData?.services || []).map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v) => `₹${Number(v).toLocaleString('en-IN')}`} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Staff Performance */}
        <TabsContent value="staff">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Staff Performance</CardTitle>
            </CardHeader>
            <CardContent>
              {staffLoading ? (
                <ChartSkeleton />
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={staffData?.staff || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    <Bar yAxisId="left" dataKey="appointments" fill={COLORS[0]} name="Appointments" />
                    <Bar yAxisId="right" dataKey="revenue" fill={COLORS[1]} name="Revenue (₹)" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Booking Trends */}
        <TabsContent value="bookings">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Booking Trends by Channel</CardTitle>
            </CardHeader>
            <CardContent>
              {bookLoading ? (
                <ChartSkeleton />
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={bookingData?.bookings || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="whatsapp" stroke={COLORS[0]} name="WhatsApp" />
                    <Line type="monotone" dataKey="dashboard" stroke={COLORS[1]} name="Dashboard" />
                    <Line type="monotone" dataKey="walkin" stroke={COLORS[2]} name="Walk-in" />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Customer Growth */}
        <TabsContent value="customers">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Customer Growth</CardTitle>
            </CardHeader>
            <CardContent>
              {custLoading ? (
                <ChartSkeleton />
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={customerData?.customers || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill={COLORS[3]} name="New Customers" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
