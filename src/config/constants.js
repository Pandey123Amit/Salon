const SERVICE_CATEGORIES = [
  'Hair',
  'Skin',
  'Nails',
  'Makeup',
  'Spa',
  'Beard',
  'Bridal',
  'Other',
];

const APPOINTMENT_STATUSES = [
  'pending',
  'confirmed',
  'in-progress',
  'completed',
  'cancelled',
  'no-show',
];

const DAYS_OF_WEEK = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

const GENDER_OPTIONS = ['male', 'female', 'unisex'];

const REGEX = {
  phone: /^[6-9]\d{9}$/,         // Indian mobile numbers
  pincode: /^\d{6}$/,             // Indian PIN codes
  gst: /^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}[Z]{1}[A-Z\d]{1}$/, // GST number
};

const OTP = {
  length: 6,
  expiryMinutes: 10,
};

const SLOT_DURATIONS = [15, 30, 45, 60];

const CONVERSATION_STATES = [
  'greeting',
  'intent_detection',
  'service_selection',
  'date_selection',
  'slot_selection',
  'confirmation',
  'booking_complete',
  'cancellation',
  'faq',
  'human_handoff',
];

const CHAT_CONFIG = {
  maxToolCallIterations: 5,
  maxMessagesInContext: 20,
  sessionTimeoutMinutes: 30,
};

const PAYMENT_STATUSES = [
  'pending',
  'paid',
  'failed',
  'refunded',
  'partially_refunded',
];

const APPOINTMENT_PAYMENT_STATUSES = [
  'pending',
  'paid',
  'failed',
  'refunded',
  'partially_refunded',
];

const PAYMENT_MODES = ['optional', 'required'];

const DEFAULT_REMINDER_SCHEDULE = [
  { label: '24 hours before', minutesBefore: 1440 },
  { label: '2 hours before', minutesBefore: 120 },
];

const CRON_SCHEDULES = {
  reminders: '*/5 * * * *',   // every 5 minutes
  noShow: '*/15 * * * *',     // every 15 minutes
  cleanup: '0 3 * * *',       // daily at 3am
};

module.exports = {
  SERVICE_CATEGORIES,
  APPOINTMENT_STATUSES,
  DAYS_OF_WEEK,
  GENDER_OPTIONS,
  REGEX,
  OTP,
  SLOT_DURATIONS,
  CONVERSATION_STATES,
  CHAT_CONFIG,
  PAYMENT_STATUSES,
  APPOINTMENT_PAYMENT_STATUSES,
  PAYMENT_MODES,
  DEFAULT_REMINDER_SCHEDULE,
  CRON_SCHEDULES,
};
