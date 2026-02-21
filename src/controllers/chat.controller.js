const { processMessage, getConversationHistory } = require('../services/chat.service');
const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');

/**
 * POST /api/chat/message
 * Send a message as a customer and get AI response.
 */
const sendMessage = asyncHandler(async (req, res) => {
  const { phone, message } = req.body;
  const salonId = req.salon._id;

  const result = await processMessage(salonId, phone, message);

  res.json(ApiResponse.success('Message processed', result));
});

/**
 * GET /api/chat/history?phone=9876543210&limit=50
 * Get conversation history for a phone number.
 */
const getHistory = asyncHandler(async (req, res) => {
  const { phone, limit } = req.query;
  const salonId = req.salon._id;

  const conversations = await getConversationHistory(salonId, phone, limit || 50);

  res.json(ApiResponse.success('Conversation history', { conversations }));
});

module.exports = { sendMessage, getHistory };
