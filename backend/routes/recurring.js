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

router.get('/invoices/:id', requireAuth, async (req, res) => {
  try {
    const row = await db.query(
      `SELECT * FROM recurring_invoices
       WHERE id=$1 AND org_id=$2 AND deleted_at IS NULL`,
      [req.params.id, req.orgId]
    ).then(r => r.rows[0]);
    if (!row) return sendError(res, 'Recurring invoice not found', 'NOT_FOUND', 404);
    sendSuccess(res, row);
  } catch (err) {
    console.error('Get recurring invoice error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

router.post('/invoices', requireAuth, async (req, res) => {
  try {
    const {
      name, customer_id, customer_name, frequency, amount,
      currency, next_run, end_date, auto_send, status, template_data,
    } = req.body;
    if (!name || !frequency)
      return sendError(res, 'Name and frequency required', 'VALIDATION_ERROR', 400);
    if (!next_run)
      return sendError(res, 'Start date / next run is required', 'VALIDATION_ERROR', 400);

    const id = uuid();
    await db.query(
      `INSERT INTO recurring_invoices
       (id, org_id, name, customer_id, customer_name, frequency, amount, currency,
        next_run, end_date, auto_send, status, template_data, created_by, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`,
      [id, req.orgId, name, customer_id || null, customer_name || '',
       frequency, amount || 0, currency || 'INR', next_run, end_date || null,
       auto_send || false, status || 'active',
       JSON.stringify(template_data || {}), req.user.id]
    );
    sendSuccess(res, { id });
  } catch (err) {
    console.error('Create recurring invoice error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

router.put('/invoices/:id', requireAuth, async (req, res) => {
  try {
    const {
      name, customer_id, customer_name, frequency, amount,
      currency, next_run, end_date, auto_send, status, template_data,
    } = req.body;
    if (!name || !frequency)
      return sendError(res, 'Name and frequency required', 'VALIDATION_ERROR', 400);
    const r = await db.query(
      `UPDATE recurring_invoices
         SET name=$1, customer_id=$2, customer_name=$3, frequency=$4, amount=$5,
             currency=$6, next_run=$7, end_date=$8, auto_send=$9, status=$10,
             template_data=$11, updated_at=CURRENT_TIMESTAMP
       WHERE id=$12 AND org_id=$13 AND deleted_at IS NULL`,
      [name, customer_id || null, customer_name || '', frequency, amount || 0,
       currency || 'INR', next_run || null, end_date || null,
       !!auto_send, status || 'active',
       JSON.stringify(template_data || {}), req.params.id, req.orgId]
    );
    if (!r.rowCount) return sendError(res, 'Recurring invoice not found', 'NOT_FOUND', 404);
    sendSuccess(res, null);
  } catch (err) {
    console.error('Update recurring invoice error:', err);
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

// Run history for a single template
router.get('/invoices/:id/runs', requireAuth, async (req, res) => {
  try {
    const rows = await db.query(
      `SELECT * FROM recurring_runs
       WHERE org_id=$1 AND template_type='invoice' AND template_id=$2
       ORDER BY run_date DESC LIMIT 50`,
      [req.orgId, req.params.id]
    ).then(r => r.rows);
    sendSuccess(res, rows);
  } catch (err) {
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

router.get('/purchase-templates/:id', requireAuth, async (req, res) => {
  try {
    const row = await db.query(
      `SELECT * FROM purchase_templates
       WHERE id=$1 AND org_id=$2 AND deleted_at IS NULL`,
      [req.params.id, req.orgId]
    ).then(r => r.rows[0]);
    if (!row) return sendError(res, 'Template not found', 'NOT_FOUND', 404);
    sendSuccess(res, row);
  } catch (err) {
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

router.post('/purchase-templates', requireAuth, async (req, res) => {
  try {
    const {
      name, vendor_id, vendor_name, frequency, amount, currency,
      next_run, end_date, status, template_data,
    } = req.body;
    if (!name || !frequency)
      return sendError(res, 'Name and frequency required', 'VALIDATION_ERROR', 400);
    if (!next_run)
      return sendError(res, 'Start date / next run is required', 'VALIDATION_ERROR', 400);

    const id = uuid();
    await db.query(
      `INSERT INTO purchase_templates
       (id, org_id, name, vendor_id, vendor_name, frequency, amount, currency,
        next_run, end_date, status, template_data, created_by, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`,
      [id, req.orgId, name, vendor_id || null, vendor_name || '',
       frequency, amount || 0, currency || 'INR', next_run, end_date || null,
       status || 'active', JSON.stringify(template_data || {}), req.user.id]
    );
    sendSuccess(res, { id });
  } catch (err) {
    console.error('Create purchase template error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

router.put('/purchase-templates/:id', requireAuth, async (req, res) => {
  try {
    const {
      name, vendor_id, vendor_name, frequency, amount, currency,
      next_run, end_date, status, template_data,
    } = req.body;
    if (!name || !frequency)
      return sendError(res, 'Name and frequency required', 'VALIDATION_ERROR', 400);
    const r = await db.query(
      `UPDATE purchase_templates
         SET name=$1, vendor_id=$2, vendor_name=$3, frequency=$4, amount=$5,
             currency=$6, next_run=$7, end_date=$8, status=$9, template_data=$10,
             updated_at=CURRENT_TIMESTAMP
       WHERE id=$11 AND org_id=$12 AND deleted_at IS NULL`,
      [name, vendor_id || null, vendor_name || '', frequency, amount || 0,
       currency || 'INR', next_run || null, end_date || null, status || 'active',
       JSON.stringify(template_data || {}), req.params.id, req.orgId]
    );
    if (!r.rowCount) return sendError(res, 'Template not found', 'NOT_FOUND', 404);
    sendSuccess(res, null);
  } catch (err) {
    console.error('Update purchase template error:', err);
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

router.get('/purchase-templates/:id/runs', requireAuth, async (req, res) => {
  try {
    const rows = await db.query(
      `SELECT * FROM recurring_runs
       WHERE org_id=$1 AND template_type='purchase' AND template_id=$2
       ORDER BY run_date DESC LIMIT 50`,
      [req.orgId, req.params.id]
    ).then(r => r.rows);
    sendSuccess(res, rows);
  } catch (err) {
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

module.exports = router;
