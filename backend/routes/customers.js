// backend/routes/customers.js
const express = require('express');
const router = express.Router();
const { v4: uuid } = require('uuid');
const { stmts, db } = require('../db');
const { requireAuth, requireAdmin } = require('../auth');
const { sendSuccess, sendError } = require('../utils/response');

router.get('/', requireAuth, async (req, res) => {
  try {
    const customers = await stmts.getCustomers.all(req.orgId);
    sendSuccess(res, customers);
  } catch (err) {
    console.error('Get customers error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

router.get('/:id', requireAuth, async (req, res) => {
  try {
    const cust = await stmts.getCustomer.get(req.params.id, req.orgId);
    if (!cust) return sendError(res, 'Customer not found', 'NOT_FOUND', 404);
    sendSuccess(res, cust);
  } catch (err) {
    console.error('Get customer error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

router.post('/', requireAuth, async (req, res) => {
  try {
    const { name, email, phone, address, city, state, country, pincode, gstin, pan, currency, credit_limit, notes } = req.body;
    if (!name) return sendError(res, 'Name is required', 'VALIDATION_ERROR', 400);
    const id = uuid();
    await stmts.insertCustomer.run(id, req.orgId, name, email||'', phone||'', address||'', city||'', state||'', country||'India', pincode||'', gstin||'', pan||'', currency||'INR', credit_limit||0, notes||'', req.user.id);
    sendSuccess(res, { id });
  } catch (err) {
    console.error('Create customer error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { name, email, phone, address, city, state, country, pincode, gstin, pan, currency, credit_limit, notes } = req.body;
    if (!name) return sendError(res, 'Name is required', 'VALIDATION_ERROR', 400);
    await stmts.updateCustomer.run(name, email||'', phone||'', address||'', city||'', state||'', country||'India', pincode||'', gstin||'', pan||'', currency||'INR', credit_limit||0, notes||'', req.params.id, req.orgId);
    sendSuccess(res, null);
  } catch (err) {
    console.error('Update customer error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    await stmts.deleteCustomer.run(req.params.id, req.orgId);
    sendSuccess(res, null);
  } catch (err) {
    console.error('Delete customer error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

module.exports = router;
