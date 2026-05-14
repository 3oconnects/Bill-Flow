// backend/routes/invoices.js
const express = require('express');
const router = express.Router();
const { v4: uuid } = require('uuid');
const { stmts, db } = require('../db');
const { requireAuth, requireAdmin } = require('../auth');
const { sendSuccess, sendError } = require('../utils/response');

router.get('/', requireAuth, async (req, res) => {
  try {
    // Optional: Auto-detect overdue invoices
    // await db.query(`
    //   UPDATE invoices SET status = 'overdue' 
    //   WHERE org_id = $1 AND status IN ('sent', 'pending', 'partially_paid') AND due_date < CURRENT_DATE
    // `, [req.orgId]);

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
    const { 
      number, customer_id, customer_name, date, due_date, currency, place_of_supply, status, items, 
      subtotal, discount_pct, discount_amount, tax, total, notes, terms, customer_phone, customer_email,
      paid_amount, due_amount, sales_person, reference_number, payment_terms, tax_type, discount_type, attachment_url, customer_id_display
    } = req.body;

    if (!number || !customer_name || !items || !items.length)
      return sendError(res, 'Required fields missing', 'VALIDATION_ERROR', 400);

    const id = uuid();
    await stmts.insertInvoice.run(
      id, req.orgId, number, customer_id||null, customer_name, customer_phone||'', customer_email||'', 
      date, due_date, currency||'INR', place_of_supply||'', status||'draft', subtotal||0, discount_pct||0, discount_amount||0, tax||0, total||0, 
      notes||'', terms||'', req.user.id,
      paid_amount||0, due_amount||total||0, sales_person||'', reference_number||'', payment_terms||'', tax_type||'exclusive', discount_type||'percentage', attachment_url||'', customer_id_display||''
    );

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      await stmts.insertInvoiceItem.run(
        uuid(), req.orgId, id, it.description, it.hsn_code||'', it.product_id||null, it.sku||'', it.vendor_id||null, it.vendor_name||'', 
        it.quantity||1, it.unit_price||0, it.tax_rate||18, it.tax_amount||0, it.amount||0, i, req.user.id,
        it.discount_pct||0, it.discount_amount||0, it.cgst_rate||0, it.cgst_amount||0, it.sgst_rate||0, it.sgst_amount||0, it.igst_rate||0, it.igst_amount||0, it.unit||'pcs', it.subtotal||it.amount||0
      );
    }

    sendSuccess(res, { id });
  } catch (err) {
    console.error('Create invoice error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { 
      customer_id, customer_name, date, due_date, currency, place_of_supply, status, items, 
      subtotal, discount_pct, discount_amount, tax, total, notes, terms, customer_phone, customer_email,
      paid_amount, due_amount, sales_person, reference_number, payment_terms, tax_type, discount_type, attachment_url, customer_id_display
    } = req.body;
    
    await stmts.updateInvoice.run(
      customer_id||null, customer_name, customer_phone||'', customer_email||'', date, due_date, currency||'INR', place_of_supply||'', 
      subtotal||0, discount_pct||0, discount_amount||0, tax||0, total||0, notes||'', terms||'', 
      paid_amount||0, due_amount||total||0, sales_person||'', reference_number||'', payment_terms||'', tax_type||'exclusive', discount_type||'percentage', attachment_url||'', customer_id_display||'',
      req.params.id, req.orgId
    );
    
    if (status) {
      await stmts.updateInvoiceStatus.run(status, req.params.id, req.orgId);
    }

    await stmts.deleteInvoiceItems.run(req.params.id);
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      await stmts.insertInvoiceItem.run(
        uuid(), req.orgId, req.params.id, it.description, it.hsn_code||'', it.product_id||null, it.sku||'', it.vendor_id||null, it.vendor_name||'', 
        it.quantity||1, it.unit_price||0, it.tax_rate||18, it.tax_amount||0, it.amount||0, i, req.user.id,
        it.discount_pct||0, it.discount_amount||0, it.cgst_rate||0, it.cgst_amount||0, it.sgst_rate||0, it.sgst_amount||0, it.igst_rate||0, it.igst_amount||0, it.unit||'pcs', it.subtotal||it.amount||0
      );
    }

    sendSuccess(res, null);
  } catch (err) {
    console.error('Update invoice error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

router.post('/:id/duplicate', requireAuth, async (req, res) => {
  try {
    const inv = await stmts.getInvoice.get(req.params.id, req.orgId);
    if (!inv) return sendError(res, 'Invoice not found', 'NOT_FOUND', 404);
    const items = await stmts.getInvoiceItems.all(req.params.id);

    const id = uuid();
    const newNumber = `${inv.number}-COPY`; // Or fetch next number from org

    await stmts.insertInvoice.run(
      id, req.orgId, newNumber, inv.customer_id, inv.customer_name, inv.customer_phone, inv.customer_email, 
      inv.date, inv.due_date, inv.currency, inv.place_of_supply, 'draft', inv.subtotal, inv.discount_pct, inv.discount_amount, inv.tax, inv.total, 
      inv.notes, inv.terms, req.user.id,
      0, inv.total, inv.sales_person, inv.reference_number, inv.payment_terms, inv.tax_type, inv.discount_type, inv.attachment_url, inv.customer_id_display
    );

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      await stmts.insertInvoiceItem.run(
        uuid(), req.orgId, id, it.description, it.hsn_code, it.product_id, it.sku, it.vendor_id, it.vendor_name, 
        it.quantity, it.unit_price, it.tax_rate, it.tax_amount, it.amount, i, req.user.id,
        it.discount_pct, it.discount_amount, it.cgst_rate, it.cgst_amount, it.sgst_rate, it.sgst_amount, it.igst_rate, it.igst_amount, it.unit, it.subtotal
      );
    }

    sendSuccess(res, { id });
  } catch (err) {
    console.error('Duplicate invoice error:', err);
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
