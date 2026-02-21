const mongoose = require('mongoose');
const { CONVERSATION_STATES } = require('../config/constants');

const messageSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ['user', 'assistant', 'tool'],
      required: true,
    },
    content: { type: String },
    toolCallId: { type: String },
    toolCalls: { type: mongoose.Schema.Types.Mixed },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

const bookingContextSchema = new mongoose.Schema(
  {
    serviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Service' },
    serviceName: { type: String },
    date: { type: String },
    startTime: { type: String },
    staffId: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff' },
    staffName: { type: String },
    price: { type: Number },
    duration: { type: Number },
  },
  { _id: false }
);

const conversationSchema = new mongoose.Schema(
  {
    salonId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Salon',
      required: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
    },
    phone: {
      type: String,
      required: true,
    },
    state: {
      type: String,
      enum: CONVERSATION_STATES,
      default: 'greeting',
    },
    messages: [messageSchema],
    bookingContext: {
      type: bookingContextSchema,
      default: () => ({}),
    },
    lastActivityAt: {
      type: Date,
      default: Date.now,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    metadata: {
      totalTurns: { type: Number, default: 0 },
      bookingCompleted: { type: Boolean, default: false },
      handedOff: { type: Boolean, default: false },
    },
  },
  {
    timestamps: true,
  }
);

conversationSchema.index({ salonId: 1, phone: 1, isActive: 1 });
conversationSchema.index({ lastActivityAt: 1 });

module.exports = mongoose.model('Conversation', conversationSchema);
