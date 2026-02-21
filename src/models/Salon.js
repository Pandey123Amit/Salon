const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { DAYS_OF_WEEK, SLOT_DURATIONS } = require('../config/constants');

const workingHourSchema = new mongoose.Schema(
  {
    day: { type: String, enum: DAYS_OF_WEEK, required: true },
    isOpen: { type: Boolean, default: true },
    openTime: { type: String, default: '09:00' },  // HH:mm format
    closeTime: { type: String, default: '21:00' },
  },
  { _id: false }
);

const salonSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Salon name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false,
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      unique: true,
      trim: true,
    },
    isPhoneVerified: {
      type: Boolean,
      default: false,
    },
    otp: { type: String, select: false },
    otpExpiry: { type: Date, select: false },

    // Salon details
    address: {
      street: { type: String, trim: true },
      city: { type: String, trim: true },
      state: { type: String, trim: true },
      pincode: { type: String, trim: true },
    },
    gstNumber: { type: String, trim: true },
    description: { type: String, maxlength: 500 },
    gender: {
      type: String,
      enum: ['male', 'female', 'unisex'],
      default: 'unisex',
    },

    // Schedule
    workingHours: {
      type: [workingHourSchema],
      default: () =>
        DAYS_OF_WEEK.map((day) => ({
          day,
          isOpen: day !== 'sunday',
          openTime: '09:00',
          closeTime: '21:00',
        })),
    },

    // Settings
    slotDuration: {
      type: Number,
      enum: SLOT_DURATIONS,
      default: 30,
    },
    bufferTime: {
      type: Number,
      default: 0,
      min: 0,
      max: 60,
    },
    holidays: [{ type: Date }],

    isActive: { type: Boolean, default: true },

    // WhatsApp Business integration
    whatsapp: {
      phoneNumberId: { type: String },
      accessToken: { type: String, select: false },
      verifyToken: { type: String, select: false },
      isConnected: { type: Boolean, default: false },
      connectedAt: { type: Date },
    },
  },
  {
    timestamps: true,
  }
);

// Sparse unique index — only salons with a phoneNumberId get indexed
salonSchema.index({ 'whatsapp.phoneNumberId': 1 }, { unique: true, sparse: true });

// Hash password before save
salonSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password
salonSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Generate JWT
salonSchema.methods.generateToken = function () {
  return jwt.sign({ id: this._id }, env.jwtSecret, {
    expiresIn: env.jwtExpire,
  });
};

// Strip sensitive fields from JSON
salonSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.otp;
  delete obj.otpExpiry;
  delete obj.__v;
  if (obj.whatsapp) {
    delete obj.whatsapp.accessToken;
    delete obj.whatsapp.verifyToken;
  }
  return obj;
};

module.exports = mongoose.model('Salon', salonSchema);
