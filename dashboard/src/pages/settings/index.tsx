import { useState, useEffect } from 'react'
import { PageHeader } from '@/components/layout/page-header'
import { useSalon, useUpdateProfile, useUpdateWorkingHours, useUpdateSlotSettings, useUpdatePaymentSettings, useUpdateReminderSettings } from '@/hooks/use-salon'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, CheckCircle, XCircle, Trash2, Plus } from 'lucide-react'
import type { WorkingHour, ReminderScheduleItem } from '@/types'

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']

export default function SettingsPage() {
  const { data: salon, isLoading } = useSalon()

  if (isLoading) {
    return (
      <div>
        <PageHeader title="Settings" />
        <div className="space-y-4">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader title="Settings" description="Configure your salon" />

      <Tabs defaultValue="profile">
        <TabsList className="mb-4 flex-wrap">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="hours">Working Hours</TabsTrigger>
          <TabsTrigger value="slots">Slot Settings</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="reminders">Reminders</TabsTrigger>
          <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          {salon && <ProfileTab salon={salon} />}
        </TabsContent>

        <TabsContent value="hours">
          {salon && <WorkingHoursTab workingHours={salon.workingHours} />}
        </TabsContent>

        <TabsContent value="slots">
          {salon && <SlotSettingsTab slotDuration={salon.slotDuration} bufferTime={salon.bufferTime} />}
        </TabsContent>

        <TabsContent value="payments">
          {salon && <PaymentsTab payment={salon.payment} />}
        </TabsContent>

        <TabsContent value="reminders">
          {salon && <RemindersTab reminders={salon.reminders} noShowBufferMinutes={salon.noShowBufferMinutes} />}
        </TabsContent>

        <TabsContent value="whatsapp">
          {salon && <WhatsAppTab whatsapp={salon.whatsapp} />}
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ── Profile Tab ──
function ProfileTab({ salon }: { salon: { name: string; email: string; phone: string; description?: string; address: { street?: string; city?: string; state?: string; pincode?: string } } }) {
  const updateMutation = useUpdateProfile()
  const [form, setForm] = useState({
    name: salon.name,
    description: salon.description || '',
    address: {
      street: salon.address?.street || '',
      city: salon.address?.city || '',
      state: salon.address?.state || '',
      pincode: salon.address?.pincode || '',
    },
  })

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function updateAddress(field: string, value: string) {
    setForm((prev) => ({
      ...prev,
      address: { ...prev.address, [field]: value },
    }))
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Salon Profile</CardTitle>
        <CardDescription>Update your salon information</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            updateMutation.mutate(form)
          }}
          className="space-y-4 max-w-lg"
        >
          <div className="space-y-2">
            <Label>Salon Name</Label>
            <Input value={form.name} onChange={(e) => update('name', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={salon.email} disabled />
          </div>
          <div className="space-y-2">
            <Label>Phone</Label>
            <Input value={salon.phone} disabled />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Input value={form.description} onChange={(e) => update('description', e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Street</Label>
              <Input value={form.address.street} onChange={(e) => updateAddress('street', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>City</Label>
              <Input value={form.address.city} onChange={(e) => updateAddress('city', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>State</Label>
              <Input value={form.address.state} onChange={(e) => updateAddress('state', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Pincode</Label>
              <Input value={form.address.pincode} onChange={(e) => updateAddress('pincode', e.target.value)} />
            </div>
          </div>

          <Button type="submit" disabled={updateMutation.isPending}>
            {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

// ── Working Hours Tab ──
function WorkingHoursTab({ workingHours: initial }: { workingHours: WorkingHour[] }) {
  const updateMutation = useUpdateWorkingHours()
  const [hours, setHours] = useState<WorkingHour[]>(initial)

  useEffect(() => {
    setHours(initial)
  }, [initial])

  function toggleDay(index: number) {
    setHours((prev) =>
      prev.map((h, i) => (i === index ? { ...h, isOpen: !h.isOpen } : h))
    )
  }

  function updateTime(index: number, field: 'openTime' | 'closeTime', value: string) {
    setHours((prev) =>
      prev.map((h, i) => (i === index ? { ...h, [field]: value } : h))
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Working Hours</CardTitle>
        <CardDescription>Set when your salon is open</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 max-w-lg">
          {hours.map((h, i) => (
            <div key={h.day} className="flex items-center gap-3">
              <div className="flex items-center gap-2 w-28">
                <Switch checked={h.isOpen} onCheckedChange={() => toggleDay(i)} />
                <span className="text-sm capitalize">{DAYS[i].slice(0, 3)}</span>
              </div>
              <Input
                type="time"
                value={h.openTime}
                onChange={(e) => updateTime(i, 'openTime', e.target.value)}
                disabled={!h.isOpen}
                className="w-28"
              />
              <span className="text-muted-foreground">-</span>
              <Input
                type="time"
                value={h.closeTime}
                onChange={(e) => updateTime(i, 'closeTime', e.target.value)}
                disabled={!h.isOpen}
                className="w-28"
              />
            </div>
          ))}
        </div>
        <Button
          className="mt-4"
          onClick={() => updateMutation.mutate({ workingHours: hours })}
          disabled={updateMutation.isPending}
        >
          {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Hours
        </Button>
      </CardContent>
    </Card>
  )
}

// ── Slot Settings Tab ──
function SlotSettingsTab({ slotDuration: initDuration, bufferTime: initBuffer }: { slotDuration: number; bufferTime: number }) {
  const updateMutation = useUpdateSlotSettings()
  const [slotDuration, setSlotDuration] = useState(String(initDuration))
  const [bufferTime, setBufferTime] = useState(String(initBuffer))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Slot Settings</CardTitle>
        <CardDescription>Configure appointment slot duration and buffer time</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4 max-w-sm">
          <div className="space-y-2">
            <Label>Slot Duration</Label>
            <Select value={slotDuration} onValueChange={setSlotDuration}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[15, 30, 45, 60].map((v) => (
                  <SelectItem key={v} value={String(v)}>{v} minutes</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Buffer Time Between Appointments</Label>
            <Input
              type="number"
              min={0}
              max={60}
              value={bufferTime}
              onChange={(e) => setBufferTime(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Minutes between appointments (0-60)</p>
          </div>
          <Button
            onClick={() =>
              updateMutation.mutate({
                slotDuration: Number(slotDuration),
                bufferTime: Number(bufferTime),
              })
            }
            disabled={updateMutation.isPending}
          >
            {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Settings
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// ── Payments Tab ──
function PaymentsTab({ payment }: { payment: { razorpayKeyId?: string; isPaymentEnabled: boolean; paymentMode: 'optional' | 'required' } }) {
  const updateMutation = useUpdatePaymentSettings()
  const [keyId, setKeyId] = useState(payment?.razorpayKeyId || '')
  const [keySecret, setKeySecret] = useState('')
  const [webhookSecret, setWebhookSecret] = useState('')
  const [enabled, setEnabled] = useState(payment?.isPaymentEnabled || false)
  const [mode, setMode] = useState(payment?.paymentMode || 'optional')

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Payment Settings</CardTitle>
        <CardDescription>Configure Razorpay integration for online payments</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4 max-w-lg">
          <div className="flex items-center gap-3">
            <Switch checked={enabled} onCheckedChange={setEnabled} />
            <Label>Enable Online Payments</Label>
          </div>

          <div className="space-y-2">
            <Label>Razorpay Key ID</Label>
            <Input
              value={keyId}
              onChange={(e) => setKeyId(e.target.value)}
              placeholder="rzp_live_..."
            />
          </div>

          <div className="space-y-2">
            <Label>Razorpay Key Secret</Label>
            <Input
              type="password"
              value={keySecret}
              onChange={(e) => setKeySecret(e.target.value)}
              placeholder="Enter new secret to update"
            />
            <p className="text-xs text-muted-foreground">Leave blank to keep existing secret</p>
          </div>

          <div className="space-y-2">
            <Label>Razorpay Webhook Secret</Label>
            <Input
              type="password"
              value={webhookSecret}
              onChange={(e) => setWebhookSecret(e.target.value)}
              placeholder="Enter webhook secret to update"
            />
            <p className="text-xs text-muted-foreground">
              Found in Razorpay Dashboard → Settings → Webhooks. Leave blank to keep existing.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Payment Mode</Label>
            <Select value={mode} onValueChange={(v) => setMode(v as 'optional' | 'required')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="optional">Optional (pay at salon or online)</SelectItem>
                <SelectItem value="required">Required (must pay online)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={() => {
              const data: Record<string, unknown> = {
                isPaymentEnabled: enabled,
                paymentMode: mode,
              }
              if (keyId) data.razorpayKeyId = keyId
              if (keySecret) data.razorpayKeySecret = keySecret
              if (webhookSecret) data.razorpayWebhookSecret = webhookSecret
              updateMutation.mutate(data as Parameters<typeof updateMutation.mutate>[0])
            }}
            disabled={updateMutation.isPending}
          >
            {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Payment Settings
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// ── Reminders Tab ──
function RemindersTab({ reminders, noShowBufferMinutes: initBuffer }: { reminders: { enabled: boolean; schedule: ReminderScheduleItem[] }; noShowBufferMinutes: number }) {
  const updateMutation = useUpdateReminderSettings()
  const [enabled, setEnabled] = useState(reminders?.enabled ?? true)
  const [schedule, setSchedule] = useState<ReminderScheduleItem[]>(reminders?.schedule || [])
  const [buffer, setBuffer] = useState(String(initBuffer ?? 30))

  function addReminder() {
    setSchedule((prev) => [...prev, { label: '', minutesBefore: 60 }])
  }

  function removeReminder(index: number) {
    setSchedule((prev) => prev.filter((_, i) => i !== index))
  }

  function updateReminder(index: number, field: keyof ReminderScheduleItem, value: string | number) {
    setSchedule((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Reminder & No-Show Settings</CardTitle>
        <CardDescription>Configure appointment reminders and auto no-show marking</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6 max-w-lg">
          <div className="flex items-center gap-3">
            <Switch checked={enabled} onCheckedChange={setEnabled} />
            <Label>Enable WhatsApp Reminders</Label>
          </div>

          <div className="space-y-3">
            <Label>Reminder Schedule</Label>
            {schedule.map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input
                  value={item.label}
                  onChange={(e) => updateReminder(i, 'label', e.target.value)}
                  placeholder="Label (e.g. 1 day before)"
                  className="flex-1"
                />
                <Input
                  type="number"
                  value={item.minutesBefore}
                  onChange={(e) => updateReminder(i, 'minutesBefore', Number(e.target.value))}
                  className="w-28"
                  min={5}
                  max={10080}
                />
                <span className="text-xs text-muted-foreground w-8">min</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeReminder(i)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={addReminder}>
              <Plus className="h-4 w-4 mr-1" /> Add Reminder
            </Button>
          </div>

          <div className="space-y-2">
            <Label>No-Show Buffer (minutes)</Label>
            <Input
              type="number"
              min={0}
              max={120}
              value={buffer}
              onChange={(e) => setBuffer(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Minutes after appointment end time before auto-marking as no-show (0-120)
            </p>
          </div>

          <Button
            onClick={() =>
              updateMutation.mutate({
                enabled,
                schedule,
                noShowBufferMinutes: Number(buffer),
              })
            }
            disabled={updateMutation.isPending}
          >
            {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Reminder Settings
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// ── WhatsApp Tab ──
function WhatsAppTab({ whatsapp }: { whatsapp: { isConnected: boolean; connectedAt?: string; phoneNumberId?: string } }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">WhatsApp Integration</CardTitle>
        <CardDescription>Connect your WhatsApp Business account</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-3 p-4 rounded-md border">
          {whatsapp.isConnected ? (
            <>
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="font-medium text-green-700">Connected</p>
                <p className="text-sm text-muted-foreground">
                  Phone Number ID: {whatsapp.phoneNumberId}
                </p>
                {whatsapp.connectedAt && (
                  <p className="text-xs text-muted-foreground">
                    Connected on {new Date(whatsapp.connectedAt).toLocaleDateString()}
                  </p>
                )}
              </div>
            </>
          ) : (
            <>
              <XCircle className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">Not Connected</p>
                <p className="text-sm text-muted-foreground">
                  WhatsApp Business integration is not configured. Contact support to set up.
                </p>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
