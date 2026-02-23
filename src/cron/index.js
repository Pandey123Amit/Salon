const cron = require('node-cron');
const { CRON_SCHEDULES } = require('../config/constants');
const { processReminders } = require('../services/reminder.service');
const { processNoShows } = require('../services/noshow.service');
const { runCleanup } = require('../services/cleanup.service');
const logger = require('../utils/logger');

/**
 * Register all cron jobs.
 * Call this after DB connection is established.
 */
function startCronJobs() {
  // Appointment reminders — every 5 minutes
  cron.schedule(CRON_SCHEDULES.reminders, async () => {
    try {
      await processReminders();
    } catch (err) {
      logger.error('Reminder cron error', { error: err.message, stack: err.stack });
    }
  });

  // Auto no-show marking — every 15 minutes
  cron.schedule(CRON_SCHEDULES.noShow, async () => {
    try {
      await processNoShows();
    } catch (err) {
      logger.error('No-show cron error', { error: err.message, stack: err.stack });
    }
  });

  // Data cleanup — daily at 3am
  cron.schedule(CRON_SCHEDULES.cleanup, async () => {
    try {
      await runCleanup();
    } catch (err) {
      logger.error('Cleanup cron error', { error: err.message, stack: err.stack });
    }
  });

  logger.info('Cron jobs registered', {
    reminders: CRON_SCHEDULES.reminders,
    noShow: CRON_SCHEDULES.noShow,
    cleanup: CRON_SCHEDULES.cleanup,
  });
}

module.exports = { startCronJobs };
