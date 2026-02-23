const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const compression = require('compression');
const hpp = require('hpp');
const mongoSanitize = require('express-mongo-sanitize');
const { generalLimiter } = require('./middleware/rateLimiter');
const errorHandler = require('./middleware/errorHandler');
const notFound = require('./middleware/notFound');
const routes = require('./routes');
const webhookRoutes = require('./routes/webhook.routes');
const razorpayWebhookRoutes = require('./routes/razorpay-webhook.routes');
const env = require('./config/env');

const app = express();

// Security headers
app.use(helmet());

// CORS
app.use(cors());

// Webhook routes — mounted BEFORE global JSON parser to capture raw body for signature verification
app.use(
  '/webhook',
  express.json({
    limit: '10kb',
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
  webhookRoutes
);

// Razorpay webhook — also needs raw body for signature verification
app.use(
  '/razorpay-webhook',
  express.json({
    limit: '10kb',
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
  razorpayWebhookRoutes
);

// Body parsing
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Sanitize mongo queries (prevent NoSQL injection)
app.use(mongoSanitize());

// Prevent HTTP parameter pollution
app.use(hpp());

// Compression
app.use(compression());

// Logging
if (env.isDev) {
  app.use(morgan('dev'));
}

// Rate limiting
app.use('/api', generalLimiter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api', routes);

// 404 handler
app.use(notFound);

// Global error handler
app.use(errorHandler);

module.exports = app;
