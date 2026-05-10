// backend/auth.js
const bcrypt = require('bcryptjs');
const { v4: uuid } = require('uuid');
const { stmts } = require('./db');

const SESSION_DAYS = 7;

function hashPassword(plain) {
  return bcrypt.hashSync(plain, 12);
}

function checkPassword(plain, hash) {
  return bcrypt.compareSync(plain, hash);
}

async function createSession(userId, orgId) {
  const token = uuid() + uuid();
  const expires = new Date();
  expires.setDate(expires.getDate() + SESSION_DAYS);
  await stmts.insertSession.run(token, userId, orgId, expires.toISOString());
  return token;
}

async function destroySession(token) {
  if (token) await stmts.deleteSession.run(token);
}

// Express middleware — attaches req.user and req.orgId if valid session
async function requireAuth(req, res, next) {
  try {
    const token = req.cookies?.bf_session;
    if (!token) return res.status(401).json({ error: 'Not authenticated' });

    const session = await stmts.getSession.get(token);
    if (!session) return res.status(401).json({ error: 'Session expired' });

    const user = await stmts.getUserById.get(session.user_id);
    if (!user || !user.is_active) return res.status(401).json({ error: 'Account inactive' });

    req.user = user;
    req.orgId = session.org_id;
    next();
  } catch (err) {
    console.error('Auth middleware error:', err);
    res.status(500).json({ error: 'Authentication internal error' });
  }
}

// Owner-only actions
function requireOwner(req, res, next) {
  if (req.user?.role !== 'owner') return res.status(403).json({ error: 'Owner access required' });
  next();
}

// Admin or owner
function requireAdmin(req, res, next) {
  if (!['owner', 'admin'].includes(req.user?.role)) return res.status(403).json({ error: 'Admin access required' });
  next();
}

module.exports = { hashPassword, checkPassword, createSession, destroySession, requireAuth, requireOwner, requireAdmin };
