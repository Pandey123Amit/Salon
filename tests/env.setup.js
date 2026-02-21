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
