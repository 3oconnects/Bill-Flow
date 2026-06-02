/**
 * Rate Limiting Middleware
 * Prevents brute force attacks and DDoS
 */

const rateLimit = require('express-rate-limit');

// ============================================
// AUTH RATE LIMITERS
// ============================================

/**
 * Strict rate limit for login attempts
 * 5 attempts per 15 minutes per IP
 */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // max 5 requests per windowMs
  message: {
    success: false,
    message: 'Too many login attempts. Please try again after 15 minutes.',
  },
  standardHeaders: true, // Return rate limit info in RateLimit-* headers
  legacyHeaders: false, // Disable X-RateLimit-* headers
  keyGenerator: (req) => req.ip, // Use IP address
  skip: (req) => req.user !== undefined, // Don't limit authenticated users
});

/**
 * Register rate limit
 * 3 attempts per hour per IP
 */
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message: {
    success: false,
    message: 'Too many accounts created. Please try again after 1 hour.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip,
});

/**
 * Password reset rate limit
 * 3 attempts per hour per IP
 */
const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message: {
    success: false,
    message: 'Too many password reset requests. Please try again after 1 hour.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip,
});

// ============================================
// API RATE LIMITERS
// ============================================

/**
 * General API rate limit
 * 100 requests per 15 minutes per IP (authenticated users)
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: {
    success: false,
    message: 'Too many requests. Please try again after 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Use org_id + user_id if authenticated, otherwise IP
    if (req.user) {
      return `${req.user.org_id}:${req.user.id}`;
    }
    return req.ip;
  },
  skip: (req) => !req.user, // Skip if not authenticated
});

/**
 * Strict API limit for sensitive operations
 * 10 requests per minute per user (invoices, payments, vendors, etc.)
 */
const sensitiveOpLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  message: {
    success: false,
    message: 'Too many requests. Please slow down.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    if (req.user) {
      return `${req.user.org_id}:${req.user.id}`;
    }
    return req.ip;
  },
  skip: (req) => !req.user,
});

/**
 * Report generation rate limit
 * Heavy queries: 5 per 5 minutes
 */
const reportLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 5,
  message: {
    success: false,
    message: 'Report generation throttled. Please try again in a few minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    if (req.user) {
      return `${req.user.org_id}:${req.user.id}`;
    }
    return req.ip;
  },
  skip: (req) => !req.user,
});

/**
 * File upload rate limit
 * 20 uploads per hour per user
 */
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  message: {
    success: false,
    message: 'Upload limit exceeded. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    if (req.user) {
      return `${req.user.org_id}:${req.user.id}`;
    }
    return req.ip;
  },
  skip: (req) => !req.user,
});

module.exports = {
  loginLimiter,
  registerLimiter,
  forgotPasswordLimiter,
  apiLimiter,
  sensitiveOpLimiter,
  reportLimiter,
  uploadLimiter,
};
