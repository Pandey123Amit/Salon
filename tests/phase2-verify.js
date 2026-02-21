/**
 * Phase 2 Verification Script
 *
 * Tests all 10 scenarios from the plan against a live server + MongoDB.
 * Usage: node tests/phase2-verify.js
 *
 * Requires: MongoDB running on localhost:27017, no running server on port 5555.
 */

const BASE = 'http://localhost:5555/api';
let salonAToken, salonBToken;
let salonAId, salonBId;
let serviceHairId, serviceSkinId, staffAId, staffBId;
let customerAId, customerBId, customerOldId;
let appointmentId;

// ── Helpers ──────────────────────────────────────────────────────────
let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) {
    passed++;
    console.log(`  ✅ ${label}`);
  } else {
    failed++;
    console.log(`  ❌ ${label}`);
  }
}

async function api(method, path, body = null, token = null) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (token) opts.headers['Authorization'] = `Bearer ${token}`;
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(`${BASE}${path}`, opts);
  const json = await res.json();
  const result = { status: res.status, ...json };
  if (!result.success && result.status >= 400) {
    console.log(`    [DEBUG] ${method} ${path} → ${res.status}: ${result.message || JSON.stringify(result)}`);
  }
  return result;
}

// ── Seed data ────────────────────────────────────────────────────────
async function seed() {
  console.log('\n📦 Seeding test data...\n');

  // Register Salon A
  let res = await api('POST', '/auth/register', {
    name: 'Salon Alpha',
    email: 'alpha@test.com',
    password: 'password123',
    phone: '9000000001',
  });
  salonAToken = res.data.token;
  salonAId = res.data.salon._id;

  // Register Salon B
  res = await api('POST', '/auth/register', {
    name: 'Salon Beta',
    email: 'beta@test.com',
    password: 'password123',
    phone: '9000000002',
  });
  salonBToken = res.data.token;
  salonBId = res.data.salon._id;

  // Salon A: set working hours (closed Sunday) + settings
  const workingHours = [
    'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday',
  ].map((day) => ({ day, isOpen: true, openTime: '09:00', closeTime: '21:00' }));
  workingHours.push({ day: 'sunday', isOpen: false, openTime: '09:00', closeTime: '21:00' });

  await api('PUT', '/salon/working-hours', { workingHours }, salonAToken);
  await api('PUT', '/salon/settings', { slotDuration: 30, bufferTime: 0 }, salonAToken);

  // Services for Salon A
  res = await api('POST', '/services', {
    name: 'Haircut', category: 'Hair', duration: 30, price: 500,
  }, salonAToken);
  serviceHairId = res.data.service._id;

  res = await api('POST', '/services', {
    name: 'Facial', category: 'Skin', duration: 45, price: 800,
  }, salonAToken);
  serviceSkinId = res.data.service._id;

  // Staff for Salon A
  res = await api('POST', '/staff', {
    name: 'Staff A (Hair)',
    services: [serviceHairId],
    workingHours: [
      'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday',
    ].map((day) => ({ day, isAvailable: true, startTime: '09:00', endTime: '21:00' }))
      .concat([{ day: 'sunday', isAvailable: false, startTime: '09:00', endTime: '21:00' }]),
  }, salonAToken);
  staffAId = res.data.staff._id;

  res = await api('POST', '/staff', {
    name: 'Staff B (Skin)',
    services: [serviceSkinId],
    workingHours: [
      'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday',
    ].map((day) => ({ day, isAvailable: true, startTime: '09:00', endTime: '21:00' }))
      .concat([{ day: 'sunday', isAvailable: false, startTime: '09:00', endTime: '21:00' }]),
  }, salonAToken);
  staffBId = res.data.staff._id;

  // Customers for Salon A (direct DB creation via API isn't in Phase 2, so use DB)
  const mongoose = require('mongoose');
  const Customer = require('../src/models/Customer');
  await mongoose.connect('mongodb://localhost:27017/salonbot_phase2_test');

  const custA = await Customer.create({ salonId: salonAId, name: 'Ravi', phone: '9111111111' });
  customerAId = custA._id.toString();

  const custB = await Customer.create({ salonId: salonBId, name: 'Priya', phone: '9222222222' });
  customerBId = custB._id.toString();

  // Customer with old lastVisit (45 days ago)
  const fortyFiveDaysAgo = new Date();
  fortyFiveDaysAgo.setDate(fortyFiveDaysAgo.getDate() - 45);
  const custOld = await Customer.create({
    salonId: salonAId, name: 'OldTimer', phone: '9333333333',
    lastVisit: fortyFiveDaysAgo, totalVisits: 5,
  });
  customerOldId = custOld._id.toString();

  // Customer with recent lastVisit (5 days ago)
  const fiveDaysAgo = new Date();
  fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
  await Customer.create({
    salonId: salonAId, name: 'RecentGuy', phone: '9444444444',
    lastVisit: fiveDaysAgo, totalVisits: 2,
  });

  await mongoose.disconnect();

  console.log('  Salon A + B registered, services, staff, customers created.\n');
}

// ── Helper: get next weekday date (Mon-Sat) ──────────────────────────
function getNextWeekday() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  while (d.getDay() === 0) d.setDate(d.getDate() + 1); // skip Sunday
  return d.toISOString().split('T')[0];
}

function getNextSunday() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  while (d.getDay() !== 0) d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
}

// ── Tests ────────────────────────────────────────────────────────────

async function test1_slotCalculation() {
  console.log('Test 1: Slot calculation');
  const date = getNextWeekday();
  const res = await api('GET', `/appointments/slots?date=${date}&serviceId=${serviceHairId}`, null, salonAToken);
  assert(res.success === true, 'Response is successful');
  assert(Array.isArray(res.data.slots), 'Slots is an array');
  assert(res.data.slots.length > 0, `Has slots (got ${res.data.slots.length})`);
  assert(res.data.slots[0].startTime === '09:00', `First slot starts at 09:00 (got ${res.data.slots[0].startTime})`);
  assert(res.data.slots[0].staffName === 'Staff A (Hair)', `Staff name is correct`);
  // 30-min slots from 09:00 to 21:00 with 30-min duration = 24 slots
  assert(res.data.slots.length === 24, `24 slots for 30-min haircut in 09:00-21:00 (got ${res.data.slots.length})`);
}

async function test2_slotBlocking() {
  console.log('\nTest 2: Slot blocking after booking');
  const date = getNextWeekday();

  // Book at 10:00
  const createRes = await api('POST', '/appointments', {
    customerId: customerAId,
    serviceId: serviceHairId,
    staffId: staffAId,
    date,
    startTime: '10:00',
  }, salonAToken);
  assert(createRes.status === 201, `Appointment created (status ${createRes.status})`);
  appointmentId = createRes.data.appointment._id;

  // Check slots — 10:00 should be gone
  const slotsRes = await api('GET', `/appointments/slots?date=${date}&serviceId=${serviceHairId}`, null, salonAToken);
  const slotTimes = slotsRes.data.slots.map((s) => s.startTime);
  assert(!slotTimes.includes('10:00'), '10:00 slot is no longer available');
  assert(slotTimes.includes('09:00'), '09:00 is still available');
  assert(slotTimes.includes('10:30'), '10:30 is still available (no buffer)');
}

async function test3_bufferTime() {
  console.log('\nTest 3: Buffer time enforcement');
  const date = getNextWeekday();

  // Set bufferTime to 15 min
  await api('PUT', '/salon/settings', { bufferTime: 15 }, salonAToken);

  // Slots after existing 10:00-10:30 appointment: next should be 10:45, not 10:30
  const res = await api('GET', `/appointments/slots?date=${date}&serviceId=${serviceHairId}`, null, salonAToken);
  const slotTimes = res.data.slots.map((s) => s.startTime);
  assert(!slotTimes.includes('10:30'), '10:30 blocked by buffer (appt 10:00-10:30 + 15min buffer)');
  assert(slotTimes.includes('11:00'), '11:00 available (after buffer clears at 10:45, next slot at 11:00 with 30-min grid)');

  // Reset buffer
  await api('PUT', '/salon/settings', { bufferTime: 0 }, salonAToken);
}

async function test4_holiday() {
  console.log('\nTest 4: Holiday blocks all slots');
  const date = getNextWeekday();

  // Add date as holiday
  await api('PUT', '/salon/settings', { holidays: [date] }, salonAToken);

  const res = await api('GET', `/appointments/slots?date=${date}&serviceId=${serviceHairId}`, null, salonAToken);
  assert(res.data.slots.length === 0, `Holiday returns 0 slots (got ${res.data.slots.length})`);

  // Remove holiday
  await api('PUT', '/salon/settings', { holidays: [] }, salonAToken);
}

async function test5_closedDay() {
  console.log('\nTest 5: Closed day (Sunday) returns no slots');
  const sunday = getNextSunday();

  const res = await api('GET', `/appointments/slots?date=${sunday}&serviceId=${serviceHairId}`, null, salonAToken);
  assert(res.data.slots.length === 0, `Sunday returns 0 slots (got ${res.data.slots.length})`);
}

async function test6_staffFiltering() {
  console.log('\nTest 6: Staff filtering by service');
  const date = getNextWeekday();

  // Slots for Hair → only Staff A
  const hairRes = await api('GET', `/appointments/slots?date=${date}&serviceId=${serviceHairId}`, null, salonAToken);
  const hairStaff = [...new Set(hairRes.data.slots.map((s) => s.staffName))];
  assert(hairStaff.length === 1, `Hair service: 1 staff member (got ${hairStaff.length})`);
  assert(hairStaff[0] === 'Staff A (Hair)', `Hair service staff is Staff A`);

  // Slots for Skin → only Staff B
  const skinRes = await api('GET', `/appointments/slots?date=${date}&serviceId=${serviceSkinId}`, null, salonAToken);
  const skinStaff = [...new Set(skinRes.data.slots.map((s) => s.staffName))];
  assert(skinStaff.length === 1, `Skin service: 1 staff member (got ${skinStaff.length})`);
  assert(skinStaff[0] === 'Staff B (Skin)', `Skin service staff is Staff B`);
}

async function test7_appointmentCRUD() {
  console.log('\nTest 7: Appointment CRUD + customer stats on completion');

  // List
  const date = getNextWeekday();
  let res = await api('GET', `/appointments?date=${date}`, null, salonAToken);
  assert(res.success === true, 'List appointments succeeds');
  assert(res.data.appointments.length >= 1, `Has appointments (got ${res.data.appointments.length})`);

  // Today endpoint
  res = await api('GET', '/appointments/today', null, salonAToken);
  assert(res.success === true, 'Today appointments succeeds');

  // Update: pending → confirmed
  res = await api('PUT', `/appointments/${appointmentId}`, { status: 'confirmed' }, salonAToken);
  assert(res.status === 200, 'Confirmed appointment');
  assert(res.data.appointment.status === 'confirmed', `Status is confirmed`);

  // Update: confirmed → in-progress
  res = await api('PUT', `/appointments/${appointmentId}`, { status: 'in-progress' }, salonAToken);
  assert(res.data.appointment.status === 'in-progress', `Status is in-progress`);

  // Get customer totalVisits before completion
  res = await api('GET', `/customers/${customerAId}`, null, salonAToken);
  const visitsBefore = res.data.customer.totalVisits;

  // Update: in-progress → completed
  res = await api('PUT', `/appointments/${appointmentId}`, { status: 'completed' }, salonAToken);
  assert(res.data.appointment.status === 'completed', `Status is completed`);

  // Customer totalVisits should increment
  res = await api('GET', `/customers/${customerAId}`, null, salonAToken);
  assert(res.data.customer.totalVisits === visitsBefore + 1, `totalVisits incremented (${visitsBefore} → ${res.data.customer.totalVisits})`);
  assert(res.data.customer.lastVisit !== null, 'lastVisit is set');

  // Terminal state: completed → cancelled should fail
  res = await api('PUT', `/appointments/${appointmentId}`, { status: 'cancelled' }, salonAToken);
  assert(res.status === 400, `Cannot transition from completed (status ${res.status})`);
}

async function test8_crossTenant() {
  console.log('\nTest 8: Cross-tenant isolation');

  // Salon B tries to list Salon A's appointments
  let res = await api('GET', '/appointments', null, salonBToken);
  assert(res.data.appointments.length === 0, `Salon B sees 0 of Salon A's appointments`);

  // Salon B tries to get Salon A's customer
  res = await api('GET', `/customers/${customerAId}`, null, salonBToken);
  assert(res.status === 404, `Salon B cannot see Salon A's customer (status ${res.status})`);

  // Salon B tries to list customers — should not see Salon A's customers
  res = await api('GET', '/customers', null, salonBToken);
  const names = res.data.customers.map((c) => c.name);
  assert(!names.includes('Ravi'), 'Salon B list does not include Salon A customer Ravi');
}

async function test9_dueRevisit() {
  console.log('\nTest 9: Customer due-revisit');

  const res = await api('GET', '/customers/due-revisit', null, salonAToken);
  const names = res.data.customers.map((c) => c.name);
  assert(names.includes('OldTimer'), 'OldTimer (45 days ago) appears in due-revisit');
  assert(!names.includes('RecentGuy'), 'RecentGuy (5 days ago) does NOT appear in due-revisit');
}

async function test10_doubleBooking() {
  console.log('\nTest 10: Double-booking prevention');
  const date = getNextWeekday();

  // Book a new appointment at 11:00
  let res = await api('POST', '/appointments', {
    customerId: customerAId,
    serviceId: serviceHairId,
    staffId: staffAId,
    date,
    startTime: '11:00',
  }, salonAToken);
  assert(res.status === 201, 'First booking at 11:00 succeeds');

  // Try to book the exact same slot again
  res = await api('POST', '/appointments', {
    customerId: customerAId,
    serviceId: serviceHairId,
    staffId: staffAId,
    date,
    startTime: '11:00',
  }, salonAToken);
  assert(res.status === 400, `Double-booking rejected (status ${res.status})`);
  assert(res.message.toLowerCase().includes('not available'), `Error message mentions not available`);
}

// ── Runner ───────────────────────────────────────────────────────────
async function run() {
  try {
    await seed();
    await test1_slotCalculation();
    await test2_slotBlocking();
    await test3_bufferTime();
    await test4_holiday();
    await test5_closedDay();
    await test6_staffFiltering();
    await test7_appointmentCRUD();
    await test8_crossTenant();
    await test9_dueRevisit();
    await test10_doubleBooking();
  } catch (err) {
    console.error('\n💥 Unexpected error:', err.message);
    console.error(err.stack);
  }

  console.log(`\n${'═'.repeat(50)}`);
  console.log(`  Results: ${passed} passed, ${failed} failed`);
  console.log(`${'═'.repeat(50)}\n`);

  process.exit(failed > 0 ? 1 : 0);
}

run();
