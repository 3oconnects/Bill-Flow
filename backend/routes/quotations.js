// backend/routes/quotations.js
const express = require('express');
const router  = express.Router();
const { v4: uuid } = require('uuid');
const { db }  = require('../db');
const { requireAuth } = require('../auth');
const { sendSuccess, sendError } = require('../utils/response');
const InventoryTransactionService = require('../services/inventoryTransactionService');

// ── List ──────────────────────────────────────────────────────────────────────
router.get('/', requireAuth, async (req, res) => {
  try {
    const rows = await db.query(
      `SELECT id, number, customer_id, customer_name, customer_email, salesperson,
              status, total, currency, valid_until, win_probability, version,
              converted_to, created_at, updated_at
       FROM quotations
       WHERE org_id = $1 AND deleted_at IS NULL
       ORDER BY created_at DESC`,
      [req.orgId]
    ).then(r => r.rows);
    sendSuccess(res, rows);
  } catch (err) {
    console.error('Get quotations error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

// ── Summary stats ─────────────────────────────────────────────────────────────
router.get('/stats', requireAuth, async (req, res) => {
  try {
    const [totals, byStatus, expiring] = await Promise.all([
      db.query(
        `SELECT
           COUNT(*)                                                   AS total,
           COALESCE(SUM(total), 0)                                   AS total_value,
           COUNT(*) FILTER (WHERE status IN ('draft','sent','viewed','negotiation')) AS pending_count,
           COALESCE(SUM(total) FILTER (WHERE status IN ('draft','sent','viewed','negotiation')), 0) AS pending_value,
           COUNT(*) FILTER (WHERE status = 'approved')               AS approved_count,
           COUNT(*) FILTER (WHERE status = 'converted')              AS converted_count,
           COUNT(*) FILTER (WHERE status = 'rejected')               AS rejected_count,
           COALESCE(SUM(total) FILTER (WHERE status = 'rejected'),0) AS rejected_value,
           COUNT(*) FILTER (WHERE status = 'expired')                AS expired_count,
           COALESCE(SUM(total) FILTER (WHERE status = 'expired'),0)  AS expired_value,
           COUNT(*) FILTER (WHERE status IN ('rejected','expired'))  AS lost_count,
           COALESCE(SUM(total) FILTER (WHERE status IN ('rejected','expired')),0) AS lost_value,
           ROUND(
             COUNT(*) FILTER (WHERE status = 'converted')::NUMERIC /
             NULLIF(COUNT(*) FILTER (WHERE status NOT IN ('draft')),0) * 100, 1
           )                                                          AS conversion_rate,
           ROUND(
             COUNT(*) FILTER (WHERE status IN ('rejected','expired'))::NUMERIC /
             NULLIF(COUNT(*) FILTER (WHERE status NOT IN ('draft')),0) * 100, 1
           )                                                          AS loss_rate,
           COALESCE(AVG(EXTRACT(EPOCH FROM (updated_at - created_at))/86400)
             FILTER (WHERE status = 'converted'), 0)                 AS avg_closure_days
         FROM quotations
         WHERE org_id = $1 AND deleted_at IS NULL`,
        [req.orgId]
      ).then(r => r.rows[0]),

      db.query(
        `SELECT status, COUNT(*) AS count, COALESCE(SUM(total),0) AS value
         FROM quotations
         WHERE org_id = $1 AND deleted_at IS NULL
         GROUP BY status`,
        [req.orgId]
      ).then(r => r.rows),

      db.query(
        `SELECT COUNT(*) AS count, COALESCE(SUM(total),0) AS value
         FROM quotations
         WHERE org_id = $1 AND deleted_at IS NULL
           AND valid_until BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
           AND status NOT IN ('converted','rejected','expired')`,
        [req.orgId]
      ).then(r => r.rows[0]),
    ]);
    sendSuccess(res, { totals, byStatus, expiring });
  } catch (err) {
    console.error('Quotation stats error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

// ── Get single ────────────────────────────────────────────────────────────────
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const row = await db.query(
      `SELECT * FROM quotations WHERE id = $1 AND org_id = $2 AND deleted_at IS NULL`,
      [req.params.id, req.orgId]
    ).then(r => r.rows[0]);
    if (!row) return sendError(res, 'Quotation not found', 'NOT_FOUND', 404);
    sendSuccess(res, row);
  } catch (err) {
    console.error('Get quotation error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

// ── Create ────────────────────────────────────────────────────────────────────
router.post('/', requireAuth, async (req, res) => {
  try {
    const {
      number, customer_id, customer_name, customer_email, customer_phone,
      salesperson, status, subtotal, discount_pct, discount_amount, tax, total,
      currency, valid_until, notes, terms, win_probability, items,
    } = req.body;
    if (!customer_name) return sendError(res, 'Customer name required', 'VALIDATION_ERROR', 400);

    // Auto-generate number if not provided
    const num = number || await db.query(
      `SELECT CONCAT('QT-', LPAD((COUNT(*)+1)::TEXT, 4, '0')) AS n FROM quotations WHERE org_id=$1`,
      [req.orgId]
    ).then(r => r.rows[0].n);

    const id = uuid();
    await db.query(
      `INSERT INTO quotations
       (id, org_id, number, customer_id, customer_name, customer_email, customer_phone,
        salesperson, status, subtotal, discount_pct, discount_amount, tax, total, currency,
        valid_until, notes, terms, win_probability, items, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)`,
      [id, req.orgId, num, customer_id||null, customer_name, customer_email||'', customer_phone||'',
       salesperson||req.user.name||'', status||'draft',
       subtotal||0, discount_pct||0, discount_amount||0, tax||0, total||0,
       currency||'INR', valid_until||null, notes||'', terms||'',
       win_probability||50, JSON.stringify(items||[]), req.user.id]
    );
    sendSuccess(res, { id, number: num });
  } catch (err) {
    console.error('Create quotation error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

// ── Update ────────────────────────────────────────────────────────────────────
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const {
      customer_name, customer_email, customer_phone, salesperson,
      subtotal, discount_pct, discount_amount, tax, total, currency,
      valid_until, notes, terms, win_probability, items,
    } = req.body;
    await db.query(
      `UPDATE quotations SET
         customer_name=$1, customer_email=$2, customer_phone=$3, salesperson=$4,
         subtotal=$5, discount_pct=$6, discount_amount=$7, tax=$8, total=$9,
         currency=$10, valid_until=$11, notes=$12, terms=$13, win_probability=$14,
         items=$15, version = version + 1, updated_at=CURRENT_TIMESTAMP
       WHERE id=$16 AND org_id=$17`,
      [customer_name, customer_email||'', customer_phone||'', salesperson||'',
       subtotal||0, discount_pct||0, discount_amount||0, tax||0, total||0,
       currency||'INR', valid_until||null, notes||'', terms||'',
       win_probability||50, JSON.stringify(items||[]),
       req.params.id, req.orgId]
    );
    sendSuccess(res, null);
  } catch (err) {
    console.error('Update quotation error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

// ── Update status ─────────────────────────────────────────────────────────────
router.patch('/:id/status', requireAuth, async (req, res) => {
  try {
    const { status } = req.body;
    await db.query(
      `UPDATE quotations SET status=$1, updated_at=CURRENT_TIMESTAMP WHERE id=$2 AND org_id=$3`,
      [status, req.params.id, req.orgId]
    );
    sendSuccess(res, null);
  } catch (err) {
    console.error('Update quotation status error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

// ── Convert to Invoice ────────────────────────────────────────────────────────
// Routes through InventoryTransactionService so the resulting invoice deducts
// stock, posts GST (cgst/sgst/igst), and updates customer outstanding — exactly
// like a normal invoice. Number is allocated atomically; double-convert is
// prevented by an atomic status claim that is reverted if invoice creation fails.
router.post('/:id/convert', requireAuth, async (req, res) => {
  let claimed = null;
  try {
    const quot = await db.query(
      `SELECT * FROM quotations WHERE id=$1 AND org_id=$2 AND deleted_at IS NULL`,
      [req.params.id, req.orgId]
    ).then(r => r.rows[0]);
    if (!quot) return sendError(res, 'Quotation not found', 'NOT_FOUND', 404);
    if (['converted', 'rejected', 'expired'].includes(quot.status))
      return sendError(res, `Cannot convert a ${quot.status} quotation`, 'CONFLICT', 409);

    // Atomically claim the quote so two concurrent converts cannot both proceed.
    const claim = await db.query(
      `UPDATE quotations SET status='converted', updated_at=CURRENT_TIMESTAMP
       WHERE id=$1 AND org_id=$2 AND status NOT IN ('converted','rejected','expired')
       RETURNING status`,
      [req.params.id, req.orgId]
    );
    if (!claim.rowCount)
      return sendError(res, 'Quotation already converted', 'CONFLICT', 409);
    claimed = quot.status; // remember prior status for rollback

    // Allocate the next invoice number atomically (no read-then-bump race).
    const invNum = await db.query(
      `UPDATE organizations SET next_inv_no = COALESCE(next_inv_no,0) + 1
       WHERE id=$1
       RETURNING CONCAT(COALESCE(inv_prefix,'INV-'), LPAD(next_inv_no::TEXT, 4, '0')) AS n`,
      [req.orgId]
    ).then(r => r.rows[0].n);

    const today = new Date().toISOString().split('T')[0];
    const due   = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];
    const items = typeof quot.items === 'string' ? JSON.parse(quot.items || '[]') : (quot.items || []);

    const result = await InventoryTransactionService.createInvoiceWithStockDeduction(
      req.orgId,
      {
        number: invNum,
        customer_id: quot.customer_id, customer_name: quot.customer_name,
        customer_email: quot.customer_email || '', customer_phone: quot.customer_phone || '',
        date: today, due_date: due, currency: quot.currency,
        place_of_supply: quot.place_of_supply || null,
        status: 'draft',
        subtotal: quot.subtotal, discount_pct: quot.discount_pct,
        discount_amount: quot.discount_amount, tax: quot.tax, total: quot.total,
        notes: quot.notes || '', terms: quot.terms || '', created_by: req.user.id,
      },
      items
    );

    // Link the converted invoice back to the quote.
    await db.query(
      `UPDATE quotations SET converted_to=$1, updated_at=CURRENT_TIMESTAMP WHERE id=$2 AND org_id=$3`,
      [result.invoiceId, req.params.id, req.orgId]
    );

    sendSuccess(res, { invoice_id: result.invoiceId, invoice_number: invNum });
  } catch (err) {
    // Invoice creation failed (e.g. insufficient stock) — revert the claim so the
    // quote is not left stuck in 'converted' with no invoice.
    if (claimed) {
      await db.query(
        `UPDATE quotations SET status=$1, converted_to=NULL, updated_at=CURRENT_TIMESTAMP WHERE id=$2 AND org_id=$3`,
        [claimed, req.params.id, req.orgId]
      ).catch(() => {});
    }
    console.error('Convert quotation error:', err);
    if (err.message && err.message.includes('Insufficient stock'))
      return sendError(res, err.message, 'STOCK_ERROR', 422);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

// ── Delete ────────────────────────────────────────────────────────────────────
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    await db.query(
      `UPDATE quotations SET deleted_at=CURRENT_TIMESTAMP WHERE id=$1 AND org_id=$2`,
      [req.params.id, req.orgId]
    );
    sendSuccess(res, null);
  } catch (err) {
    console.error('Delete quotation error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

module.exports = router;
