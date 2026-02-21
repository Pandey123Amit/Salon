const crypto = require('crypto');
const { Salon } = require('../models');
const { encryptToken } = require('../services/whatsapp-crypto.service');
const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const env = require('../config/env');

/**
 * POST /api/salon/whatsapp/connect
 * Connect a WhatsApp Business account to the salon.
 */
const connectWhatsApp = asyncHandler(async (req, res) => {
  const { phoneNumberId, accessToken } = req.body;
  const salonId = req.salon._id;

  if (!env.whatsappEncryptionKey) {
    throw ApiError.internal('WhatsApp encryption key not configured on server');
  }

  // Check if this phoneNumberId is already used by another salon
  const existingSalon = await Salon.findOne({
    'whatsapp.phoneNumberId': phoneNumberId,
    _id: { $ne: salonId },
  });

  if (existingSalon) {
    throw ApiError.badRequest('This WhatsApp phone number is already connected to another salon');
  }

  const encryptedToken = encryptToken(accessToken);
  const verifyToken = crypto.randomBytes(16).toString('hex');

  await Salon.findByIdAndUpdate(salonId, {
    $set: {
      'whatsapp.phoneNumberId': phoneNumberId,
      'whatsapp.accessToken': encryptedToken,
      'whatsapp.verifyToken': verifyToken,
      'whatsapp.isConnected': true,
      'whatsapp.connectedAt': new Date(),
    },
  });

  const webhookUrl = env.baseUrl ? `${env.baseUrl}/webhook` : null;

  res.json(
    ApiResponse.success('WhatsApp connected successfully', {
      phoneNumberId,
      isConnected: true,
      connectedAt: new Date(),
      webhookUrl,
      verifyToken: env.whatsappVerifyToken,
    })
  );
});

/**
 * DELETE /api/salon/whatsapp/disconnect
 * Disconnect WhatsApp from the salon.
 */
const disconnectWhatsApp = asyncHandler(async (req, res) => {
  const salonId = req.salon._id;

  await Salon.findByIdAndUpdate(salonId, {
    $set: {
      'whatsapp.isConnected': false,
    },
    $unset: {
      'whatsapp.accessToken': '',
      'whatsapp.verifyToken': '',
      'whatsapp.phoneNumberId': '',
      'whatsapp.connectedAt': '',
    },
  });

  res.json(ApiResponse.success('WhatsApp disconnected successfully'));
});

/**
 * GET /api/salon/whatsapp/status
 * Check WhatsApp connection status.
 */
const getWhatsAppStatus = asyncHandler(async (req, res) => {
  const salon = await Salon.findById(req.salon._id).select('whatsapp');

  const whatsapp = salon.whatsapp || {};

  res.json(
    ApiResponse.success('WhatsApp status', {
      isConnected: whatsapp.isConnected || false,
      phoneNumberId: whatsapp.phoneNumberId || null,
      connectedAt: whatsapp.connectedAt || null,
    })
  );
});

module.exports = { connectWhatsApp, disconnectWhatsApp, getWhatsAppStatus };
