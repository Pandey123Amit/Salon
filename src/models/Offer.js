const mongoose = require('mongoose');

const offerSchema = new mongoose.Schema(
  {
    salonId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Salon',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Offer title is required'],
      trim: true,
      maxlength: 100,
    },
    description: {
      type: String,
      maxlength: 500,
    },
    discountType: {
      type: String,
      enum: ['percentage', 'flat'],
      required: true,
    },
    discountValue: {
      type: Number,
      required: true,
      min: 0,
    },
    applicableServices: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Service',
      },
    ],
    minOrderValue: { type: Number, default: 0 },
    validFrom: { type: Date, required: true },
    validTo: { type: Date, required: true },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  }
);

offerSchema.index({ salonId: 1, isActive: 1, validTo: 1 });

module.exports = mongoose.model('Offer', offerSchema);
