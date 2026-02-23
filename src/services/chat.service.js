const { Salon, Service, Staff, Appointment, Customer, Offer, Conversation } = require('../models');
const { getAvailableSlots, minutesToTime } = require('./slot.service');
const { buildSystemPrompt, chatCompletion } = require('./llm.service');
const { formatForWhatsApp } = require('./whatsapp-formatter.service');
const { createPaymentLink } = require('./payment.service');
const { CHAT_CONFIG } = require('../config/constants');
const ApiError = require('../utils/ApiError');
const logger = require('../utils/logger');

// ─── Customer Resolution ──────────────────────────────────────────

/**
 * Find or create a customer by phone for a given salon.
 */
async function resolveCustomer(salonId, phone) {
  let customer = await Customer.findOne({ salonId, phone });
  if (!customer) {
    customer = await Customer.create({
      salonId,
      phone,
      name: `Customer ${phone.slice(-4)}`,
    });
    logger.info(`New customer auto-created for phone ${phone}`);
  }
  return customer;
}

// ─── Conversation Session Management ──────────────────────────────

/**
 * Get active conversation or create a new one.
 * Sessions expire after CHAT_CONFIG.sessionTimeoutMinutes of inactivity.
 */
async function getOrCreateConversation(salonId, customerId, phone) {
  const timeoutThreshold = new Date(
    Date.now() - CHAT_CONFIG.sessionTimeoutMinutes * 60 * 1000
  );

  // Expire stale sessions
  await Conversation.updateMany(
    { salonId, phone, isActive: true, lastActivityAt: { $lt: timeoutThreshold } },
    { $set: { isActive: false } }
  );

  // Look for active session
  let conversation = await Conversation.findOne({ salonId, phone, isActive: true });

  if (!conversation) {
    conversation = await Conversation.create({
      salonId,
      customerId,
      phone,
      state: 'greeting',
      messages: [],
      lastActivityAt: new Date(),
    });
  }

  return conversation;
}

// ─── Salon Context Builder ────────────────────────────────────────

/**
 * Fetch salon, services, and offers in parallel for the system prompt.
 */
async function buildSalonContext(salonId) {
  const [salon, services, offers] = await Promise.all([
    Salon.findById(salonId),
    Service.find({ salonId, isActive: true }),
    Offer.find({
      salonId,
      isActive: true,
      validFrom: { $lte: new Date() },
      validTo: { $gte: new Date() },
    }),
  ]);

  if (!salon) throw ApiError.notFound('Salon not found');
  return { salon, services, offers };
}

// ─── Tool Execution ───────────────────────────────────────────────

/**
 * Execute a single tool call and return the result as a string.
 */
async function executeToolCall(toolName, args, context) {
  const { salonId, customerId, conversation } = context;

  switch (toolName) {
    case 'get_services': {
      const filter = { salonId, isActive: true };
      if (args.category) filter.category = args.category;
      const services = await Service.find(filter).lean();
      return JSON.stringify(
        services.map((s) => ({
          id: s._id,
          name: s.name,
          category: s.category,
          price: s.price,
          duration: s.duration,
          description: s.description,
        }))
      );
    }

    case 'get_available_slots': {
      const { serviceId, date, staffId } = args;
      const result = await getAvailableSlots({ salonId, date, serviceId, staffId });
      // Update conversation state
      conversation.state = 'slot_selection';
      return JSON.stringify(result);
    }

    case 'create_booking': {
      const { serviceId, date, startTime, staffId } = args;

      // Re-verify slot availability (safety check)
      const { slots } = await getAvailableSlots({ salonId, date, serviceId, staffId });
      const matchingSlot = slots.find((s) => s.startTime === startTime);
      if (!matchingSlot) {
        return JSON.stringify({
          success: false,
          error: 'Yeh slot ab available nahi hai. Please doosra time choose karein.',
        });
      }

      const service = await Service.findById(serviceId);

      const appointment = await Appointment.create({
        salonId,
        customerId,
        serviceId,
        staffId: matchingSlot.staffId,
        date: new Date(date),
        startTime,
        endTime: matchingSlot.endTime,
        duration: service.duration,
        price: service.price,
        status: 'confirmed',
        bookedVia: 'whatsapp',
      });

      // Update conversation context + state
      conversation.state = 'booking_complete';
      conversation.bookingContext = {
        serviceId,
        serviceName: service.name,
        date,
        startTime,
        staffId: matchingSlot.staffId,
        staffName: matchingSlot.staffName,
        price: service.price,
        duration: service.duration,
      };
      conversation.metadata.bookingCompleted = true;

      const bookingResult = {
        success: true,
        appointmentId: appointment._id,
        service: service.name,
        date,
        startTime,
        endTime: matchingSlot.endTime,
        staff: matchingSlot.staffName,
        price: service.price,
      };

      // Attempt to create payment link if payment is enabled
      const salon = await Salon.findById(salonId).select('+payment.razorpayKeySecret');
      if (salon?.payment?.isPaymentEnabled) {
        try {
          const customer = await Customer.findById(customerId);
          const paymentResult = await createPaymentLink({ salon, appointment, customer });
          bookingResult.paymentLink = paymentResult.paymentLinkUrl;
          bookingResult.paymentRequired = salon.payment.paymentMode === 'required';

          // Store payment link in conversation for later retrieval
          conversation.metadata.paymentLink = paymentResult.paymentLinkUrl;
          conversation.metadata.paymentRequired = bookingResult.paymentRequired;
        } catch (payErr) {
          logger.error('Payment link creation failed (booking still succeeded)', {
            appointmentId: appointment._id,
            error: payErr.message,
          });
          bookingResult.paymentLink = null;
        }
      }

      return JSON.stringify(bookingResult);
    }

    case 'cancel_appointment': {
      const { appointmentId, reason } = args;
      const appointment = await Appointment.findOne({
        _id: appointmentId,
        salonId,
        customerId,
        status: { $in: ['pending', 'confirmed'] },
      });

      if (!appointment) {
        return JSON.stringify({
          success: false,
          error: 'Appointment nahi mila ya already cancel/complete ho chuka hai.',
        });
      }

      appointment.status = 'cancelled';
      appointment.cancelReason = reason || 'Cancelled via WhatsApp';
      await appointment.save();

      conversation.state = 'cancellation';

      return JSON.stringify({
        success: true,
        message: 'Appointment cancel ho gaya hai.',
        appointmentId: appointment._id,
      });
    }

    case 'get_customer_appointments': {
      const appointments = await Appointment.find({
        salonId,
        customerId,
        status: { $in: ['pending', 'confirmed'] },
        date: { $gte: new Date() },
      })
        .populate('serviceId', 'name price')
        .populate('staffId', 'name')
        .sort({ date: 1, startTime: 1 })
        .lean();

      return JSON.stringify(
        appointments.map((a) => ({
          id: a._id,
          service: a.serviceId?.name,
          date: a.date,
          startTime: a.startTime,
          endTime: a.endTime,
          staff: a.staffId?.name,
          status: a.status,
          price: a.price,
        }))
      );
    }

    case 'get_salon_info': {
      const salon = await Salon.findById(salonId).lean();
      const address = salon.address
        ? [salon.address.street, salon.address.city, salon.address.state, salon.address.pincode]
            .filter(Boolean)
            .join(', ')
        : 'Not set';

      const workingHours = salon.workingHours
        .filter((wh) => wh.isOpen)
        .map((wh) => `${wh.day}: ${wh.openTime} - ${wh.closeTime}`);

      conversation.state = 'faq';

      return JSON.stringify({
        name: salon.name,
        phone: salon.phone,
        address,
        workingHours,
      });
    }

    case 'get_offers': {
      const offers = await Offer.find({
        salonId,
        isActive: true,
        validFrom: { $lte: new Date() },
        validTo: { $gte: new Date() },
      }).lean();

      return JSON.stringify(
        offers.map((o) => ({
          title: o.title,
          description: o.description,
          discountType: o.discountType,
          discountValue: o.discountValue,
          validTo: o.validTo,
        }))
      );
    }

    case 'handoff_to_human': {
      conversation.state = 'human_handoff';
      conversation.metadata.handedOff = true;
      return JSON.stringify({
        success: true,
        message: 'Conversation transferred to salon owner. They will respond soon.',
        reason: args.reason,
      });
    }

    default:
      return JSON.stringify({ error: `Unknown tool: ${toolName}` });
  }
}

// ─── Main Message Processor ───────────────────────────────────────

/**
 * Process an incoming chat message.
 *
 * @param {ObjectId} salonId
 * @param {string} phone - Customer phone number
 * @param {string} message - The user's message text
 * @returns {Object} { reply: { text, whatsapp }, conversationId, state, customer }
 */
async function processMessage(salonId, phone, message) {
  // 1. Resolve customer (find or create)
  const customer = await resolveCustomer(salonId, phone);

  // 2. Get or create conversation session
  const conversation = await getOrCreateConversation(salonId, customer._id, phone);

  // 3. Build salon context for the system prompt
  const salonContext = await buildSalonContext(salonId);
  const systemPrompt = buildSystemPrompt(salonContext);

  // 4. Add the new user message
  conversation.messages.push({
    role: 'user',
    content: message,
    timestamp: new Date(),
  });

  // 5. Build OpenAI messages array (system + last N messages)
  const recentMessages = conversation.messages.slice(-CHAT_CONFIG.maxMessagesInContext);
  const openaiMessages = [
    { role: 'system', content: systemPrompt },
    ...recentMessages.map((m) => {
      if (m.role === 'tool') {
        return {
          role: 'tool',
          content: m.content,
          tool_call_id: m.toolCallId,
        };
      }
      if (m.toolCalls) {
        return {
          role: 'assistant',
          content: m.content || null,
          tool_calls: m.toolCalls,
        };
      }
      return { role: m.role, content: m.content };
    }),
  ];

  // 6. Tool-call loop
  const toolContext = {
    salonId,
    customerId: customer._id,
    conversation,
  };

  let assistantMessage;
  for (let i = 0; i < CHAT_CONFIG.maxToolCallIterations; i++) {
    assistantMessage = await chatCompletion(openaiMessages);

    // If no tool calls, we have our final text response
    if (!assistantMessage.tool_calls || assistantMessage.tool_calls.length === 0) {
      break;
    }

    // Save the assistant's tool-call message
    conversation.messages.push({
      role: 'assistant',
      content: assistantMessage.content || null,
      toolCalls: assistantMessage.tool_calls,
      timestamp: new Date(),
    });

    openaiMessages.push({
      role: 'assistant',
      content: assistantMessage.content || null,
      tool_calls: assistantMessage.tool_calls,
    });

    // Execute each tool call and feed results back
    for (const toolCall of assistantMessage.tool_calls) {
      const { name } = toolCall.function;
      let args;
      try {
        args = JSON.parse(toolCall.function.arguments);
      } catch {
        args = {};
      }

      logger.info(`Tool call: ${name}`, { args });

      let result;
      try {
        result = await executeToolCall(name, args, toolContext);
      } catch (error) {
        logger.error(`Tool execution error (${name}):`, error.message);
        result = JSON.stringify({ error: `Tool error: ${error.message}` });
      }

      // Save tool result to conversation
      conversation.messages.push({
        role: 'tool',
        content: result,
        toolCallId: toolCall.id,
        timestamp: new Date(),
      });

      openaiMessages.push({
        role: 'tool',
        content: result,
        tool_call_id: toolCall.id,
      });
    }
  }

  // 7. Extract final text response
  let responseText =
    assistantMessage?.content ||
    'Sorry, kuch technical issue aa raha hai. Thodi der mein try karein ya salon ko directly call karein. 🙏';

  // If we exhausted the loop and still have tool_calls, use fallback
  if (assistantMessage?.tool_calls?.length > 0) {
    responseText =
      'Maaf kijiye, abhi request process nahi ho paayi. Please thodi der mein try karein. 🙏';
  }

  // 8. Save assistant's final response
  conversation.messages.push({
    role: 'assistant',
    content: responseText,
    timestamp: new Date(),
  });

  // 9. Update conversation metadata
  conversation.metadata.totalTurns += 1;
  conversation.lastActivityAt = new Date();
  await conversation.save();

  // 10. Format for WhatsApp
  const whatsappMessage = formatForWhatsApp(responseText);

  return {
    reply: {
      text: responseText,
      whatsapp: whatsappMessage,
    },
    conversationId: conversation._id,
    state: conversation.state,
    customer: {
      id: customer._id,
      name: customer.name,
      phone: customer.phone,
      isNew: customer.totalVisits === 0,
    },
    paymentLink: conversation.metadata?.paymentLink || null,
    paymentRequired: conversation.metadata?.paymentRequired || false,
  };
}

// ─── Conversation History ─────────────────────────────────────────

/**
 * Get conversation history for a phone number.
 */
async function getConversationHistory(salonId, phone, limit = 50) {
  const conversations = await Conversation.find({ salonId, phone })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  return conversations;
}

module.exports = {
  processMessage,
  getConversationHistory,
};
