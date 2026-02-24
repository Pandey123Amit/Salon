require('dotenv').config();
const mongoose = require('mongoose');
const Salon = require('../src/models/Salon');
const Staff = require('../src/models/Staff');
const Service = require('../src/models/Service');

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);

  const salon = await Salon.findOne({ phone: '8986605695' });
  console.log('Salon:', salon.name, '(ID:', salon._id, ')');

  // Update existing services to be more realistic
  await Service.deleteMany({ salonId: salon._id });

  const services = await Service.insertMany([
    { salonId: salon._id, name: 'Haircut (Men)', category: 'Hair', price: 200, duration: 30, isActive: true },
    { salonId: salon._id, name: 'Hair Color', category: 'Hair', price: 800, duration: 60, isActive: true },
    { salonId: salon._id, name: 'Beard Trim', category: 'Beard', price: 100, duration: 15, isActive: true },
    { salonId: salon._id, name: 'Facial', category: 'Skin', price: 500, duration: 45, isActive: true },
    { salonId: salon._id, name: 'Head Massage', category: 'Spa', price: 300, duration: 30, isActive: true },
  ]);
  console.log('\nCreated', services.length, 'services');
  services.forEach(s => console.log('  -', s.name, '(ID:', s._id, ')'));

  // Create staff member
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const schedule = days.map(day => ({
    day,
    startTime: '09:00',
    endTime: '21:00',
    isOff: day === 'sunday',
  }));

  const staff = await Staff.create({
    salonId: salon._id,
    name: 'Amit',
    phone: '8986605695',
    role: 'stylist',
    services: services.map(s => s._id),
    schedule,
    isActive: true,
  });
  console.log('\nCreated staff:', staff.name, '(ID:', staff._id, ')');
  console.log('  Assigned to all', services.length, 'services');
  console.log('  Schedule: Mon-Sat 09:00-21:00, Sun OFF');

  console.log('\n✅ Test data ready! Chatbot can now book appointments.');
  await mongoose.disconnect();
})();
