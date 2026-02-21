const mongoose = require('mongoose');
const { SERVICE_CATEGORIES, GENDER_OPTIONS } = require('../config/constants');

const serviceSchema = new mongoose.Schema(
  {
    salonId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Salon',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Service name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    category: {
      type: String,
      enum: SERVICE_CATEGORIES,
      required: [true, 'Category is required'],
    },
    duration: {
      type: Number,
      required: [true, 'Duration is required'],
      min: [5, 'Duration must be at least 5 minutes'],
      max: [480, 'Duration cannot exceed 8 hours'],
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price cannot be negative'],
    },
    description: {
      type: String,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    gender: {
      type: String,
      enum: GENDER_OPTIONS,
      default: 'unisex',
    },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient queries
serviceSchema.index({ salonId: 1, isActive: 1 });

module.exports = mongoose.model('Service', serviceSchema);
