const mongoose = require('mongoose');
const { APPOINTMENT_STATUSES, APPOINTMENT_PAYMENT_STATUSES } = require('../config/constants');

const appointmentSchema = new mongoose.Schema(
  {
    salonId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Salon',
      required: true,
      index: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
    },
    staffId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Staff',
    },
    serviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Service',
      required: true,
    },
    date: { type: Date, required: true },
    startTime: { type: String, required: true },  // HH:mm
    endTime: { type: String, required: true },
    duration: { type: Number, required: true },
    price: { type: Number, required: true },
    status: {
      type: String,
      enum: APPOINTMENT_STATUSES,
      default: 'pending',
    },
    notes: { type: String, maxlength: 500 },
    cancelReason: { type: String },
    bookedVia: {
      type: String,
      enum: ['whatsapp', 'dashboard', 'walkin'],
      default: 'whatsapp',
    },
    payment: {
      status: {
        type: String,
        enum: APPOINTMENT_PAYMENT_STATUSES,
        default: 'pending',
      },
      razorpayOrderId: { type: String },
      razorpayPaymentId: { type: String },
      razorpayPaymentLinkId: { type: String },
      razorpayPaymentLinkUrl: { type: String },
      amount: { type: Number },  // paise
      paidAt: { type: Date },
    },
    remindersSent: [
      {
        minutesBefore: { type: Number, required: true },
        sentAt: { type: Date, default: Date.now },
        _id: false,
      },
    ],
  },
  {
    timestamps: true,
  }
);

appointmentSchema.index({ salonId: 1, date: 1, staffId: 1 });
appointmentSchema.index({ customerId: 1 });
appointmentSchema.index({ status: 1, date: 1 });

module.exports = mongoose.model('Appointment', appointmentSchema);
