// backend/routes/vendorPayments.js
// Vendor-side payments. Mirrors the customer payments route but applies
// against ap_invoices.paid_amount and bumps the AP invoice status.
'use strict';
const express = require('express');
const router  = express.Router();
const { v4: uuid } = require('uuid');
const { db } = require('../db');
const { requireAuth } = require('../auth');
const { sendSuccess, sendError } = require('../utils/response');

router.get('/', requireAuth, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT vp.id, vp.org_id, vp.vendor_id, vp.vendor_name, vp.ap_invoice_id,
              vp.ap_invoice_no, vp.amount, vp.date, vp.currency, vp.method,
              vp.reference, vp.notes, vp.created_at,
              ai.total_amount AS ap_invoice_total
         FROM vendor_payments vp
         LEFT JOIN ap_invoices ai ON ai.id = vp.ap_invoice_id
        WHERE vp.org_id = $1 AND vp.deleted_at IS NULL
        ORDER BY vp.date DESC, vp.created_at DESC`,
      [req.orgId]
    );
    sendSuccess(res, rows);
  } catch (err) {
    console.error('Get vendor payments error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

router.post('/', requireAuth, async (req, res) => {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const {
      vendor_id, vendor_name, ap_invoice_id, ap_invoice_no,
      amount, date, currency, method, reference, notes,
    } = req.body;

    const amt = parseFloat(amount);
    if (!amt || amt <= 0) {
      await client.query('ROLLBACK');
      return sendError(res, 'Amount must be > 0', 'VALIDATION_ERROR', 400);
    }
    if (!date) {
      await client.query('ROLLBACK');
      return sendError(res, 'Date required', 'VALIDATION_ERROR', 400);
    }

    let resolvedInvNo = ap_invoice_no || null;
    let resolvedVendorId = vendor_id || null;
    let resolvedVendorName = vendor_name || '';

    // If linked to an AP invoice, lock the row + apply payment + status update.
    if (ap_invoice_id) {
      const inv = await client.query(
        `SELECT id, doc_no, vendor_id, vendor_name,
                COALESCE(total_amount,0) AS total,
                COALESCE(paid_amount,0) AS paid,
                status
           FROM ap_invoices
          WHERE id=$1 AND org_id=$2 AND deleted_at IS NULL
          FOR UPDATE`,
        [ap_invoice_id, req.orgId]
      );
      if (!inv.rowCount) {
        await client.query('ROLLBACK');
        return sendError(res, 'AP invoice not found', 'NOT_FOUND', 404);
      }
      const r = inv.rows[0];
      const outstanding = parseFloat(r.total) - parseFloat(r.paid);
      if (amt > outstanding + 0.01) {
        await client.query('ROLLBACK');
        return sendError(
          res,
          `Amount (${amt.toFixed(2)}) exceeds outstanding balance (${outstanding.toFixed(2)})`,
          'VALIDATION_ERROR', 422
        );
      }
      const newPaid = parseFloat(r.paid) + amt;
      const newStatus =
        newPaid >= parseFloat(r.total) - 0.01 ? 'paid' :
        newPaid > 0                            ? 'partially_paid' :
        r.status;
      await client.query(
        `UPDATE ap_invoices SET paid_amount=$1, status=$2, updated_at=NOW() WHERE id=$3`,
        [newPaid, newStatus, ap_invoice_id]
      );
      resolvedInvNo      = resolvedInvNo || r.doc_no;
      resolvedVendorId   = resolvedVendorId || r.vendor_id;
      resolvedVendorName = resolvedVendorName || r.vendor_name;
    }

    const id = uuid();
    await client.query(
      `INSERT INTO vendor_payments
       (id, org_id, vendor_id, vendor_name, ap_invoice_id, ap_invoice_no,
        amount, date, currency, method, reference, notes, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
      [
        id, req.orgId,
        resolvedVendorId, resolvedVendorName,
        ap_invoice_id || null, resolvedInvNo,
        amt, date, currency || 'INR',
        method || 'bank_transfer', reference || null, notes || null,
        req.user.id,
      ]
    );

    await client.query('COMMIT');
    sendSuccess(res, { id });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Create vendor payment error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  } finally {
    client.release();
  }
});

router.delete('/:id', requireAuth, async (req, res) => {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const p = await client.query(
      `SELECT id, ap_invoice_id, amount
         FROM vendor_payments
        WHERE id=$1 AND org_id=$2 AND deleted_at IS NULL`,
      [req.params.id, req.orgId]
    );
    if (!p.rowCount) {
      await client.query('ROLLBACK');
      return sendError(res, 'Payment not found', 'NOT_FOUND', 404);
    }
    const row = p.rows[0];
    if (row.ap_invoice_id) {
      const inv = await client.query(
        `SELECT total_amount, paid_amount FROM ap_invoices WHERE id=$1 FOR UPDATE`,
        [row.ap_invoice_id]
      );
      if (inv.rowCount) {
        const newPaid = Math.max(0, parseFloat(inv.rows[0].paid_amount) - parseFloat(row.amount));
        const newStatus = newPaid >= parseFloat(inv.rows[0].total_amount) - 0.01
          ? 'paid'
          : newPaid > 0 ? 'partially_paid' : 'approved';
        await client.query(
          `UPDATE ap_invoices SET paid_amount=$1, status=$2, updated_at=NOW() WHERE id=$3`,
          [newPaid, newStatus, row.ap_invoice_id]
        );
      }
    }
    await client.query(
      `UPDATE vendor_payments SET deleted_at=NOW() WHERE id=$1 AND org_id=$2`,
      [req.params.id, req.orgId]
    );
    await client.query('COMMIT');
    sendSuccess(res, null);
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Delete vendor payment error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  } finally {
    client.release();
  }
});

module.exports = router;
