const { Salon, Appointment, Conversation, MessageLog } = require('../src/models');
const { processReminders, buildReminderMessage } = require('../src/services/reminder.service');
const { processNoShows } = require('../src/services/noshow.service');
const { runCleanup } = require('../src/services/cleanup.service');
const { connectDB, disconnectDB, clearDB } = require('./setup');
const { createFullSetup } = require('./helpers');

// Mock WhatsApp service to prevent real API calls
jest.mock('../src/services/whatsapp.service', () => ({
  buildMetaPayload: jest.fn((_to, formatted) => ({
    messaging_product: 'whatsapp',
    to: _to,
    type: 'text',
    text: { body: formatted.body },
  })),
  sendMessage: jest.fn().mockResolvedValue({ messages: [{ id: 'wamid_test' }] }),
  markAsRead: jest.fn().mockResolvedValue(undefined),
}));

// Mock node-cron for registration test
jest.mock('node-cron', () => ({
  schedule: jest.fn(),
}));

beforeAll(async () => { await connectDB(); });
afterAll(async () => { await disconnectDB(); });
afterEach(async () => {
  await clearDB();
  jest.clearAllMocks();
});

describe('Phase 6 — Cron Jobs', () => {
  // ─── Reminders ───────────────────────────────────────────────
  describe('processReminders', () => {
    it('should send reminder for appointment within window', async () => {
      const { salon, service, staff, customer } = await createFullSetup();
      const { sendMessage } = require('../src/services/whatsapp.service');

      // Enable reminders + WhatsApp on salon
      await Salon.findByIdAndUpdate(salon._id, {
        'reminders.enabled': true,
        'reminders.schedule': [{ label: '2 hours before', minutesBefore: 120 }],
        'whatsapp.isConnected': true,
        'whatsapp.phoneNumberId': 'phone_123',
        'whatsapp.accessToken': 'encrypted_token',
      });

      // Create appointment exactly 2 hours + 2 minutes from now (within the 5-min window)
      const now = new Date();
      const apptTime = new Date(now.getTime() + (120 + 2) * 60 * 1000);

      // Use the appointment date's local representation
      const year = apptTime.getFullYear();
      const month = String(apptTime.getMonth() + 1).padStart(2, '0');
      const day = String(apptTime.getDate()).padStart(2, '0');
      const apptHour = String(apptTime.getHours()).padStart(2, '0');
      const apptMin = String(apptTime.getMinutes()).padStart(2, '0');

      // Create date at local midnight for the appointment day
      const localMidnight = new Date(year, apptTime.getMonth(), apptTime.getDate());

      await Appointment.create({
        salonId: salon._id,
        customerId: customer._id,
        serviceId: service._id,
        staffId: staff._id,
        date: localMidnight,
        startTime: `${apptHour}:${apptMin}`,
        endTime: `${apptHour}:${apptMin}`,
        duration: 30,
        price: 200,
        status: 'confirmed',
      });

      const sent = await processReminders();

      expect(sent).toBeGreaterThanOrEqual(1);
      expect(sendMessage).toHaveBeenCalled();
    });

    it('should not re-send already sent reminder', async () => {
      const { salon, service, staff, customer } = await createFullSetup();
      const { sendMessage } = require('../src/services/whatsapp.service');

      await Salon.findByIdAndUpdate(salon._id, {
        'reminders.enabled': true,
        'reminders.schedule': [{ label: '2 hours before', minutesBefore: 120 }],
        'whatsapp.isConnected': true,
        'whatsapp.phoneNumberId': 'phone_123',
        'whatsapp.accessToken': 'encrypted_token',
      });

      const now = new Date();
      const apptTime = new Date(now.getTime() + (120 + 2) * 60 * 1000);
      const localMidnight = new Date(apptTime.getFullYear(), apptTime.getMonth(), apptTime.getDate());
      const apptHour = String(apptTime.getHours()).padStart(2, '0');
      const apptMin = String(apptTime.getMinutes()).padStart(2, '0');

      await Appointment.create({
        salonId: salon._id,
        customerId: customer._id,
        serviceId: service._id,
        staffId: staff._id,
        date: localMidnight,
        startTime: `${apptHour}:${apptMin}`,
        endTime: `${apptHour}:${apptMin}`,
        duration: 30,
        price: 200,
        status: 'confirmed',
        remindersSent: [{ minutesBefore: 120, sentAt: new Date() }],
      });

      const sent = await processReminders();

      expect(sent).toBe(0);
      expect(sendMessage).not.toHaveBeenCalled();
    });

    it('should skip salon with reminders disabled', async () => {
      const { salon, service, staff, customer } = await createFullSetup();
      const { sendMessage } = require('../src/services/whatsapp.service');

      await Salon.findByIdAndUpdate(salon._id, {
        'reminders.enabled': false,
        'whatsapp.isConnected': true,
        'whatsapp.phoneNumberId': 'phone_123',
        'whatsapp.accessToken': 'encrypted_token',
      });

      const now = new Date();
      const apptTime = new Date(now.getTime() + 120 * 60 * 1000);
      const apptDate = apptTime.toISOString().split('T')[0];

      await Appointment.create({
        salonId: salon._id,
        customerId: customer._id,
        serviceId: service._id,
        staffId: staff._id,
        date: new Date(apptDate),
        startTime: '10:00',
        endTime: '10:30',
        duration: 30,
        price: 200,
        status: 'confirmed',
      });

      const sent = await processReminders();

      expect(sent).toBe(0);
      expect(sendMessage).not.toHaveBeenCalled();
    });
  });

  describe('buildReminderMessage', () => {
    it('should format hours correctly', () => {
      const msg = buildReminderMessage(
        { startTime: '14:30', date: new Date('2026-03-15') },
        { name: 'Test Salon' },
        120
      );

      expect(msg).toContain('2 hours');
      expect(msg).toContain('Test Salon');
      expect(msg).toContain('2:30 PM');
    });

    it('should format minutes correctly', () => {
      const msg = buildReminderMessage(
        { startTime: '09:00', date: new Date('2026-03-15') },
        { name: 'Glamour Salon' },
        30
      );

      expect(msg).toContain('30 minutes');
      expect(msg).toContain('Glamour Salon');
    });
  });

  // ─── No-Show ─────────────────────────────────────────────────
  describe('processNoShows', () => {
    it('should mark overdue confirmed appointment as no-show', async () => {
      const { salon, service, staff, customer } = await createFullSetup();

      // Set buffer to 30 min
      await Salon.findByIdAndUpdate(salon._id, { noShowBufferMinutes: 30 });

      // Create appointment that ended 2 hours ago
      const pastDate = new Date();
      pastDate.setHours(pastDate.getHours() - 2);
      const dateStr = pastDate.toISOString().split('T')[0];

      await Appointment.create({
        salonId: salon._id,
        customerId: customer._id,
        serviceId: service._id,
        staffId: staff._id,
        date: new Date(dateStr),
        startTime: '08:00',
        endTime: '08:30',
        duration: 30,
        price: 200,
        status: 'confirmed',
      });

      const marked = await processNoShows();
      expect(marked).toBe(1);

      const updated = await Appointment.findOne({ salonId: salon._id });
      expect(updated.status).toBe('no-show');
    });

    it('should not mark in-progress appointments', async () => {
      const { salon, service, staff, customer } = await createFullSetup();

      const pastDate = new Date();
      pastDate.setHours(pastDate.getHours() - 2);
      const dateStr = pastDate.toISOString().split('T')[0];

      await Appointment.create({
        salonId: salon._id,
        customerId: customer._id,
        serviceId: service._id,
        staffId: staff._id,
        date: new Date(dateStr),
        startTime: '08:00',
        endTime: '08:30',
        duration: 30,
        price: 200,
        status: 'in-progress',
      });

      const marked = await processNoShows();
      expect(marked).toBe(0);
    });

    it('should not mark appointment within buffer window', async () => {
      const { salon, service, staff, customer } = await createFullSetup();

      // Set large buffer (120 min)
      await Salon.findByIdAndUpdate(salon._id, { noShowBufferMinutes: 120 });

      // Create appointment that ended 10 minutes ago (well within 120-min buffer)
      const now = new Date();
      const tenMinAgo = new Date(now.getTime() - 10 * 60 * 1000);
      const localDate = new Date(tenMinAgo.getFullYear(), tenMinAgo.getMonth(), tenMinAgo.getDate());
      const endHour = String(tenMinAgo.getHours()).padStart(2, '0');
      const endMin = String(tenMinAgo.getMinutes()).padStart(2, '0');

      await Appointment.create({
        salonId: salon._id,
        customerId: customer._id,
        serviceId: service._id,
        staffId: staff._id,
        date: localDate,
        startTime: `${endHour}:${endMin}`,
        endTime: `${endHour}:${endMin}`,
        duration: 30,
        price: 200,
        status: 'confirmed',
      });

      const marked = await processNoShows();
      expect(marked).toBe(0);
    });
  });

  // ─── Cleanup ─────────────────────────────────────────────────
  describe('runCleanup', () => {
    it('should expire stale conversations', async () => {
      const { salon, customer } = await createFullSetup();

      // Create conversation inactive for >24 hours
      await Conversation.create({
        salonId: salon._id,
        customerId: customer._id,
        phone: customer.phone,
        state: 'greeting',
        messages: [],
        isActive: true,
        lastActivityAt: new Date(Date.now() - 25 * 60 * 60 * 1000),
      });

      // Create a still-active conversation
      await Conversation.create({
        salonId: salon._id,
        customerId: customer._id,
        phone: '9999999999',
        state: 'greeting',
        messages: [],
        isActive: true,
        lastActivityAt: new Date(),
      });

      const result = await runCleanup();

      expect(result.expiredConversations).toBe(1);

      const expired = await Conversation.findOne({ phone: customer.phone });
      expect(expired.isActive).toBe(false);

      const active = await Conversation.findOne({ phone: '9999999999' });
      expect(active.isActive).toBe(true);
    });

    it('should delete old message logs', async () => {
      const { salon } = await createFullSetup();

      // Create old message log (>90 days)
      await MessageLog.create({
        salonId: salon._id,
        wamid: 'old_msg_1',
        direction: 'inbound',
        customerPhone: '9876543210',
        messageType: 'text',
        content: 'old message',
        status: 'delivered',
        createdAt: new Date(Date.now() - 91 * 24 * 60 * 60 * 1000),
      });

      // Create recent message log
      await MessageLog.create({
        salonId: salon._id,
        wamid: 'recent_msg_1',
        direction: 'inbound',
        customerPhone: '9876543210',
        messageType: 'text',
        content: 'recent message',
        status: 'delivered',
      });

      const result = await runCleanup();

      expect(result.deletedLogs).toBe(1);

      const remaining = await MessageLog.find({});
      expect(remaining).toHaveLength(1);
      expect(remaining[0].wamid).toBe('recent_msg_1');
    });
  });

  // ─── Cron Registration ───────────────────────────────────────
  describe('Cron registration', () => {
    it('should register 3 cron jobs', () => {
      const cron = require('node-cron');
      const { startCronJobs } = require('../src/cron');

      startCronJobs();

      expect(cron.schedule).toHaveBeenCalledTimes(3);
      expect(cron.schedule).toHaveBeenCalledWith('*/5 * * * *', expect.any(Function));
      expect(cron.schedule).toHaveBeenCalledWith('*/15 * * * *', expect.any(Function));
      expect(cron.schedule).toHaveBeenCalledWith('0 3 * * *', expect.any(Function));
    });
  });
});
