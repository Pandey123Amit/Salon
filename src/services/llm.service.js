const OpenAI = require('openai');
const env = require('../config/env');
const logger = require('../utils/logger');

const openai = new OpenAI({ apiKey: env.openaiApiKey });

/**
 * Build the system prompt with salon-specific context injected.
 */
function buildSystemPrompt({ salon, services, offers }) {
  const workingHoursText = salon.workingHours
    .filter((wh) => wh.isOpen)
    .map((wh) => `  ${wh.day}: ${wh.openTime} - ${wh.closeTime}`)
    .join('\n');

  const closedDays = salon.workingHours
    .filter((wh) => !wh.isOpen)
    .map((wh) => wh.day)
    .join(', ');

  const servicesText = services
    .map((s) => `  - ${s.name} (${s.category}) — ₹${s.price}, ${s.duration} min`)
    .join('\n');

  const offersText =
    offers.length > 0
      ? offers
          .map((o) => {
            const discount =
              o.discountType === 'percentage'
                ? `${o.discountValue}% off`
                : `₹${o.discountValue} off`;
            return `  - ${o.title}: ${discount}${o.description ? ` — ${o.description}` : ''}`;
          })
          .join('\n')
      : '  Koi special offer abhi nahi hai.';

  const address = salon.address
    ? [salon.address.street, salon.address.city, salon.address.state, salon.address.pincode]
        .filter(Boolean)
        .join(', ')
    : 'Address not set';

  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  return `You are the WhatsApp booking assistant for "${salon.name}".
You speak friendly Hinglish (Hindi + English mix). Keep messages short — 3-4 lines max.
Use Indian date format (DD/MM/YYYY) and 12-hour time (e.g., 2:30 PM).
TODAY'S DATE: ${today}. Always use this as reference for "today", "tomorrow", "next week", etc.

SALON INFO:
  Name: ${salon.name}
  Address: ${address}
  Phone: ${salon.phone}
  Working Hours:
${workingHoursText}
  ${closedDays ? `Closed: ${closedDays}` : ''}
  Slot Duration: ${salon.slotDuration} min

SERVICES:
${servicesText}

OFFERS:
${offersText}

RULES:
- Only offer services listed above. Never make up services or prices.
- Always confirm service, date, time, and price BEFORE booking.
- If the customer is unclear, ask clarifying questions.
- For cancellations, confirm which appointment to cancel.
- If you cannot help, use handoff_to_human to transfer to the salon owner.
- Be warm, polite, and professional. Use emojis sparingly (1-2 per message).
- When showing multiple options (services, time slots), use numbered lists.
- Refer to prices in ₹ (Rupees).${salon.payment?.isPaymentEnabled ? `

PAYMENT:
- This salon has online payment enabled via Razorpay.
- After booking, a payment link will be automatically generated and sent to the customer.
- Payment is ${salon.payment.paymentMode === 'required' ? 'REQUIRED' : 'OPTIONAL'} for this salon.
- ${salon.payment.paymentMode === 'required' ? 'Let the customer know they need to complete payment to confirm their appointment.' : 'Let the customer know they can pay online or at the salon.'}
- Do NOT generate payment links yourself — the system handles this automatically.` : ''}`;
}

/**
 * OpenAI tool definitions for the 8 salon chatbot tools.
 */
const toolDefinitions = [
  {
    type: 'function',
    function: {
      name: 'get_services',
      description:
        'Get list of active salon services. Call when the customer asks about available services, treatments, or prices. Can optionally filter by category.',
      parameters: {
        type: 'object',
        properties: {
          category: {
            type: 'string',
            description:
              'Optional service category filter (Hair, Skin, Nails, Makeup, Spa, Beard, Bridal, Other)',
          },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_available_slots',
      description:
        'Check available appointment slots for a specific service on a specific date. Call when the customer has picked a service and date and wants to see available times.',
      parameters: {
        type: 'object',
        properties: {
          serviceId: {
            type: 'string',
            description: 'The MongoDB ObjectId of the service',
          },
          date: {
            type: 'string',
            description: 'Date in YYYY-MM-DD format',
          },
          staffId: {
            type: 'string',
            description: 'Optional staff member ObjectId to filter slots',
          },
        },
        required: ['serviceId', 'date'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_booking',
      description:
        'Create a new appointment booking. Call ONLY after the customer has confirmed the service, date, time slot, and price. All details must be confirmed before calling this. If the salon has payments enabled, a payment link will be included in the response.',
      parameters: {
        type: 'object',
        properties: {
          serviceId: {
            type: 'string',
            description: 'The MongoDB ObjectId of the service',
          },
          date: {
            type: 'string',
            description: 'Date in YYYY-MM-DD format',
          },
          startTime: {
            type: 'string',
            description: 'Start time in HH:mm format (24-hour)',
          },
          staffId: {
            type: 'string',
            description: 'Optional staff member ObjectId',
          },
        },
        required: ['serviceId', 'date', 'startTime'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'cancel_appointment',
      description:
        'Cancel an upcoming appointment. Call when the customer wants to cancel a booking. Requires the appointment ID.',
      parameters: {
        type: 'object',
        properties: {
          appointmentId: {
            type: 'string',
            description: 'The MongoDB ObjectId of the appointment to cancel',
          },
          reason: {
            type: 'string',
            description: 'Optional cancellation reason',
          },
        },
        required: ['appointmentId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_customer_appointments',
      description:
        'Get upcoming appointments for the current customer. Call when the customer asks about their existing bookings or appointment status.',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_salon_info',
      description:
        'Get salon details like address, working hours, and contact info. Call when the customer asks about location, timing, or how to reach the salon.',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_offers',
      description:
        'Get active promotions and discount offers. Call when the customer asks about deals, discounts, or special offers.',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'handoff_to_human',
      description:
        'Transfer the conversation to the salon owner/staff. Call when you cannot handle the request, the customer is upset, or explicitly asks to speak to a person.',
      parameters: {
        type: 'object',
        properties: {
          reason: {
            type: 'string',
            description: 'Brief reason for the handoff',
          },
        },
        required: ['reason'],
      },
    },
  },
];

/**
 * Send messages to OpenAI and get a chat completion (with tool support).
 *
 * @param {Array} messages - Array of { role, content, tool_call_id?, tool_calls? }
 * @returns {Object} The OpenAI response message (may contain tool_calls or content)
 */
async function chatCompletion(messages) {
  try {
    const response = await openai.chat.completions.create({
      model: env.openaiModel,
      messages,
      tools: toolDefinitions,
      temperature: 0.7,
      max_tokens: 500,
    });

    return response.choices[0].message;
  } catch (error) {
    logger.error('OpenAI API error:', error.message);
    throw error;
  }
}

module.exports = {
  buildSystemPrompt,
  toolDefinitions,
  chatCompletion,
};
