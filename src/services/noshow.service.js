const { Salon, Appointment } = require('../models');
const logger = require('../utils/logger');

/**
 * Mark overdue confirmed appointments as no-show.
 * For each active salon, find confirmed appointments where:
 *   appointment end time + noShowBufferMinutes < now
 */
async function processNoShows() {
  const salons = await Salon.find({ isActive: true }).select('noShowBufferMinutes slotDuration');
  const now = new Date();
  let totalMarked = 0;

  for (const salon of salons) {
    const bufferMinutes = salon.noShowBufferMinutes ?? 30;

    // Find confirmed appointments for past dates (including today)
    const appointments = await Appointment.find({
      salonId: salon._id,
      status: 'confirmed',
      date: { $lte: now },
    });

    for (const appt of appointments) {
      // Calculate appointment end datetime using local date components
      const [endH, endM] = appt.endTime.split(':').map(Number);
      const apptDate = new Date(appt.date);
      const endDateTime = new Date(
        apptDate.getFullYear(), apptDate.getMonth(), apptDate.getDate(),
        endH, endM, 0, 0
      );

      // Add buffer
      const deadline = new Date(endDateTime.getTime() + bufferMinutes * 60 * 1000);

      if (now > deadline) {
        appt.status = 'no-show';
        await appt.save();
        totalMarked++;
      }
    }
  }

  if (totalMarked > 0) {
    logger.info(`Marked ${totalMarked} appointments as no-show`);
  }

  return totalMarked;
}

module.exports = { processNoShows };
