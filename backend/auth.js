// backend/auth.js
'use strict';
const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const { stmts } = require('./db');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    console.error('[FATAL] JWT_SECRET env var not set. Exiting.');
    process.exit(1);
  }
  console.warn('[WARN] JWT_SECRET not set — using insecure dev fallback. DO NOT use in production.');
}
const _JWT_SECRET = JWT_SECRET || 'dev-insecure-secret-do-not-use-in-production';
const SESSION_DAYS = 7;

function hashPassword(plain) {
  return bcrypt.hashSync(plain, 12);
}

function checkPassword(plain, hash) {
  return bcrypt.compareSync(plain, hash);
}

async function createSession(userId, orgId) {
  return jwt.sign({ uid: userId, oid: orgId }, _JWT_SECRET, { expiresIn: SESSION_DAYS + 'd' });
}

async function destroySession(token) {
  return Promise.resolve();
}

// Dev superadmin stub
const DEV_USER_STUB = {
  id: 'dev-superadmin-000', org_id: 'dev-org-000',
  name: 'Dev SuperAdmin', email: 'admin@ozofi.com',
  role: 'owner', is_active: 1, password_hash: '',
};

async function requireAuth(req, res, next) {
  try {
    const token = req.cookies && req.cookies.bf_session;
    if (!token) return res.status(401).json({ error: 'Not authenticated' });

    let decoded;
    try {
      decoded = jwt.verify(token, _JWT_SECRET);
    } catch (e) {
      return res.status(401).json({ error: 'Session invalid or expired' });
    }

    if (process.env.NODE_ENV !== 'production' && decoded.uid === 'dev-superadmin-000') {
      req.user  = DEV_USER_STUB;
      req.orgId = 'dev-org-000';
      return next();
    }

    const user = await stmts.getUserById.get(decoded.uid);
    if (!user || !user.is_active) return res.status(401).json({ error: 'Account inactive' });

    req.user  = user;
    req.orgId = decoded.oid;
    next();
  } catch (err) {
    console.error('Auth middleware error:', err);
    res.status(500).json({ error: 'Authentication internal error' });
  }
}

function requireOwner(req, res, next) {
  if (!req.user || req.user.role !== 'owner') return res.status(403).json({ error: 'Owner access required' });
  next();
}

function requireAdmin(req, res, next) {
  if (!req.user || !['owner', 'admin'].includes(req.user.role)) return res.status(403).json({ error: 'Admin access required' });
  next();
}

module.exports = { hashPassword, checkPassword, createSession, destroySession, requireAuth, requireOwner, requireAdmin };
