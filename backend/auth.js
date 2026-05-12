// backend/auth.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { stmts } = require('./db');

const JWT_SECRET = process.env.JWT_SECRET || 'billflow-pro-secret-key-123';
const SESSION_DAYS = 7;

function hashPassword(plain) {
  return bcrypt.hashSync(plain, 12);
}

function checkPassword(plain, hash) {
  return bcrypt.compareSync(plain, hash);
}

async function createSession(userId, orgId) {
  // Use JWT instead of database-backed sessions for better scalability and security
  return jwt.sign({ uid: userId, oid: orgId }, JWT_SECRET, { expiresIn: `${SESSION_DAYS}d` });
}

async function destroySession(token) {
  // JWTs are stateless, but we could blacklist them if needed. 
  // For now, clearing the cookie on the client is sufficient.
  return Promise.resolve();
}

// Express middleware — attaches req.user and req.orgId if valid JWT
async function requireAuth(req, res, next) {
  try {
    const token = req.cookies?.bf_session;
    if (!token) return res.status(401).json({ error: 'Not authenticated' });

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (e) {
      return res.status(401).json({ error: 'Session invalid or expired' });
    }

    const user = await stmts.getUserById.get(decoded.uid);
    if (!user || !user.is_active) return res.status(401).json({ error: 'Account inactive' });

    req.user = user;
    req.orgId = decoded.oid;
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
