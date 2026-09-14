// backend/routes/payments.js
'use strict';
const express = require('express');
const router  = express.Router();
const { db }  = require('../db');
const { requireAuth, requireAdmin } = require('../auth');
const { sendSuccess, sendError }    = require('../utils/response');
const PaymentAllocationService      = require('../services/paymentAllocationService');

// List payments / receipts (paginated)
router.get('/', requireAuth, async (req, res) => {
  try {
    const page   = Math.max(1, parseInt(req.query.page)  || 1);
    const limit  = Math.min(200, parseInt(req.query.limit) || 100);
    const offset = (page - 1) * limit;
    const { rows } = await db.query(
      `SELECT p.id, p.org_id, p.invoice_id, p.customer_id, p.amount,
              p.allocated_amount, p.unapplied_amount, p.payment_date AS date,
              p.currency, p.method, p.reference, p.notes, p.status, p.created_at,
              p.receipt_number, p.bank_name, p.cheque_number, p.cheque_date,
              p.transaction_id, p.terms, p.payment_details, p.created_by,
              i.number AS invoice_number, i.date AS invoice_date, i.total AS invoice_total,
              c.name AS customer_name, c.email AS customer_email, c.phone AS customer_phone,
              c.address AS customer_address, c.gstin AS customer_gstin,
              COALESCE(
                STRING_AGG(i_alloc.number, ', '),
                i.number,
                '—'
              ) AS allocated_invoices
         FROM payments p
         LEFT JOIN invoices  i ON p.invoice_id  = i.id
         LEFT JOIN customers c ON p.customer_id = c.id
         LEFT JOIN payment_allocations pa ON p.id = pa.payment_id
         LEFT JOIN invoices i_alloc ON pa.invoice_id = i_alloc.id
        WHERE p.org_id = $1 AND p.deleted_at IS NULL
        GROUP BY p.id, i.number, i.date, i.total, c.name, c.email, c.phone, c.address, c.gstin
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

// Create payment / receipt with full allocation
router.post('/', requireAuth, async (req, res) => {
  try {
    const {
      customer_id, amount, date, currency, method, reference, notes,
      allocation_details, invoice_id, receipt_number, bank_name,
      cheque_number, cheque_date, transaction_id, terms, payment_details
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
      {
        reference: reference || transaction_id || '',
        notes: notes || '',
        currency: currency || 'INR',
        created_by: req.user.id,
        receipt_number,
        bank_name,
        cheque_number,
        cheque_date,
        transaction_id,
        terms,
        payment_details,
      }
    );
    sendSuccess(res, result);
  } catch (err) {
    console.error('Create payment error:', err);
    if (err.message && err.message.includes('Overpayment'))
      return sendError(res, err.message, 'OVERPAYMENT_ERROR', 422);
    if (err.message && err.message.includes('not found'))
      return sendError(res, err.message, 'NOT_FOUND', 404);
    sendError(res, err.message || 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

// Get single payment / receipt with allocations and customer/invoice details
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT p.*,
              p.payment_date AS date,
              i.number  AS invoice_number,
              i.date    AS invoice_date,
              i.total   AS invoice_total,
              i.paid_amount AS invoice_paid_amount,
              i.status  AS invoice_status,
              i.due_date AS invoice_due_date,
              c.name    AS customer_name,
              c.email   AS customer_email,
              c.phone   AS customer_phone,
              c.address AS customer_address,
              c.gstin   AS customer_gstin
         FROM payments p
         LEFT JOIN invoices  i ON p.invoice_id  = i.id
         LEFT JOIN customers c ON p.customer_id = c.id
        WHERE p.id = $1 AND p.org_id = $2 AND p.deleted_at IS NULL`,
      [req.params.id, req.orgId]
    );
    if (!rows.length) return sendError(res, 'Payment not found', 'NOT_FOUND', 404);

    const allocations = await db.query(
      `SELECT pa.*, i.number AS invoice_number, i.date AS invoice_date, i.total AS invoice_total,
              i.paid_amount AS invoice_paid_amount, i.customer_name,
              i.status AS invoice_status
         FROM payment_allocations pa
         JOIN invoices i ON pa.invoice_id = i.id
        WHERE pa.payment_id = $1
        ORDER BY pa.created_at ASC`,
      [req.params.id]
    );
    sendSuccess(res, { ...rows[0], allocations: allocations.rows });
  } catch (err) {
    console.error('Get payment error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

// Update payment / receipt details (metadata only — status changes must go
// through /cancel or /reverse so invoice allocations stay consistent)
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const {
      receipt_number, bank_name, cheque_number, cheque_date,
      transaction_id, method, notes, terms, reference
    } = req.body;

    const { rowCount } = await db.query(
      `UPDATE payments
          SET receipt_number = COALESCE($1, receipt_number),
              bank_name = COALESCE($2, bank_name),
              cheque_number = COALESCE($3, cheque_number),
              cheque_date = COALESCE($4, cheque_date),
              transaction_id = COALESCE($5, transaction_id),
              method = COALESCE($6, method),
              notes = COALESCE($7, notes),
              terms = COALESCE($8, terms),
              reference = COALESCE($9, reference),
              updated_at = CURRENT_TIMESTAMP
        WHERE id = $10 AND org_id = $11 AND deleted_at IS NULL`,
      [
        receipt_number || null, bank_name || null, cheque_number || null,
        cheque_date || null, transaction_id || null, method || null,
        notes || null, terms || null, reference || null,
        req.params.id, req.orgId
      ]
    );
    if (!rowCount) return sendError(res, 'Payment not found', 'NOT_FOUND', 404);
    sendSuccess(res, { updated: true });
  } catch (err) {
    console.error('Update payment error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

// Cancel receipt (preserves record for audit compliance, reverses invoice allocations)
router.post('/:id/cancel', requireAuth, requireAdmin, async (req, res) => {
  try {
    const result = await PaymentAllocationService.cancelPayment(req.orgId, req.params.id);
    sendSuccess(res, result);
  } catch (err) {
    console.error('Cancel receipt error:', err);
    sendError(res, err.message || 'Internal server error', 'INTERNAL_ERROR', 500);
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
