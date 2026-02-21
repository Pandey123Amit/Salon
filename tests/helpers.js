const { Salon, Service, Staff, Customer, Appointment, Offer, Conversation } = require('../src/models');
const { DAYS_OF_WEEK } = require('../src/config/constants');

// ─── Default Test Data ────────────────────────────────────────────

const defaultSalonData = {
  name: 'Test Salon',
  email: 'test@salon.com',
  password: 'password123',
  phone: '9876543210',
  address: {
    street: '12 MG Road',
    city: 'Bangalore',
    state: 'Karnataka',
    pincode: '560001',
  },
  workingHours: DAYS_OF_WEEK.map((day) => ({
    day,
    isOpen: day !== 'sunday',
    openTime: '09:00',
    closeTime: '21:00',
  })),
  slotDuration: 30,
  bufferTime: 0,
};

const defaultServiceData = {
  name: 'Haircut',
  category: 'Hair',
  duration: 30,
  price: 200,
  description: 'Basic haircut',
  gender: 'unisex',
};

const defaultStaffData = {
  name: 'Ravi',
  phone: '9876543211',
  role: 'Stylist',
  workingHours: DAYS_OF_WEEK.map((day) => ({
    day,
    isAvailable: day !== 'sunday',
    startTime: '09:00',
    endTime: '21:00',
  })),
};

const defaultCustomerData = {
  name: 'Rahul Kumar',
  phone: '9123456789',
  gender: 'male',
};

// ─── Factory Functions ────────────────────────────────────────────

/**
 * Create a salon and return { salon, token }
 */
async function createSalonAndToken(overrides = {}) {
  const data = { ...defaultSalonData, ...overrides };
  const salon = await Salon.create(data);
  const token = salon.generateToken();
  return { salon, token };
}

/**
 * Create a second salon for cross-tenant tests
 */
async function createSecondSalon() {
  return createSalonAndToken({
    name: 'Other Salon',
    email: 'other@salon.com',
    phone: '9876543299',
  });
}

/**
 * Create a service belonging to a salon
 */
async function createService(salonId, overrides = {}) {
  return Service.create({ ...defaultServiceData, salonId, ...overrides });
}

/**
 * Create a staff member belonging to a salon
 */
async function createStaff(salonId, serviceIds = [], overrides = {}) {
  return Staff.create({
    ...defaultStaffData,
    salonId,
    services: serviceIds,
    ...overrides,
  });
}

/**
 * Create a customer belonging to a salon
 */
async function createCustomer(salonId, overrides = {}) {
  return Customer.create({ ...defaultCustomerData, salonId, ...overrides });
}

/**
 * Create an offer for a salon
 */
async function createOffer(salonId, overrides = {}) {
  const now = new Date();
  const nextMonth = new Date(now);
  nextMonth.setMonth(nextMonth.getMonth() + 1);

  return Offer.create({
    salonId,
    title: 'Summer Special',
    description: '20% off on all services',
    discountType: 'percentage',
    discountValue: 20,
    validFrom: now,
    validTo: nextMonth,
    isActive: true,
    ...overrides,
  });
}

/**
 * Create a full test environment: salon + service + staff + customer
 */
async function createFullSetup() {
  const { salon, token } = await createSalonAndToken();
  const service = await createService(salon._id);
  const staff = await createStaff(salon._id, [service._id]);
  const customer = await createCustomer(salon._id);
  return { salon, token, service, staff, customer };
}

/**
 * Get the next weekday date string (YYYY-MM-DD) that is NOT Sunday.
 */
function getNextWeekday() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  // Skip to Monday if Sunday
  while (date.getDay() === 0) {
    date.setDate(date.getDate() + 1);
  }
  return date.toISOString().split('T')[0];
}

/**
 * Auth header helper
 */
function authHeader(token) {
  return { Authorization: `Bearer ${token}` };
}

module.exports = {
  defaultSalonData,
  defaultServiceData,
  defaultStaffData,
  defaultCustomerData,
  createSalonAndToken,
  createSecondSalon,
  createService,
  createStaff,
  createCustomer,
  createOffer,
  createFullSetup,
  getNextWeekday,
  authHeader,
};
