const mongoose = require('mongoose');
const { DAYS_OF_WEEK } = require('../config/constants');

const staffWorkingHourSchema = new mongoose.Schema(
  {
    day: { type: String, enum: DAYS_OF_WEEK, required: true },
    isAvailable: { type: Boolean, default: true },
    startTime: { type: String, default: '09:00' },
    endTime: { type: String, default: '21:00' },
  },
  { _id: false }
);

const staffSchema = new mongoose.Schema(
  {
    salonId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Salon',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Staff name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    phone: {
      type: String,
      trim: true,
    },
    role: {
      type: String,
      trim: true,
      default: 'Stylist',
    },
    services: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Service',
      },
    ],
    workingHours: {
      type: [staffWorkingHourSchema],
      default: () =>
        DAYS_OF_WEEK.map((day) => ({
          day,
          isAvailable: day !== 'sunday',
          startTime: '09:00',
          endTime: '21:00',
        })),
    },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  }
);

staffSchema.index({ salonId: 1, isActive: 1 });

module.exports = mongoose.model('Staff', staffSchema);
