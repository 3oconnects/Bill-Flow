// backend/middleware/security.js
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// ========== HELMET CONFIGURATION ==========
const helmetConfig = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", process.env.FRONTEND_URL || 'http://localhost:5174'],
    },
  },
  hsts: {
    maxAge: 31536000,  // 1 year
    includeSubDomains: true,
    preload: true,
  },
  noSniff: true,
  xssFilter: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
});

// ========== RATE LIMITING ==========
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 5,  // 5 attempts per window
  message: 'Too many login attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req, res) => req.body?.email || req.ip,  // Rate limit by email or IP
  skip: (req, res) => process.env.NODE_ENV === 'development',
});

const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,  // 1 minute
  max: 100,  // 100 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many requests',
      retryAfter: req.rateLimit.resetTime,
    });
  },
});

// ========== CORS CONFIGURATION ==========
const isProd = process.env.NODE_ENV === 'production';

// In dev, allow any localhost / 127.0.0.1 / private-LAN origin so phones
// scanning QR codes from the same Wi-Fi network can reach the backend.
const DEV_ORIGIN_RE = /^https?:\/\/(localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+)(:\d+)?$/;

const corsConfig = {
  origin: (origin, callback) => {
    // No Origin header (curl, server-to-server) — allow.
    if (!origin) return callback(null, true);

    const whitelist = [
      process.env.FRONTEND_URL,
      process.env.BACKEND_URL,
      'http://localhost:3000',
      'http://localhost:5174',
    ].filter(Boolean);

    if (whitelist.includes(origin)) return callback(null, true);
    if (!isProd && (DEV_ORIGIN_RE.test(origin) || /\.ngrok-free\.dev(:\d+)?$/.test(origin) || /\.ngrok\.io(:\d+)?$/.test(origin))) return callback(null, true);

    callback(new Error('CORS policy violation'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400,  // 24 hours
};

// ========== COOKIE SECURITY ==========
const cookieConfig = {
  httpOnly: true,  // Prevent JS access
  secure: process.env.NODE_ENV === 'production',  // HTTPS only in production
  sameSite: 'strict',  // CSRF protection
  maxAge: 7 * 24 * 60 * 60 * 1000,  // 7 days
  signed: true,  // Use cookie-parser's signing
};

// ========== REQUEST SANITIZATION ==========
const sanitizeRequest = (req, res, next) => {
  // Strip potential XSS from string fields
  const sanitize = (obj) => {
    if (typeof obj === 'string') {
      return obj
        .replace(/[<>\"']/g, (char) => {
          const map = { '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#x27;' };
          return map[char];
        });
    }
    if (Array.isArray(obj)) return obj.map(sanitize);
    if (obj && typeof obj === 'object') {
      return Object.keys(obj).reduce((acc, key) => {
        acc[key] = sanitize(obj[key]);
        return acc;
      }, {});
    }
    return obj;
  };

  req.body = sanitize(req.body);
  req.query = sanitize(req.query);
  next();
};

// ========== REQUEST ID TRACKING ==========
const requestIdMiddleware = (req, res, next) => {
  req.id = req.headers['x-request-id'] || require('uuid').v4();
  res.setHeader('x-request-id', req.id);
  next();
};

// ========== AUDIT LOGGING ==========
var auditLogger = function(req, res, next) {
  var start = Date.now();
  res.on('finish', function() {
    var duration = Date.now() - start;
    var log = {
      requestId: req.id,
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: duration,
      userId: req.user && req.user.id,
      orgId: req.orgId,
      ip: req.ip,
      timestamp: new Date().toISOString(),
    };
    try {
      var logger = require('../utils/logger');
      if (res.statusCode >= 500) {
        logger.error('Request error', log);
      } else if (res.statusCode >= 400) {
        logger.warn('Request client error', log);
      }
    } catch(e) {}

    if (['POST','DELETE','PATCH'].includes(req.method) && res.statusCode < 400) {
      try {
        var dbRef = require('../db');
        var uuidFn = require('uuid').v4;
        dbRef.db.query(
          'INSERT INTO audit_logs (id, org_id, user_id, action, resource, resource_id, status, ip_address, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW())',
          [
            uuidFn(),
            req.orgId,
            (req.user && req.user.id) || null,
            req.method + ' ' + req.path,
            req.path.split('/')[2] || null,
            (req.body && req.body.id) || null,
            res.statusCode,
            req.ip,
          ]
        ).catch(function(err) { /* non-fatal */ });
      } catch(e) {}
    }
  });
  next();
};

module.exports = {
  helmetConfig,
  authLimiter,
  apiLimiter,
  corsConfig,
  cookieConfig,
  sanitizeRequest,
  requestIdMiddleware,
  auditLogger,
};
