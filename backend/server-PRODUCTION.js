// backend/server.js - PRODUCTION HARDENED VERSION
// Replace existing server.js with this file

const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const helmet = require('helmet');

// Security middleware
const {
  helmetConfig,
  authLimiter,
  apiLimiter,
  corsConfig,
  cookieConfig,
  sanitizeRequest,
  requestIdMiddleware,
  auditLogger,
} = require('./middleware/security');

const routes = require('./routes');
const { sendError } = require('./utils/response');

// ========== ENVIRONMENT VALIDATION ==========
const requiredEnvVars = [
  'DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD',
  'JWT_SECRET', 'NODE_ENV', 'PORT',
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`ERROR: Missing required environment variable: ${envVar}`);
    process.exit(1);
  }
}

// ========== VALIDATE PRODUCTION SETTINGS ==========
if (process.env.NODE_ENV === 'production') {
  if (process.env.JWT_SECRET === 'ozofibooks-pro-secret-key-123') {
    console.error('SECURITY ERROR: Using default JWT_SECRET in production. Set JWT_SECRET environment variable.');
    process.exit(1);
  }

  if (!process.env.SECURE_COOKIES) {
    console.warn('WARNING: SECURE_COOKIES not set. Cookies will be transmitted over HTTPS only.');
  }

  if (!process.env.SENTRY_DSN) {
    console.warn('WARNING: SENTRY_DSN not set. Error tracking disabled.');
  }
}

// ========== APP INITIALIZATION ==========
const app = express();
const PORT = process.env.PORT || 3000;

// ========== SECURITY MIDDLEWARE STACK ==========

// 1. Helmet for HTTP headers
app.use(helmetConfig);

// 2. CORS protection
app.use(cors(corsConfig));

// 3. Request ID tracking
app.use(requestIdMiddleware);

// 4. Body parser with size limit
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// 5. Cookie parser with signing
app.use(cookieParser(process.env.COOKIE_SECRET || 'default-secret'));

// 6. Request sanitization
app.use(sanitizeRequest);

// 7. Rate limiting
app.use('/api/auth/login', authLimiter);  // Strict limit on login
app.use('/api/auth/register', authLimiter);
app.use('/api/', apiLimiter);  // General API rate limit

// 8. Audit logging
app.use(auditLogger);

// ========== REQUEST LOGGING ==========
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    console.log(`[${req.id}] ${req.method} ${req.path}`);
    next();
  });
}

// ========== API ROUTES ==========
app.use('/api', routes);

// ========== 404 HANDLING ==========
app.use('/api/*', (req, res) => {
  sendError(res, 'Route not found', 'NOT_FOUND', 404);
});

app.use((req, res) => {
  res.status(404).json({
    error: 'Not found. Frontend runs on port 5174.',
    requestId: req.id,
  });
});

// ========== GLOBAL ERROR HANDLER ==========
app.use((err, req, res, next) => {
  const status = err.status || 500;
  const message = process.env.NODE_ENV === 'production'
    ? 'Internal server error'
    : err.message;

  console.error(`[${req.id}] Error:`, {
    status,
    message,
    stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined,
  });

  // Send error to Sentry if configured
  if (process.env.SENTRY_DSN) {
    try {
      const Sentry = require('@sentry/node');
      Sentry.captureException(err, { contexts: { express: { method: req.method, url: req.url } } });
    } catch (e) {
      console.error('Sentry error:', e);
    }
  }

  res.status(status).json({
    error: message,
    code: err.code || 'INTERNAL_ERROR',
    requestId: req.id,
  });
});

// ========== GRACEFUL SHUTDOWN ==========
const server = require.main === module ? app.listen(PORT, () => {
  console.log(`\n╔════════════════════════════════════════╗`);
  console.log(`║  Ozofi Books Pro Backend - Production    ║`);
  console.log(`║  http://localhost:${PORT}${' '.repeat(13 - String(PORT).length)}║`);
  console.log(`║  Node: ${process.version}${' '.repeat(28 - process.version.length)}║`);
  console.log(`║  Environment: ${process.env.NODE_ENV}${' '.repeat(21 - process.env.NODE_ENV.length)}║`);
  console.log(`╚════════════════════════════════════════╝\n`);
}) : null;

if (server) {
  process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully...');
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  });

  process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully...');
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  });
}

module.exports = app;
