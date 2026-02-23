const { Salon, Appointment } = require('../models');
const { sendMessage, buildMetaPayload } = require('./whatsapp.service');
const { decryptToken } = require('./whatsapp-crypto.service');
const logger = require('../utils/logger');

/**
 * Build a reminder message for WhatsApp.
 */
function buildReminderMessage(appointment, salon, minutesBefore) {
  const timeLabel = minutesBefore >= 60
    ? `${Math.round(minutesBefore / 60)} hour${minutesBefore >= 120 ? 's' : ''}`
    : `${minutesBefore} minutes`;

  // Format time to 12-hour
  const [h, m] = appointment.startTime.split(':');
  const hour = parseInt(h);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  const timeStr = `${hour12}:${m} ${ampm}`;

  // Format date
  const dateObj = new Date(appointment.date);
  const dateStr = dateObj.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  return `Reminder: Aapka appointment ${salon.name} mein ${timeLabel} mein hai!\n\n` +
    `Date: ${dateStr}\n` +
    `Time: ${timeStr}\n\n` +
    `Please samay par aayein. Agar cancel karna hai toh humein message karein.`;
}

/**
 * Process reminders for all salons.
 * For each salon with reminders enabled + WhatsApp connected,
 * find appointments within the reminder window and send WhatsApp messages.
 */
async function processReminders() {
  const salons = await Salon.find({
    'reminders.enabled': true,
    'whatsapp.isConnected': true,
    isActive: true,
  }).select('+whatsapp.accessToken');

  let totalSent = 0;

  for (const salon of salons) {
    const schedule = salon.reminders?.schedule || [];
    if (!schedule.length) continue;

    for (const reminder of schedule) {
      const { minutesBefore } = reminder;
      const now = new Date();

      // Window: appointments whose start is within [now+minutesBefore, now+minutesBefore+5min]
      const windowStart = new Date(now.getTime() + minutesBefore * 60 * 1000);
      const windowEnd = new Date(windowStart.getTime() + 5 * 60 * 1000);

      // Query date range: get the local date for window start/end
      const wsDate = new Date(windowStart.getFullYear(), windowStart.getMonth(), windowStart.getDate());
      const weDate = new Date(windowEnd.getFullYear(), windowEnd.getMonth(), windowEnd.getDate());
      weDate.setHours(23, 59, 59, 999);

      // Find matching appointments
      const appointments = await Appointment.find({
        salonId: salon._id,
        status: { $in: ['pending', 'confirmed'] },
        date: { $gte: wsDate, $lte: weDate },
      }).populate('customerId', 'phone name');

      for (const appt of appointments) {
        // Check if this reminder was already sent
        const alreadySent = appt.remindersSent?.some(
          (r) => r.minutesBefore === minutesBefore
        );
        if (alreadySent) continue;

        // Build full appointment datetime using local date + time string
        const [apptHour, apptMin] = appt.startTime.split(':').map(Number);
        const apptDateObj = new Date(appt.date);
        const apptDateTime = new Date(
          apptDateObj.getFullYear(), apptDateObj.getMonth(), apptDateObj.getDate(),
          apptHour, apptMin, 0, 0
        );

        if (apptDateTime < windowStart || apptDateTime >= windowEnd) continue;

        // Send reminder via WhatsApp
        try {
          const customer = appt.customerId;
          if (!customer?.phone) continue;

          const text = buildReminderMessage(appt, salon, minutesBefore);
          const senderPhone = `91${customer.phone}`;
          const payload = buildMetaPayload(senderPhone, { type: 'text', body: text });

          await sendMessage(
            salon.whatsapp.phoneNumberId,
            salon.whatsapp.accessToken,
            payload
          );

          // Mark reminder as sent
          appt.remindersSent.push({ minutesBefore, sentAt: new Date() });
          await appt.save();
          totalSent++;
        } catch (err) {
          logger.error('Failed to send reminder', {
            appointmentId: appt._id,
            salonId: salon._id,
            error: err.message,
          });
        }
      }
    }
  }

  if (totalSent > 0) {
    logger.info(`Sent ${totalSent} appointment reminders`);
  }

  return totalSent;
}

module.exports = { processReminders, buildReminderMessage };
