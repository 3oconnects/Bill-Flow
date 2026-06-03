// backend/routes/creditNotes.js
const express = require('express');
const router  = express.Router();
const { v4: uuid } = require('uuid');
const { db }  = require('../db');
const { requireAuth } = require('../auth');
const { sendSuccess, sendError } = require('../utils/response');

// ── List ──────────────────────────────────────────────────────────────────────
router.get('/', requireAuth, async (req, res) => {
  try {
    const rows = await db.query(
      `SELECT id, number, customer_id, customer_name, invoice_id, invoice_number,
              status, reason, amount, total, currency, created_by,
              approved_by, approved_at, applied_at, created_at, updated_at
       FROM credit_notes
       WHERE org_id = $1 AND deleted_at IS NULL
       ORDER BY created_at DESC`,
      [req.orgId]
    ).then(r => r.rows);
    sendSuccess(res, rows);
  } catch (err) {
    console.error('Get credit notes error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

// ── Stats ─────────────────────────────────────────────────────────────────────
router.get('/stats', requireAuth, async (req, res) => {
  try {
    const [totals, byReason, byStatus, topCustomers] = await Promise.all([
      db.query(
        `SELECT
           COUNT(*)                                          AS total,
           COALESCE(SUM(total), 0)                          AS total_value,
           COUNT(*) FILTER (WHERE status='pending_review')  AS pending_approval,
           COALESCE(SUM(total) FILTER (WHERE status='pending_review'), 0) AS pending_value,
           COUNT(*) FILTER (WHERE status='applied')         AS applied_count,
           ROUND(
             COUNT(*)::NUMERIC /
             NULLIF((SELECT COUNT(*) FROM invoices WHERE org_id=$1 AND deleted_at IS NULL), 0) * 100, 2
           ) AS refund_rate
         FROM credit_notes
         WHERE org_id = $1 AND deleted_at IS NULL`,
        [req.orgId]
      ).then(r => r.rows[0]),

      db.query(
        `SELECT reason, COUNT(*) AS count, COALESCE(SUM(total),0) AS value
         FROM credit_notes
         WHERE org_id = $1 AND deleted_at IS NULL
         GROUP BY reason ORDER BY value DESC`,
        [req.orgId]
      ).then(r => r.rows),

      db.query(
        `SELECT status, COUNT(*) AS count, COALESCE(SUM(total),0) AS value
         FROM credit_notes WHERE org_id=$1 AND deleted_at IS NULL GROUP BY status`,
        [req.orgId]
      ).then(r => r.rows),

      db.query(
        `SELECT customer_name,
                COUNT(*) AS credit_count,
                COALESCE(SUM(total),0) AS credit_value
         FROM credit_notes
         WHERE org_id=$1 AND deleted_at IS NULL
         GROUP BY customer_name
         ORDER BY credit_value DESC LIMIT 5`,
        [req.orgId]
      ).then(r => r.rows),
    ]);

    sendSuccess(res, { totals, byReason, byStatus, topCustomers });
  } catch (err) {
    console.error('Credit note stats error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

// ── Get single ────────────────────────────────────────────────────────────────
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const row = await db.query(
      `SELECT * FROM credit_notes WHERE id=$1 AND org_id=$2 AND deleted_at IS NULL`,
      [req.params.id, req.orgId]
    ).then(r => r.rows[0]);
    if (!row) return sendError(res, 'Credit note not found', 'NOT_FOUND', 404);
    sendSuccess(res, row);
  } catch (err) {
    console.error('Get credit note error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

// ── Create ────────────────────────────────────────────────────────────────────
router.post('/', requireAuth, async (req, res) => {
  try {
    const {
      customer_id, customer_name, invoice_id, invoice_number,
      reason, amount, tax, total, currency, notes, items,
    } = req.body;
    if (!customer_name) return sendError(res, 'Customer name required', 'VALIDATION_ERROR', 400);

    const num = await db.query(
      `SELECT CONCAT('CN-', LPAD((COUNT(*)+1)::TEXT, 4, '0')) AS n FROM credit_notes WHERE org_id=$1`,
      [req.orgId]
    ).then(r => r.rows[0].n);

    const id = uuid();
    await db.query(
      `INSERT INTO credit_notes
       (id, org_id, number, customer_id, customer_name, invoice_id, invoice_number,
        status, reason, amount, tax, total, currency, notes, items, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'pending_review',$8,$9,$10,$11,$12,$13,$14,$15)`,
      [id, req.orgId, num, customer_id||null, customer_name,
       invoice_id||null, invoice_number||null,
       reason||'other', amount||0, tax||0, total||0,
       currency||'INR', notes||'',
       JSON.stringify(items||[]), req.user.id]
    );
    sendSuccess(res, { id, number: num });
  } catch (err) {
    console.error('Create credit note error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

// ── Approve ───────────────────────────────────────────────────────────────────
router.patch('/:id/approve', requireAuth, async (req, res) => {
  try {
    await db.query(
      `UPDATE credit_notes SET status='approved', approved_by=$1,
       approved_at=CURRENT_TIMESTAMP, updated_at=CURRENT_TIMESTAMP
       WHERE id=$2 AND org_id=$3`,
      [req.user.name, req.params.id, req.orgId]
    );
    sendSuccess(res, null);
  } catch (err) {
    console.error('Approve credit note error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

// ── Apply (mark as credit applied to customer account) ────────────────────────
router.patch('/:id/apply', requireAuth, async (req, res) => {
  try {
    await db.query(
      `UPDATE credit_notes SET status='applied', applied_at=CURRENT_TIMESTAMP,
       updated_at=CURRENT_TIMESTAMP WHERE id=$1 AND org_id=$2`,
      [req.params.id, req.orgId]
    );
    sendSuccess(res, null);
  } catch (err) {
    console.error('Apply credit note error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

// ── Reject ────────────────────────────────────────────────────────────────────
router.patch('/:id/reject', requireAuth, async (req, res) => {
  try {
    await db.query(
      `UPDATE credit_notes SET status='rejected', updated_at=CURRENT_TIMESTAMP
       WHERE id=$1 AND org_id=$2`,
      [req.params.id, req.orgId]
    );
    sendSuccess(res, null);
  } catch (err) {
    console.error('Reject credit note error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

// ── Delete ────────────────────────────────────────────────────────────────────
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    await db.query(
      `UPDATE credit_notes SET deleted_at=CURRENT_TIMESTAMP WHERE id=$1 AND org_id=$2`,
      [req.params.id, req.orgId]
    );
    sendSuccess(res, null);
  } catch (err) {
    console.error('Delete credit note error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

module.exports = router;
