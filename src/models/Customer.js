const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema(
  {
    salonId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Salon',
      required: true,
      index: true,
    },
    name: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'other'],
    },
    notes: { type: String, maxlength: 500 },
    totalVisits: { type: Number, default: 0 },
    lastVisit: { type: Date },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  }
);

// One customer per phone per salon
customerSchema.index({ salonId: 1, phone: 1 }, { unique: true });

module.exports = mongoose.model('Customer', customerSchema);
