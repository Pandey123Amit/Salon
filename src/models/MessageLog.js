const mongoose = require('mongoose');

const messageLogSchema = new mongoose.Schema(
  {
    salonId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Salon',
      required: true,
    },
    wamid: {
      type: String,
      unique: true,
      sparse: true,
    },
    direction: {
      type: String,
      enum: ['inbound', 'outbound'],
      required: true,
    },
    customerPhone: {
      type: String,
      required: true,
    },
    messageType: {
      type: String,
      default: 'text',
    },
    content: {
      type: String,
    },
    status: {
      type: String,
      enum: ['sent', 'delivered', 'read', 'failed'],
      default: 'sent',
    },
    statusTimestamp: { type: Date },
    errorCode: { type: Number },
    errorMessage: { type: String },
    conversationId: { type: String },
    metadata: { type: mongoose.Schema.Types.Mixed },
  },
  {
    timestamps: true,
  }
);

messageLogSchema.index({ salonId: 1, customerPhone: 1, createdAt: -1 });
messageLogSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('MessageLog', messageLogSchema);
