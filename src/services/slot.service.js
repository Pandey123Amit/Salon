const { Salon, Service, Staff, Appointment } = require('../models');
const ApiError = require('../utils/ApiError');
const { DAYS_OF_WEEK } = require('../config/constants');

/**
 * Convert "HH:mm" string to total minutes since midnight.
 */
function timeToMinutes(time) {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

/**
 * Convert total minutes since midnight to "HH:mm" string.
 */
function minutesToTime(mins) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Check if a date falls on one of the salon's holidays.
 * Compares by calendar date only (ignores time component).
 */
function isHoliday(date, holidays) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return holidays.some((h) => {
    const hd = new Date(h);
    hd.setHours(0, 0, 0, 0);
    return hd.getTime() === d.getTime();
  });
}

/**
 * Get the day-of-week string (monday, tuesday, …) for a Date.
 */
function getDayOfWeek(date) {
  // JS getDay(): 0=Sunday … 6=Saturday → map to our DAYS_OF_WEEK
  const jsDay = new Date(date).getDay();
  // DAYS_OF_WEEK: 0=monday … 6=sunday
  return DAYS_OF_WEEK[jsDay === 0 ? 6 : jsDay - 1];
}

/**
 * Core slot availability calculator.
 *
 * @param {Object} params
 * @param {ObjectId} params.salonId
 * @param {String|Date} params.date       - The target date
 * @param {ObjectId} params.serviceId
 * @param {ObjectId} [params.staffId]     - Optional staff filter
 * @returns {{ slots: Array<{startTime, endTime, staffId, staffName}> }}
 */
async function getAvailableSlots({ salonId, date, serviceId, staffId }) {
  // 1. Fetch salon
  const salon = await Salon.findById(salonId);
  if (!salon) throw ApiError.notFound('Salon not found');

  // 2. Fetch service — must belong to this salon and be active
  const service = await Service.findOne({
    _id: serviceId,
    salonId,
    isActive: true,
  });
  if (!service) throw ApiError.notFound('Service not found');

  // 3. Get day-of-week
  const targetDate = new Date(date);
  const dayName = getDayOfWeek(targetDate);

  // 4a. Holiday check
  if (isHoliday(targetDate, salon.holidays || [])) {
    return { slots: [] };
  }

  // 4b. Salon closed that day?
  const salonDay = salon.workingHours.find((wh) => wh.day === dayName);
  if (!salonDay || !salonDay.isOpen) {
    return { slots: [] };
  }

  const salonOpen = timeToMinutes(salonDay.openTime);
  const salonClose = timeToMinutes(salonDay.closeTime);

  // 5. Determine eligible staff
  let staffList;
  if (staffId) {
    const staff = await Staff.findOne({
      _id: staffId,
      salonId,
      isActive: true,
    });
    if (!staff) throw ApiError.notFound('Staff not found');
    if (!staff.services.map((s) => s.toString()).includes(serviceId.toString())) {
      throw ApiError.badRequest('Staff does not offer this service');
    }
    staffList = [staff];
  } else {
    staffList = await Staff.find({
      salonId,
      isActive: true,
      services: serviceId,
    });
  }

  if (staffList.length === 0) {
    return { slots: [] };
  }

  // 6. Fetch existing appointments for the date (exclude cancelled / no-show)
  const dayStart = new Date(targetDate);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(targetDate);
  dayEnd.setHours(23, 59, 59, 999);

  const staffIds = staffList.map((s) => s._id);
  const existingAppointments = await Appointment.find({
    salonId,
    date: { $gte: dayStart, $lte: dayEnd },
    staffId: { $in: staffIds },
    status: { $nin: ['cancelled', 'no-show'] },
  });

  // Group appointments by staffId for quick lookup
  const apptsByStaff = {};
  for (const appt of existingAppointments) {
    const sid = appt.staffId.toString();
    if (!apptsByStaff[sid]) apptsByStaff[sid] = [];
    apptsByStaff[sid].push(appt);
  }

  // 7. Per-staff slot generation
  const { slotDuration, bufferTime = 0 } = salon;
  const serviceDuration = service.duration;
  const slots = [];

  for (const staff of staffList) {
    const staffDay = staff.workingHours.find((wh) => wh.day === dayName);
    if (!staffDay || !staffDay.isAvailable) continue;

    const windowStart = Math.max(salonOpen, timeToMinutes(staffDay.startTime));
    const windowEnd = Math.min(salonClose, timeToMinutes(staffDay.endTime));

    const staffAppts = apptsByStaff[staff._id.toString()] || [];

    // Walk in slotDuration increments
    for (let t = windowStart; t + serviceDuration <= windowEnd; t += slotDuration) {
      const candidateStart = t;
      const candidateEnd = t + serviceDuration;

      // Check overlap with existing appointments (+ buffer after each)
      const hasConflict = staffAppts.some((appt) => {
        const apptStart = timeToMinutes(appt.startTime);
        const apptEnd = timeToMinutes(appt.endTime) + bufferTime;
        // Overlap if candidate starts before appt+buffer ends AND candidate ends after appt starts
        return candidateStart < apptEnd && candidateEnd > apptStart;
      });

      if (!hasConflict) {
        slots.push({
          startTime: minutesToTime(candidateStart),
          endTime: minutesToTime(candidateEnd),
          staffId: staff._id,
          staffName: staff.name,
        });
      }
    }
  }

  // 8. Sort by startTime, then staffName
  slots.sort((a, b) => {
    const timeDiff = timeToMinutes(a.startTime) - timeToMinutes(b.startTime);
    if (timeDiff !== 0) return timeDiff;
    return a.staffName.localeCompare(b.staffName);
  });

  return { slots };
}

module.exports = { getAvailableSlots, timeToMinutes, minutesToTime };
