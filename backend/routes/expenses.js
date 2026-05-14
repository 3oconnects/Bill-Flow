// backend/routes/expenses.js
const express = require('express');
const router = express.Router();
const { v4: uuid } = require('uuid');
const { stmts, db } = require('../db');
const { requireAuth, requireAdmin } = require('../auth');
const { sendSuccess, sendError } = require('../utils/response');

router.get('/', requireAuth, async (req, res) => {
  try {
    const expenses = await stmts.getExpenses.all(req.orgId);
    sendSuccess(res, expenses);
  } catch (err) {
    console.error('Get expenses error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

router.post('/', requireAuth, async (req, res) => {
  try {
    const { description, amount, date, category, vendor_id, reference, currency, gst_rate, notes } = req.body;
    if (!description || !amount || !date) return sendError(res, 'Description, amount and date required', 'VALIDATION_ERROR', 400);
    const id = uuid();
    await stmts.insertExpense.run(id, req.orgId, description, amount, date, category||'other', vendor_id||null, '', reference||'', currency||'INR', gst_rate||0, notes||'', req.user.id);
    sendSuccess(res, { id });
  } catch (err) {
    console.error('Create expense error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { description, amount, date, category, vendor_id, reference, currency, gst_rate, notes } = req.body;
    await stmts.updateExpense.run(description, amount, date, category||'other', vendor_id||null, '', reference||'', currency||'INR', gst_rate||0, notes||'', req.params.id, req.orgId);
    sendSuccess(res, null);
  } catch (err) {
    console.error('Update expense error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    await stmts.deleteExpense.run(req.params.id, req.orgId);
    sendSuccess(res, null);
  } catch (err) {
    console.error('Delete expense error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

module.exports = router;
