// backend/routes/payments.js
'use strict';
const express = require('express');
const router  = express.Router();
const { db }  = require('../db');
const { requireAuth, requireAdmin } = require('../auth');
const { sendSuccess, sendError }    = require('../utils/response');
const PaymentAllocationService      = require('../services/paymentAllocationService');

// List payments (paginated)
router.get('/', requireAuth, async (req, res) => {
  try {
    const page   = Math.max(1, parseInt(req.query.page)  || 1);
    const limit  = Math.min(200, parseInt(req.query.limit) || 100);
    const offset = (page - 1) * limit;
    const { rows } = await db.query(
      `SELECT p.id, p.org_id, p.invoice_id, p.customer_id, p.amount,
              p.allocated_amount, p.unapplied_amount, p.payment_date AS date,
              p.currency, p.method, p.reference, p.notes, p.status, p.created_at,
              i.number AS invoice_number, c.name AS customer_name
         FROM payments p
         LEFT JOIN invoices  i ON p.invoice_id  = i.id
         LEFT JOIN customers c ON p.customer_id = c.id
        WHERE p.org_id = $1 AND p.deleted_at IS NULL
        ORDER BY p.payment_date DESC, p.created_at DESC
        LIMIT $2 OFFSET $3`,
      [req.orgId, limit, offset]
    );
    sendSuccess(res, { data: rows, page, limit });
  } catch (err) {
    console.error('Get payments error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

// Create payment with full allocation
router.post('/', requireAuth, async (req, res) => {
  try {
    const {
      customer_id, amount, date, currency, method, reference, notes,
      allocation_details, invoice_id,
    } = req.body;

    if (!amount || !date)
      return sendError(res, 'Amount and date required', 'VALIDATION_ERROR', 400);
    if (parseFloat(amount) <= 0)
      return sendError(res, 'Amount must be positive', 'VALIDATION_ERROR', 400);

    let allocationMap = allocation_details || {};
    if (invoice_id && Object.keys(allocationMap).length === 0) {
      allocationMap = { [invoice_id]: { amount: parseFloat(amount), notes: notes || '' } };
    }

    const result = await PaymentAllocationService.createPaymentWithAllocation(
      req.orgId, customer_id || null, parseFloat(amount), date,
      method || 'bank_transfer', allocationMap,
      { reference: reference || '', notes: notes || '', currency: currency || 'INR', created_by: req.user.id }
    );
    sendSuccess(res, result);
  } catch (err) {
    console.error('Create payment error:', err);
    if (err.message && err.message.includes('Overpayment'))
      return sendError(res, err.message, 'OVERPAYMENT_ERROR', 422);
    if (err.message && err.message.includes('not found'))
      return sendError(res, err.message, 'NOT_FOUND', 404);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

// Get single payment with allocations
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT p.*, i.number AS invoice_number, c.name AS customer_name
         FROM payments p
         LEFT JOIN invoices  i ON p.invoice_id  = i.id
         LEFT JOIN customers c ON p.customer_id = c.id
        WHERE p.id = $1 AND p.org_id = $2 AND p.deleted_at IS NULL`,
      [req.params.id, req.orgId]
    );
    if (!rows.length) return sendError(res, 'Payment not found', 'NOT_FOUND', 404);
    const allocations = await db.query(
      `SELECT pa.*, i.number AS invoice_number
         FROM payment_allocations pa
         JOIN invoices i ON pa.invoice_id = i.id
        WHERE pa.payment_id = $1`,
      [req.params.id]
    );
    sendSuccess(res, { ...rows[0], allocations: allocations.rows });
  } catch (err) {
    console.error('Get payment error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

// Reverse payment
router.post('/:id/reverse', requireAuth, requireAdmin, async (req, res) => {
  try {
    const result = await PaymentAllocationService.reversePayment(req.orgId, req.params.id);
    sendSuccess(res, result);
  } catch (err) {
    console.error('Reverse payment error:', err);
    sendError(res, err.message || 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

// Apply unapplied balance to open invoices
router.post('/apply-unapplied/:customerId', requireAuth, async (req, res) => {
  try {
    const result = await PaymentAllocationService.applyUnappliedBalance(req.orgId, req.params.customerId);
    sendSuccess(res, result);
  } catch (err) {
    console.error('Apply unapplied error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

// Delete (soft) — reverse allocations first
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    await PaymentAllocationService.reversePayment(req.orgId, req.params.id);
    await db.query(
      'UPDATE payments SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1 AND org_id = $2',
      [req.params.id, req.orgId]
    );
    sendSuccess(res, null);
  } catch (err) {
    console.error('Delete payment error:', err);
    sendError(res, err.message || 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

module.exports = router;
