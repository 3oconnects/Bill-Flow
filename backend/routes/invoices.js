// backend/routes/invoices.js
'use strict';
const express = require('express');
const router  = express.Router();
const { db }  = require('../db');
const { requireAuth, requireAdmin } = require('../auth');
const { sendSuccess, sendError }    = require('../utils/response');
const InventoryTransactionService   = require('../services/inventoryTransactionService');
const CustomerBalance               = require('../services/customerBalanceService');

// List invoices (paginated)
router.get('/', requireAuth, async (req, res) => {
  try {
    const page   = Math.max(1, parseInt(req.query.page)  || 1);
    const limit  = Math.min(200, parseInt(req.query.limit) || 100);
    const offset = (page - 1) * limit;
    const status = req.query.status;
    const params = status ? [req.orgId, limit, status, offset] : [req.orgId, limit, offset];
    const statusClause = status ? 'AND status = $3' : '';
    const offsetParam  = status ? '$4' : '$3';
    const { rows } = await db.query(
      `SELECT id, org_id, number, customer_id, customer_name, customer_phone, customer_email,
              date, due_date, currency, place_of_supply, status, shipment_status,
              subtotal, discount_pct, discount_amount, tax, cgst, sgst, igst, total,
              paid_amount, credited_amount,
              (total - COALESCE(paid_amount,0) - COALESCE(credited_amount,0)) AS balance_due,
              notes, terms, created_by, created_at
         FROM invoices
        WHERE org_id = $1 AND deleted_at IS NULL ${statusClause}
        ORDER BY date DESC, created_at DESC
        LIMIT $2 OFFSET ${offsetParam}`,
      params
    );
    sendSuccess(res, { data: rows, page, limit });
  } catch (err) {
    console.error('Get invoices error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

// Get single invoice with items
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT * FROM invoices WHERE id = $1 AND org_id = $2 AND deleted_at IS NULL',
      [req.params.id, req.orgId]
    );
    if (!rows.length) return sendError(res, 'Invoice not found', 'NOT_FOUND', 404);
    const items = await db.query(
      'SELECT * FROM invoice_items WHERE invoice_id = $1 AND deleted_at IS NULL ORDER BY sort_order',
      [req.params.id]
    );
    sendSuccess(res, { ...rows[0], items: items.rows });
  } catch (err) {
    console.error('Get invoice error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

// Create invoice (stock deduction + GST posting ATOMIC)
//
// Numbering policy: the server is the source of truth for invoice numbers.
// We always bump organizations.next_inv_no atomically and allocate the next
// available number, retrying if another concurrent insert grabbed the same
// slot. The client-supplied `number` is only used when it does not collide
// with an existing row (so manually entered custom numbers still work).
router.post('/', requireAuth, async (req, res) => {
  try {
    const {
      number: clientNumber,
      customer_id, customer_name, customer_phone, customer_email,
      date, due_date, currency, place_of_supply, supplier_state, buyer_state,
      status, items, subtotal, discount_pct, discount_amount, tax, total,
      notes, terms, tax_rate,
    } = req.body;

    if (!customer_name || !items || !items.length)
      return sendError(res, 'customer_name and items are required', 'VALIDATION_ERROR', 400);

    // H5: enforce customer credit limit. A non-draft invoice adds to the customer's
    // receivable; block if it would exceed their credit_limit (0 = unlimited).
    if (customer_id && status && status !== 'draft') {
      const cl = await db.query(
        'SELECT COALESCE(credit_limit,0) AS credit_limit, COALESCE(outstanding,0) AS outstanding FROM customers WHERE id=$1 AND org_id=$2',
        [customer_id, req.orgId]
      );
      if (cl.rows.length) {
        const limit = parseFloat(cl.rows[0].credit_limit);
        const projected = parseFloat(cl.rows[0].outstanding) + parseFloat(total || 0);
        if (limit > 0 && projected > limit + 0.01) {
          return sendError(
            res,
            `Credit limit exceeded: outstanding would be ${projected.toFixed(2)} vs limit ${limit.toFixed(2)}`,
            'CREDIT_LIMIT_EXCEEDED', 422
          );
        }
      }
    }

    // ── Resolve invoice number ────────────────────────────────────────────────
    // If a custom number was sent AND it is currently free, use it. Otherwise
    // bump the counter and allocate the next sequential number atomically.
    let number = (clientNumber || '').trim();
    if (number) {
      const existing = await db.query(
        'SELECT 1 FROM invoices WHERE org_id=$1 AND number=$2 AND deleted_at IS NULL',
        [req.orgId, number]
      );
      if (existing.rowCount) number = ''; // collides → fall through to allocate
    }
    if (!number) {
      // Retry on the off-chance two requests race for the same allocated number
      // (very unlikely with UPDATE … RETURNING, but harmless to guard).
      for (let attempt = 0; attempt < 5; attempt++) {
        const next = await db.query(
          `UPDATE organizations SET next_inv_no = COALESCE(next_inv_no,0) + 1
           WHERE id=$1
           RETURNING CONCAT(COALESCE(inv_prefix,'INV-'), LPAD(next_inv_no::TEXT, 4, '0')) AS n`,
          [req.orgId]
        );
        const candidate = next.rows[0]?.n;
        if (!candidate) break;
        const taken = await db.query(
          'SELECT 1 FROM invoices WHERE org_id=$1 AND number=$2 AND deleted_at IS NULL',
          [req.orgId, candidate]
        );
        if (!taken.rowCount) { number = candidate; break; }
      }
      if (!number) return sendError(res, 'Could not allocate an invoice number', 'INTERNAL_ERROR', 500);
    }

    const result = await InventoryTransactionService.createInvoiceWithStockDeduction(
      req.orgId,
      {
        number,
        customer_id, customer_name, customer_phone, customer_email,
        date, due_date, currency, place_of_supply, supplier_state, buyer_state,
        status, subtotal, discount_pct, discount_amount, tax, total,
        notes, terms, tax_rate, created_by: req.user.id,
      },
      items
    );
    sendSuccess(res, { id: result.invoiceId, number, gst: result.gst });
  } catch (err) {
    console.error('Create invoice error:', err);
    if (err.message && err.message.includes('Insufficient stock'))
      return sendError(res, err.message, 'STOCK_ERROR', 422);
    if (err.code === '23505' && err.constraint === 'uq_invoices_org_number')
      return sendError(res, 'Invoice number already exists for this organisation', 'DUPLICATE_NUMBER', 409);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

// Update invoice (delta stock reconciliation)
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const {
      customer_id, customer_name, customer_phone, customer_email,
      date, due_date, currency, place_of_supply, supplier_state, buyer_state,
      items, subtotal, discount_pct, discount_amount, tax, total,
      notes, terms, tax_rate,
    } = req.body;

    if (!items || !items.length)
      return sendError(res, 'items required', 'VALIDATION_ERROR', 400);

    await InventoryTransactionService.updateInvoiceWithStockDelta(
      req.orgId, req.params.id, items,
      {
        customer_id, customer_name, customer_phone, customer_email,
        date, due_date, currency, place_of_supply, supplier_state, buyer_state,
        subtotal, discount_pct, discount_amount, tax, total,
        notes, terms, tax_rate, updated_by: req.user.id,
      }
    );
    sendSuccess(res, null);
  } catch (err) {
    console.error('Update invoice error:', err);
    if (err.message && err.message.includes('Insufficient stock'))
      return sendError(res, err.message, 'STOCK_ERROR', 422);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

// Delete (soft) — restore stock
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const inv = await db.query(
      'SELECT number, status, customer_id FROM invoices WHERE id = $1 AND org_id = $2 AND deleted_at IS NULL',
      [req.params.id, req.orgId]
    );
    if (!inv.rows.length) return sendError(res, 'Invoice not found', 'NOT_FOUND', 404);

    if (inv.rows[0].status !== 'draft') {
      const items = await db.query(
        'SELECT product_id, quantity FROM invoice_items WHERE invoice_id = $1 AND deleted_at IS NULL',
        [req.params.id]
      );
      for (const item of items.rows) {
        if (item.product_id) {
          await db.query(
            'UPDATE products SET stock_qty = stock_qty + $1, updated_at = NOW() WHERE id = $2 AND org_id = $3',
            [parseFloat(item.quantity), item.product_id, req.orgId]
          );
        }
      }
    }

    await db.query(
      'UPDATE invoices SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1 AND org_id = $2',
      [req.params.id, req.orgId]
    );
    // Recompute outstanding now that this invoice no longer counts.
    if (inv.rows[0].customer_id) {
      await CustomerBalance.recompute(db, req.orgId, inv.rows[0].customer_id);
    }
    sendSuccess(res, null);
  } catch (err) {
    console.error('Delete invoice error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

// Update status
router.patch('/:id/status', requireAuth, async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ['draft', 'sent', 'paid', 'overdue', 'cancelled', 'partially_paid'];
    if (!allowed.includes(status))
      return sendError(res, 'Invalid status', 'VALIDATION_ERROR', 400);

    // H5: enforce credit limit when an invoice first becomes a receivable (→ sent).
    if (status === 'sent') {
      const row = await db.query(
        `SELECT i.total, i.customer_id, COALESCE(c.credit_limit,0) AS credit_limit, COALESCE(c.outstanding,0) AS outstanding
           FROM invoices i LEFT JOIN customers c ON c.id = i.customer_id
          WHERE i.id=$1 AND i.org_id=$2 AND i.deleted_at IS NULL`,
        [req.params.id, req.orgId]
      );
      if (row.rows.length && row.rows[0].customer_id) {
        const limit = parseFloat(row.rows[0].credit_limit);
        const projected = parseFloat(row.rows[0].outstanding) + parseFloat(row.rows[0].total || 0);
        if (limit > 0 && projected > limit + 0.01) {
          return sendError(
            res,
            `Credit limit exceeded: outstanding would be ${projected.toFixed(2)} vs limit ${limit.toFixed(2)}`,
            'CREDIT_LIMIT_EXCEEDED', 422
          );
        }
      }
    }

    const upd = await db.query(
      'UPDATE invoices SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND org_id = $3 RETURNING customer_id',
      [status, req.params.id, req.orgId]
    );
    // Status transitions move an invoice in/out of receivable scope (e.g. draft→sent,
    // any→cancelled), so recompute outstanding.
    if (upd.rows[0] && upd.rows[0].customer_id) {
      await CustomerBalance.recompute(db, req.orgId, upd.rows[0].customer_id);
    }
    sendSuccess(res, null);
  } catch (err) {
    console.error('Update status error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

// Update shipment status
router.patch('/:id/shipment', requireAuth, async (req, res) => {
  try {
    const { shipment_status } = req.body;
    const valid = ['not_shipped', 'processing', 'shipped', 'delivered'];
    if (!valid.includes(shipment_status))
      return sendError(res, 'Invalid shipment status', 'VALIDATION_ERROR', 400);
    const confirmedAt = shipment_status === 'delivered' ? new Date().toISOString() : null;
    await db.query(
      'UPDATE invoices SET shipment_status = $1, shipment_confirmed_at = $2, updated_at = NOW() WHERE id = $3 AND org_id = $4',
      [shipment_status, confirmedAt, req.params.id, req.orgId]
    );
    sendSuccess(res, null);
  } catch (err) {
    console.error('Update shipment error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

module.exports = router;
