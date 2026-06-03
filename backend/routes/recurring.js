// backend/routes/recurring.js
// Recurring invoice templates and purchase templates
const express = require('express');
const router  = express.Router();
const { v4: uuid } = require('uuid');
const { db } = require('../db');
const { requireAuth } = require('../auth');
const { sendSuccess, sendError } = require('../utils/response');

// ── Recurring Invoices ────────────────────────────────────────────────────────

router.get('/invoices', requireAuth, async (req, res) => {
  try {
    const rows = await db.query(
      `SELECT * FROM recurring_invoices
       WHERE org_id = $1 AND deleted_at IS NULL
       ORDER BY created_at DESC`,
      [req.orgId]
    ).then(r => r.rows);
    sendSuccess(res, rows);
  } catch (err) {
    console.error('Get recurring invoices error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

router.post('/invoices', requireAuth, async (req, res) => {
  try {
    const {
      name, customer_id, customer_name, frequency, amount,
      currency, next_run, auto_send, status, template_data,
    } = req.body;
    if (!name || !frequency) return sendError(res, 'Name and frequency required', 'VALIDATION_ERROR', 400);

    const id = uuid();
    await db.query(
      `INSERT INTO recurring_invoices
       (id, org_id, name, customer_id, customer_name, frequency, amount, currency,
        next_run, auto_send, status, template_data, created_by, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`,
      [id, req.orgId, name, customer_id || null, customer_name || '',
       frequency, amount || 0, currency || 'INR', next_run || null,
       auto_send || false, status || 'active',
       JSON.stringify(template_data || {}), req.user.id]
    );
    sendSuccess(res, { id });
  } catch (err) {
    console.error('Create recurring invoice error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

router.patch('/invoices/:id/status', requireAuth, async (req, res) => {
  try {
    const { status } = req.body;
    await db.query(
      `UPDATE recurring_invoices SET status=$1, updated_at=CURRENT_TIMESTAMP
       WHERE id=$2 AND org_id=$3`,
      [status, req.params.id, req.orgId]
    );
    sendSuccess(res, null);
  } catch (err) {
    console.error('Update recurring status error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

router.delete('/invoices/:id', requireAuth, async (req, res) => {
  try {
    await db.query(
      `UPDATE recurring_invoices SET deleted_at=CURRENT_TIMESTAMP
       WHERE id=$1 AND org_id=$2`,
      [req.params.id, req.orgId]
    );
    sendSuccess(res, null);
  } catch (err) {
    console.error('Delete recurring invoice error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

// ── Purchase Templates ────────────────────────────────────────────────────────

router.get('/purchase-templates', requireAuth, async (req, res) => {
  try {
    const rows = await db.query(
      `SELECT * FROM purchase_templates
       WHERE org_id = $1 AND deleted_at IS NULL
       ORDER BY created_at DESC`,
      [req.orgId]
    ).then(r => r.rows);
    sendSuccess(res, rows);
  } catch (err) {
    console.error('Get purchase templates error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

router.post('/purchase-templates', requireAuth, async (req, res) => {
  try {
    const { name, vendor_id, vendor_name, frequency, amount, currency, next_run, status, template_data } = req.body;
    if (!name || !frequency) return sendError(res, 'Name and frequency required', 'VALIDATION_ERROR', 400);

    const id = uuid();
    await db.query(
      `INSERT INTO purchase_templates
       (id, org_id, name, vendor_id, vendor_name, frequency, amount, currency,
        next_run, status, template_data, created_by, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`,
      [id, req.orgId, name, vendor_id || null, vendor_name || '',
       frequency, amount || 0, currency || 'INR', next_run || null,
       status || 'active', JSON.stringify(template_data || {}), req.user.id]
    );
    sendSuccess(res, { id });
  } catch (err) {
    console.error('Create purchase template error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

router.patch('/purchase-templates/:id/status', requireAuth, async (req, res) => {
  try {
    const { status } = req.body;
    await db.query(
      `UPDATE purchase_templates SET status=$1, updated_at=CURRENT_TIMESTAMP
       WHERE id=$2 AND org_id=$3`,
      [status, req.params.id, req.orgId]
    );
    sendSuccess(res, null);
  } catch (err) {
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

router.delete('/purchase-templates/:id', requireAuth, async (req, res) => {
  try {
    await db.query(
      `UPDATE purchase_templates SET deleted_at=CURRENT_TIMESTAMP WHERE id=$1 AND org_id=$2`,
      [req.params.id, req.orgId]
    );
    sendSuccess(res, null);
  } catch (err) {
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

module.exports = router;
