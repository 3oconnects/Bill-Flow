// backend/routes/auth.js
const express = require('express');
const router = express.Router();
const { v4: uuid } = require('uuid');
const { stmts } = require('../db');
const { hashPassword, checkPassword, createSession, destroySession, requireAuth } = require('../auth');
const { sendSuccess, sendError } = require('../utils/response');

// Register (creates org + owner user)
router.post('/register', async (req, res) => {
  try {
    const { orgName, name, email, password } = req.body;
    if (!orgName || !name || !email || !password)
      return sendError(res, 'All fields are required', 'VALIDATION_ERROR', 400);
    if (password.length < 8)
      return sendError(res, 'Password must be at least 8 characters', 'VALIDATION_ERROR', 400);
    if (await stmts.getUserByEmail.get(email))
      return sendError(res, 'Email already registered', 'CONFLICT', 409);

    const orgId = uuid();
    const userId = uuid();
    // 1. Create Org with NULL creator first (resolves circular FK dependency)
    await stmts.insertOrg.run(orgId, orgName, email, '', 'Tamil Nadu', 'INR', 'INV-', null);
    // 2. Create User
    await stmts.insertUser.run(userId, orgId, name, email, hashPassword(password), 'owner', userId);
    // 3. Link User as Org Creator
    await stmts.setOrgCreator.run(userId, orgId);

    const token = await createSession(userId, orgId);
    res.cookie('bf_session', token, { httpOnly: true, maxAge: 7 * 24 * 3600 * 1000, sameSite: 'lax' });
    const org = await stmts.getOrg.get(orgId);
    sendSuccess(res, { user: { id: userId, name, email, role: 'owner' }, org });
  } catch (err) {
    console.error('Register error:', err);
    sendError(res, 'Internal server error during registration', 'INTERNAL_ERROR', 500);
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return sendError(res, 'Email and password required', 'VALIDATION_ERROR', 400);

    const user = await stmts.getUserByEmail.get(email);
    if (!user || !checkPassword(password, user.password_hash))
      return sendError(res, 'Invalid email or password', 'AUTH_FAILED', 401);
    if (!user.is_active)
      return sendError(res, 'Account has been deactivated', 'FORBIDDEN', 403);

    await stmts.updateLastLogin.run(user.id);
    const token = await createSession(user.id, user.org_id);
    res.cookie('bf_session', token, { httpOnly: true, maxAge: 7 * 24 * 3600 * 1000, sameSite: 'lax' });
    const org = await stmts.getOrg.get(user.org_id);
    sendSuccess(res, { user: { id: user.id, name: user.name, email: user.email, role: user.role }, org });
  } catch (err) {
    console.error('Login error:', err);
    sendError(res, 'Internal server error during login', 'INTERNAL_ERROR', 500);
  }
});

// Logout
router.post('/logout', async (req, res) => {
  try {
    await destroySession(req.cookies?.bf_session);
    res.clearCookie('bf_session');
    sendSuccess(res, null);
  } catch (err) {
    console.error('Logout error:', err);
    sendError(res, 'Internal server error during logout', 'INTERNAL_ERROR', 500);
  }
});

// Session check
router.get('/me', requireAuth, async (req, res) => {
  try {
    const org = await stmts.getOrg.get(req.orgId);
    sendSuccess(res, { user: { id: req.user.id, name: req.user.name, email: req.user.email, role: req.user.role }, org });
  } catch (err) {
    console.error('Session check error:', err);
    sendError(res, 'Internal server error checking session', 'INTERNAL_ERROR', 500);
  }
});

// Change password
router.post('/change-password', requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!checkPassword(currentPassword, req.user.password_hash))
      return sendError(res, 'Current password incorrect', 'VALIDATION_ERROR', 400);
    if (newPassword.length < 8)
      return sendError(res, 'New password must be at least 8 characters', 'VALIDATION_ERROR', 400);
    await stmts.updatePassword.run(hashPassword(newPassword), req.user.id);
    sendSuccess(res, null);
  } catch (err) {
    console.error('Change password error:', err);
    sendError(res, 'Internal server error changing password', 'INTERNAL_ERROR', 500);
  }
});

module.exports = router;
