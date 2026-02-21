const crypto = require('crypto');
const logger = require('./logger');
const { OTP } = require('../config/constants');

const generateOtp = () => {
  const otp = crypto.randomInt(100000, 999999).toString();
  return otp;
};

const hashOtp = (otp) => {
  return crypto.createHash('sha256').update(otp).digest('hex');
};

// Stubbed for Phase 1 - swap body with MSG91/Twilio in production
const sendOtp = async (phone, otp) => {
  logger.info(`[OTP STUB] Sending OTP ${otp} to ${phone}`);
  // In production, replace with:
  // await msg91.sendOtp({ phone, otp });
  return true;
};

const getOtpExpiry = () => {
  return new Date(Date.now() + OTP.expiryMinutes * 60 * 1000);
};

module.exports = { generateOtp, hashOtp, sendOtp, getOtpExpiry };
