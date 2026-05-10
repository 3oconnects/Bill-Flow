// backend/routes/payments.js
const express = require('express');
const router = express.Router();
const { v4: uuid } = require('uuid');
const { stmts } = require('../db');
const { requireAuth, requireAdmin } = require('../auth');
const { sendSuccess, sendError } = require('../utils/response');

router.get('/', requireAuth, async (req, res) => {
  try {
    const payments = await stmts.getPayments.all(req.orgId);
    sendSuccess(res, payments);
  } catch (err) {
    console.error('Get payments error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

router.post('/', requireAuth, async (req, res) => {
  try {
    const { invoice_id, amount, date, currency, method, reference, notes } = req.body;
    if (!amount || !date) return sendError(res, 'Amount and date required', 'VALIDATION_ERROR', 400);
    const id = uuid();
    await stmts.insertPayment.run(id, req.orgId, invoice_id||null, amount, date, currency||'INR', method||'bank_transfer', reference||'', notes||'', req.user.id);
    sendSuccess(res, { id });
  } catch (err) {
    console.error('Create payment error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    await stmts.deletePayment.run(req.params.id, req.orgId);
    sendSuccess(res, null);
  } catch (err) {
    console.error('Delete payment error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

module.exports = router;
