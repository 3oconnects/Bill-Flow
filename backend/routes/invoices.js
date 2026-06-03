// backend/routes/invoices.js
'use strict';
const express = require('express');
const router  = express.Router();
const { db }  = require('../db');
const { requireAuth, requireAdmin } = require('../auth');
const { sendSuccess, sendError }    = require('../utils/response');
const InventoryTransactionService   = require('../services/inventoryTransactionService');

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
              paid_amount, notes, terms, created_by, created_at
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
router.post('/', requireAuth, async (req, res) => {
  try {
    const {
      number, customer_id, customer_name, customer_phone, customer_email,
      date, due_date, currency, place_of_supply, supplier_state, buyer_state,
      status, items, subtotal, discount_pct, discount_amount, tax, total,
      notes, terms, tax_rate,
    } = req.body;

    if (!number || !customer_name || !items || !items.length)
      return sendError(res, 'number, customer_name and items are required', 'VALIDATION_ERROR', 400);

    const result = await InventoryTransactionService.createInvoiceWithStockDeduction(
      req.orgId,
      {
        number, customer_id, customer_name, customer_phone, customer_email,
        date, due_date, currency, place_of_supply, supplier_state, buyer_state,
        status, subtotal, discount_pct, discount_amount, tax, total,
        notes, terms, tax_rate, created_by: req.user.id,
      },
      items
    );
    sendSuccess(res, { id: result.invoiceId, gst: result.gst });
  } catch (err) {
    console.error('Create invoice error:', err);
    if (err.message && err.message.includes('Insufficient stock'))
      return sendError(res, err.message, 'STOCK_ERROR', 422);
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
      'SELECT number, status FROM invoices WHERE id = $1 AND org_id = $2 AND deleted_at IS NULL',
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
    await db.query(
      'UPDATE invoices SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND org_id = $3',
      [status, req.params.id, req.orgId]
    );
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
