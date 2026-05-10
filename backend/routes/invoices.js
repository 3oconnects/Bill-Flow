// backend/routes/invoices.js
const express = require('express');
const router = express.Router();
const { v4: uuid } = require('uuid');
const { stmts, db } = require('../db');
const { requireAuth, requireAdmin } = require('../auth');
const { sendSuccess, sendError } = require('../utils/response');

router.get('/', requireAuth, async (req, res) => {
  try {
    const invoices = await stmts.getInvoices.all(req.orgId);
    sendSuccess(res, invoices);
  } catch (err) {
    console.error('Get invoices error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

router.get('/:id', requireAuth, async (req, res) => {
  try {
    const inv = await stmts.getInvoice.get(req.params.id, req.orgId);
    if (!inv) return sendError(res, 'Invoice not found', 'NOT_FOUND', 404);
    const items = await stmts.getInvoiceItems.all(req.params.id);
    sendSuccess(res, { ...inv, items });
  } catch (err) {
    console.error('Get invoice error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

router.post('/', requireAuth, async (req, res) => {
  try {
    const { number, customer_id, customer_name, date, due_date, currency, place_of_supply, status, items, subtotal, discount_pct, discount_amount, tax, total, notes, terms, customer_phone, customer_email } = req.body;
    if (!number || !customer_name || !items || !items.length)
      return sendError(res, 'Required fields missing', 'VALIDATION_ERROR', 400);

    const id = uuid();
    await stmts.insertInvoice.run(id, req.orgId, number, customer_id||null, customer_name, customer_phone||'', customer_email||'', date, due_date, currency||'INR', place_of_supply||'', status||'draft', subtotal||0, discount_pct||0, discount_amount||0, tax||0, total||0, notes||'', terms||'', req.user.id);

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      await stmts.insertInvoiceItem.run(uuid(), req.orgId, id, it.description, it.hsn_code||'', it.product_id||null, it.sku||'', it.vendor_id||null, it.vendor_name||'', it.quantity||1, it.unit_price||0, it.tax_rate||18, it.tax_amount||0, it.amount||0, i, req.user.id);
    }

    sendSuccess(res, { id });
  } catch (err) {
    console.error('Create invoice error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { number, customer_id, customer_name, date, due_date, currency, place_of_supply, status, items, subtotal, discount_pct, discount_amount, tax, total, notes, terms, customer_phone, customer_email } = req.body;
    
    await stmts.updateInvoice.run(customer_id||null, customer_name, customer_phone||'', customer_email||'', date, due_date, currency||'INR', place_of_supply||'', subtotal||0, discount_pct||0, discount_amount||0, tax||0, total||0, notes||'', terms||'', req.params.id, req.orgId);
    
    await stmts.deleteInvoiceItems.run(req.params.id);
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      await stmts.insertInvoiceItem.run(uuid(), req.orgId, req.params.id, it.description, it.hsn_code||'', it.product_id||null, it.sku||'', it.vendor_id||null, it.vendor_name||'', it.quantity||1, it.unit_price||0, it.tax_rate||18, it.tax_amount||0, it.amount||0, i, req.user.id);
    }

    sendSuccess(res, null);
  } catch (err) {
    console.error('Update invoice error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    await stmts.deleteInvoice.run(req.params.id, req.orgId);
    sendSuccess(res, null);
  } catch (err) {
    console.error('Delete invoice error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

router.patch('/:id/status', requireAuth, async (req, res) => {
  try {
    const { status } = req.body;
    await stmts.updateInvoiceStatus.run(status, req.params.id, req.orgId);
    sendSuccess(res, null);
  } catch (err) {
    console.error('Update status error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

module.exports = router;
