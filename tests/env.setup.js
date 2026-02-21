// Set required env vars BEFORE any module is loaded.
// This runs via jest's setupFiles — before require() of test files.
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://localhost:27017/salonbot-test';
process.env.JWT_SECRET = 'test-jwt-secret-for-testing';
process.env.OPENAI_API_KEY = 'sk-test-fake-key-for-testing';
process.env.OPENAI_MODEL = 'gpt-4o-mini';
// High rate limits for tests so auth rate limiter doesn't block test requests
process.env.RATE_LIMIT_MAX = '10000';
process.env.AUTH_RATE_LIMIT_MAX = '10000';

// WhatsApp Meta Cloud API — Phase 4 test values
process.env.WHATSAPP_APP_SECRET = 'test-whatsapp-app-secret-for-hmac';
process.env.WHATSAPP_VERIFY_TOKEN = 'test-verify-token-12345';
process.env.WHATSAPP_ENCRYPTION_KEY = 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2';
