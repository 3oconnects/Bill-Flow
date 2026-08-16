// backend/auth.js
'use strict';
const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const { stmts, db } = require('./db');
const cache  = require('./utils/cache');

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
const TOKEN_BLACKLIST_PREFIX = 'bf:blacklist:';

function hashPassword(plain) {
  return bcrypt.hashSync(plain, 12);
}

function checkPassword(plain, hash) {
  return bcrypt.compareSync(plain, hash);
}

async function createSession(userId, orgId) {
  return jwt.sign({ uid: userId, oid: orgId }, _JWT_SECRET, { expiresIn: SESSION_DAYS + 'd' });
}

/**
 * Destroy a session by blacklisting the JWT in Redis.
 * The token is added to a blacklist with TTL matching its remaining lifetime.
 */
async function destroySession(token) {
  if (!token) return;
  try {
    const decoded = jwt.decode(token);
    if (decoded && decoded.exp) {
      const ttl = decoded.exp - Math.floor(Date.now() / 1000);
      if (ttl > 0) {
        await cache.set(TOKEN_BLACKLIST_PREFIX + token, '1', ttl);
      }
    }
  } catch {
    // Non-critical — token will expire naturally
  }
}

/**
 * Invalidate all sessions for a user by storing a "revoked-before" timestamp.
 * Any JWT issued before this timestamp will be rejected.
 */
async function destroyAllSessions(userId) {
  try {
    await cache.set(`bf:revoked_before:${userId}`, Math.floor(Date.now() / 1000), SESSION_DAYS * 24 * 3600);
  } catch {
    // Non-critical
  }
}

/**
 * Check if a token has been blacklisted or if the user's sessions were bulk-revoked.
 */
async function isTokenRevoked(token, decoded) {
  try {
    // Check individual blacklist
    const blacklisted = await cache.get(TOKEN_BLACKLIST_PREFIX + token);
    if (blacklisted) return true;

    // Check bulk revocation
    if (decoded && decoded.uid && decoded.iat) {
      const revokedBefore = await cache.get(`bf:revoked_before:${decoded.uid}`);
      if (revokedBefore && decoded.iat < parseInt(revokedBefore)) return true;
    }

    return false;
  } catch {
    return false; // Fail open if Redis is down
  }
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

    // Check token revocation (Redis-backed)
    const revoked = await isTokenRevoked(token, decoded);
    if (revoked) {
      return res.status(401).json({ error: 'Session has been invalidated. Please log in again.' });
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
  if (!req.user || !req.user.role || !['owner', 'admin'].includes(req.user.role.toLowerCase())) return res.status(403).json({ error: 'Admin access required' });
  next();
}

/**
 * Dynamic RBAC middleware.
 * Usage: router.post('/', requireAuth, requirePermission('invoices', 'create'), ...)
 */
function requirePermission(moduleName, action) {
  return async (req, res, next) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
      // Owners always bypass
      if (req.user.role.toLowerCase() === 'owner') return next();

      // Fetch role permissions from DB
      const { rows } = await db.query(
        `SELECT permissions FROM org_roles WHERE org_id = $1 AND LOWER(name) = LOWER($2) AND deleted_at IS NULL`,
        [req.orgId, req.user.role]
      );

      if (!rows.length) {
        return res.status(403).json({ error: 'Role not found or access denied' });
      }

      const permissions = rows[0].permissions || {};
      const modulePerms = permissions[moduleName] || [];

      if (!modulePerms.includes(action)) {
        return res.status(403).json({ error: `Requires '${action}' permission for '${moduleName}'` });
      }

      next();
    } catch (err) {
      console.error('requirePermission error:', err);
      res.status(500).json({ error: 'Failed to authorize action' });
    }
  };
}

module.exports = { hashPassword, checkPassword, createSession, destroySession, destroyAllSessions, isTokenRevoked, requireAuth, requireOwner, requireAdmin, requirePermission };
