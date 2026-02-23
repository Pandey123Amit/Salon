const mongoose = require('mongoose');
const { PAYMENT_STATUSES } = require('../config/constants');

const paymentSchema = new mongoose.Schema(
  {
    salonId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Salon',
      required: true,
      index: true,
    },
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
      required: true,
      index: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
    },
    razorpayOrderId: { type: String, index: true },
    razorpayPaymentId: { type: String },
    razorpayPaymentLinkId: { type: String, index: true },
    razorpaySignature: { type: String },
    amount: { type: Number, required: true },  // paise
    currency: { type: String, default: 'INR' },
    status: {
      type: String,
      enum: PAYMENT_STATUSES,
      default: 'pending',
    },
    method: { type: String },  // card, upi, netbanking, etc.
    paymentLinkUrl: { type: String },
    paidAt: { type: Date },
    webhookEvents: [
      {
        event: { type: String },
        receivedAt: { type: Date, default: Date.now },
        payload: { type: mongoose.Schema.Types.Mixed },
        _id: false,
      },
    ],
    notes: { type: String },
  },
  {
    timestamps: true,
  }
);

paymentSchema.index({ salonId: 1, createdAt: -1 });

module.exports = mongoose.model('Payment', paymentSchema);
