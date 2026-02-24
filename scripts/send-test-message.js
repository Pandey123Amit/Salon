#!/usr/bin/env node
/**
 * Quick test script to send a WhatsApp message via Meta Cloud API.
 * Also seeds the database with a test salon for webhook flow.
 *
 * Usage: node scripts/send-test-message.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { encryptToken } = require('../src/services/whatsapp-crypto.service');

const GRAPH_API = 'https://graph.facebook.com/v21.0';
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const RECIPIENT = '918986605695'; // Your WhatsApp number

async function sendTestMessage() {
  console.log('\n=== WhatsApp Test Message ===\n');

  if (!ACCESS_TOKEN || ACCESS_TOKEN === 'PASTE_YOUR_ACCESS_TOKEN_HERE') {
    console.error('❌ Set WHATSAPP_ACCESS_TOKEN in .env first');
    console.error('   Copy it from Meta Developer Console > API Setup');
    process.exit(1);
  }

  // Step 1: Send hello_world template message
  console.log('📤 Sending hello_world template to', RECIPIENT, '...');

  const response = await fetch(`${GRAPH_API}/${PHONE_NUMBER_ID}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: RECIPIENT,
      type: 'template',
      template: {
        name: 'hello_world',
        language: { code: 'en_US' },
      },
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    console.error('❌ API Error:', data.error?.message || JSON.stringify(data));
    process.exit(1);
  }

  console.log('✅ Message sent! WAMID:', data.messages?.[0]?.id);

  // Step 2: Seed test salon in database for webhook flow
  console.log('\n📦 Setting up test salon in database...');

  await mongoose.connect(process.env.MONGODB_URI);

  const Salon = require('../src/models/Salon');

  const encryptedToken = encryptToken(ACCESS_TOKEN);

  const salon = await Salon.findOneAndUpdate(
    { 'whatsapp.phoneNumberId': PHONE_NUMBER_ID },
    {
      $set: {
        name: 'Test Salon',
        phone: '8986605695',
        email: 'test@salon.com',
        'whatsapp.phoneNumberId': PHONE_NUMBER_ID,
        'whatsapp.businessAccountId': process.env.WHATSAPP_BUSINESS_ACCOUNT_ID,
        'whatsapp.accessToken': encryptedToken,
        'whatsapp.isConnected': true,
        'whatsapp.connectedAt': new Date(),
      },
      $setOnInsert: {
        password: '$2a$10$dummyhashforTestingSalonOnly1234567890abc',
        address: { city: 'Test City', state: 'Test State' },
        businessHours: {
          monday: { open: '09:00', close: '21:00', isClosed: false },
          tuesday: { open: '09:00', close: '21:00', isClosed: false },
          wednesday: { open: '09:00', close: '21:00', isClosed: false },
          thursday: { open: '09:00', close: '21:00', isClosed: false },
          friday: { open: '09:00', close: '21:00', isClosed: false },
          saturday: { open: '09:00', close: '21:00', isClosed: false },
          sunday: { open: '09:00', close: '21:00', isClosed: true },
        },
      },
    },
    { upsert: true, new: true }
  );

  console.log('✅ Test salon ready:', salon.name, '(ID:', salon._id, ')');
  console.log('\n=== Setup Complete ===');
  console.log('1. Check your WhatsApp for the hello_world message');
  console.log('2. Reply to that message — it will hit your webhook');
  console.log('3. Your AI chatbot will process it and respond!\n');

  await mongoose.disconnect();
}

sendTestMessage().catch((err) => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
