// backend/server.js — PRODUCTION HARDENED
'use strict';
require('dotenv').config();

const express      = require('express');
const cookieParser = require('cookie-parser');
const cors         = require('cors');

// Validate critical env vars
if (process.env.NODE_ENV === 'production') {
  const bad = ['ozofibooks-pro-secret-key-123', 'dev-insecure-secret-do-not-use-in-production'];
  if (!process.env.JWT_SECRET || bad.includes(process.env.JWT_SECRET)) {
    console.error('[FATAL] JWT_SECRET is not set or is insecure. Refusing to start.');
    process.exit(1);
  }
  if (!process.env.COOKIE_SECRET || process.env.COOKIE_SECRET === 'default-secret') {
    console.error('[FATAL] COOKIE_SECRET is not set or is insecure. Refusing to start.');
    process.exit(1);
  }
}

const {
  helmetConfig,
  authLimiter,
  apiLimiter,
  corsConfig,
  sanitizeRequest,
  requestIdMiddleware,
  auditLogger,
} = require('./middleware/security');

const logger        = require('./utils/logger');
const routes        = require('./routes');
const { sendError } = require('./utils/response');
const { initSchema } = require('./db/schema');

// Sentry (optional)
if (process.env.SENTRY_DSN) {
  try {
    const Sentry = require('@sentry/node');
    Sentry.init({
      dsn:              process.env.SENTRY_DSN,
      environment:      process.env.NODE_ENV || 'development',
      tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1'),
    });
    logger.info('Sentry initialised');
  } catch (e) {
    logger.warn('Sentry init failed', { error: e.message });
  }
}

const app  = express();
const PORT = process.env.PORT || 3000;

// Security headers
app.set('trust proxy', 1);
app.use(helmetConfig);
app.use(cors(corsConfig));

// Request plumbing
app.use(requestIdMiddleware);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(cookieParser(process.env.COOKIE_SECRET || 'ozofibooks-cookie-secret-dev'));

// Input sanitisation
app.use(sanitizeRequest);

// Rate limiting
app.use('/api/auth/login',    authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/', apiLimiter);

// Audit logging
app.use(auditLogger);

// Routes
app.use('/api', routes);

// 404 handlers
app.use('/api', (req, res) => {
  sendError(res, 'Route not found', 'NOT_FOUND', 404);
});
app.use((req, res) => {
  res.status(404).json({ error: 'Not found.' });
});

// Global error handler
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  logger.error('Unhandled error', { path: req.path, method: req.method, error: err.message });
  sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
});

if (require.main === module) {
  (async () => {
    // 1. Bootstrap schema (idempotent — uses CREATE TABLE / ADD COLUMN IF NOT EXISTS).
    try {
      await initSchema();
      logger.info('Schema bootstrap complete');
    } catch (e) {
      logger.error('Schema bootstrap failed — refusing to start', { error: e.message });
      process.exit(1);
    }

    // 2. Optional background workers.
    try { require('./workers/scheduler'); }              catch (e) { logger.warn('scheduler not loaded: ' + e.message); }
    try { require('./workers/recurringInvoiceWorker'); } catch (e) { logger.warn('recurringInvoiceWorker not loaded: ' + e.message); }

    // 3. Start listening.
    app.listen(PORT, () => {
      logger.info('Ozofi Books API started', { port: PORT, env: process.env.NODE_ENV || 'development' });
    });
  })();
}

module.exports = app;

// touch
// touch 2