require('dotenv').config();
const mongoose = require('mongoose');
const Salon = require('../src/models/Salon');
const Staff = require('../src/models/Staff');
const Service = require('../src/models/Service');

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);

  const salon = await Salon.findOne({ phone: '8986605695' });
  const staff = await Staff.find({ salonId: salon._id });
  const services = await Service.find({ salonId: salon._id });

  console.log('Salon:', salon.name, '(ID:', salon._id, ')');
  console.log('Working Hours:');
  if (salon.workingHours) {
    salon.workingHours.forEach(wh => console.log('  ', wh.day, wh.isOpen ? `${wh.openTime}-${wh.closeTime}` : 'CLOSED'));
  } else if (salon.businessHours) {
    Object.entries(salon.businessHours.toObject()).forEach(([day, h]) => {
      if (h && typeof h === 'object') console.log('  ', day, h.isClosed ? 'CLOSED' : `${h.open}-${h.close}`);
    });
  }

  console.log('\nServices:', services.length);
  services.forEach(s => console.log('  -', s.name, '| ₹' + s.price, '|', s.duration + 'min', '| active:', s.isActive));

  console.log('\nStaff:', staff.length);
  staff.forEach(s => {
    console.log('  -', s.name, '| active:', s.isActive);
    console.log('    services:', s.services?.map(id => id.toString()));
    console.log('    schedule entries:', s.schedule?.length || 0);
    if (s.schedule?.length > 0) {
      s.schedule.slice(0, 3).forEach(sch => console.log('     ', sch.day, sch.isOff ? 'OFF' : `${sch.startTime}-${sch.endTime}`));
    }
  });

  await mongoose.disconnect();
})();
