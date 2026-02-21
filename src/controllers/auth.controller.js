const { Salon } = require('../models');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');
const { generateOtp, hashOtp, sendOtp, getOtpExpiry } = require('../utils/otp');

// @desc    Register salon
// @route   POST /api/auth/register
const register = asyncHandler(async (req, res) => {
  const { name, email, password, phone } = req.body;

  const existingSalon = await Salon.findOne({ $or: [{ email }, { phone }] });
  if (existingSalon) {
    throw ApiError.badRequest(
      existingSalon.email === email ? 'Email already registered' : 'Phone already registered'
    );
  }

  const salon = await Salon.create({ name, email, password, phone });

  // Generate and send OTP for phone verification
  const otp = generateOtp();
  salon.otp = hashOtp(otp);
  salon.otpExpiry = getOtpExpiry();
  await salon.save();

  await sendOtp(phone, otp);

  const token = salon.generateToken();

  res.status(201).json(
    ApiResponse.created('Salon registered. Please verify your phone number.', {
      token,
      salon,
    })
  );
});

// @desc    Login salon
// @route   POST /api/auth/login
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const salon = await Salon.findOne({ email }).select('+password');
  if (!salon) {
    throw ApiError.unauthorized('Invalid credentials');
  }

  const isMatch = await salon.comparePassword(password);
  if (!isMatch) {
    throw ApiError.unauthorized('Invalid credentials');
  }

  const token = salon.generateToken();

  res.json(ApiResponse.success('Login successful', { token, salon }));
});

// @desc    Verify phone OTP
// @route   POST /api/auth/verify-otp
const verifyOtp = asyncHandler(async (req, res) => {
  const { phone, otp } = req.body;

  const salon = await Salon.findOne({ phone }).select('+otp +otpExpiry');
  if (!salon) {
    throw ApiError.notFound('No account found with this phone number');
  }

  if (!salon.otp || !salon.otpExpiry) {
    throw ApiError.badRequest('No OTP requested. Please register first.');
  }

  if (salon.otpExpiry < new Date()) {
    throw ApiError.badRequest('OTP has expired');
  }

  const hashedInput = hashOtp(otp);
  if (hashedInput !== salon.otp) {
    throw ApiError.badRequest('Invalid OTP');
  }

  salon.isPhoneVerified = true;
  salon.otp = undefined;
  salon.otpExpiry = undefined;
  await salon.save();

  const token = salon.generateToken();

  res.json(ApiResponse.success('Phone verified successfully', { token, salon }));
});

// @desc    Get current salon
// @route   GET /api/auth/me
const getMe = asyncHandler(async (req, res) => {
  res.json(ApiResponse.success('Current salon', { salon: req.salon }));
});

module.exports = { register, login, verifyOtp, getMe };
