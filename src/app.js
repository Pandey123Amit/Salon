const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const compression = require('compression');
const hpp = require('hpp');
const mongoSanitize = require('express-mongo-sanitize');
const mongoose = require('mongoose');
const { generalLimiter } = require('./middleware/rateLimiter');
const errorHandler = require('./middleware/errorHandler');
const notFound = require('./middleware/notFound');
const routes = require('./routes');
const webhookRoutes = require('./routes/webhook.routes');
const razorpayWebhookRoutes = require('./routes/razorpay-webhook.routes');
const env = require('./config/env');

const app = express();

// Trust first proxy (nginx) — required for rate-limiter to see real IPs
if (env.isProd) {
  app.set('trust proxy', 1);
}

// Security headers
app.use(helmet());

// CORS — restrict origin in production
app.use(cors({
  origin: env.isProd ? (env.baseUrl || true) : true,
  credentials: true,
}));

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

// Health check — returns 503 when DB is disconnected (used by Docker HEALTHCHECK)
app.get('/health', (req, res) => {
  const dbState = mongoose.connection.readyState;
  const isHealthy = dbState === 1;
  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    mongodb: isHealthy ? 'connected' : 'disconnected',
  });
});

// API routes
app.use('/api', routes);

// Serve dashboard SPA in production
if (env.isProd) {
  const dashboardPath = path.join(__dirname, '../dashboard/dist');
  app.use(express.static(dashboardPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/webhook') ||
        req.path.startsWith('/razorpay-webhook') || req.path === '/health') {
      return next();
    }
    res.sendFile(path.join(dashboardPath, 'index.html'));
  });
}

// 404 handler
app.use(notFound);

// Global error handler
app.use(errorHandler);

module.exports = app;
