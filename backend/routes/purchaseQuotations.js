const express = require('express');
const router  = express.Router();
const { v4: uuid } = require('uuid');
const { requireAuth } = require('../auth');
const { sendSuccess, sendError } = require('../utils/response');
const stmts = require('../db/statements/purchasing');

router.get('/', requireAuth, async (req, res) => {
  try {
    const rows = await stmts.listPurchaseQuotations.all(req.orgId);
    sendSuccess(res, rows);
  } catch (err) {
    console.error('List purchase quotations error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

router.get('/:id', requireAuth, async (req, res) => {
  try {
    const doc = await stmts.getPurchaseQuotation.get(req.params.id, req.orgId);
    if (!doc) return sendError(res, 'Quotation not found', 'NOT_FOUND', 404);
    sendSuccess(res, doc);
  } catch (err) {
    console.error('Get purchase quotation error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

router.post('/', requireAuth, async (req, res) => {
  try {
    const {
      number, vendor_id, vendor_name, vendor_email, vendor_phone,
      status, subtotal, discount_pct, discount_amount, tax, total,
      currency, valid_until, notes, terms, items
    } = req.body;

    if (!number) return sendError(res, 'Quotation number is required', 'VALIDATION_ERROR', 400);
    if (!vendor_name) return sendError(res, 'Vendor name is required', 'VALIDATION_ERROR', 400);

    const id = uuid();
    await stmts.insertPurchaseQuotation.run(
      id, req.orgId, number, vendor_id || null, vendor_name,
      vendor_email || '', vendor_phone || '', status || 'draft',
      subtotal || 0, discount_pct || 0, discount_amount || 0, tax || 0,
      total || 0, currency || 'INR', valid_until || null,
      notes || '', terms || '', JSON.stringify(items || []), req.user.id
    );

    sendSuccess(res, { id });
  } catch (err) {
    console.error('Create purchase quotation error:', err);
    if (err.code === '23505') return sendError(res, 'Quotation number already exists', 'VALIDATION_ERROR', 400);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

router.put('/:id', requireAuth, async (req, res) => {
  try {
    const {
      vendor_id, vendor_name, vendor_email, vendor_phone,
      status, subtotal, discount_pct, discount_amount, tax, total,
      currency, valid_until, notes, terms, items
    } = req.body;

    if (!vendor_name) return sendError(res, 'Vendor name is required', 'VALIDATION_ERROR', 400);

    await stmts.updatePurchaseQuotation.run(
      vendor_id || null, vendor_name, vendor_email || '', vendor_phone || '',
      status || 'draft', subtotal || 0, discount_pct || 0, discount_amount || 0,
      tax || 0, total || 0, currency || 'INR', valid_until || null,
      notes || '', terms || '', JSON.stringify(items || []),
      req.params.id, req.orgId
    );

    sendSuccess(res, { success: true });
  } catch (err) {
    console.error('Update purchase quotation error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    await stmts.deletePurchaseQuotation.run(req.params.id, req.orgId);
    sendSuccess(res, { success: true });
  } catch (err) {
    console.error('Delete purchase quotation error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

router.patch('/:id/status', requireAuth, async (req, res) => {
  try {
    const { status } = req.body;
    if (!status) return sendError(res, 'Status is required', 'VALIDATION_ERROR', 400);
    
    await stmts.updatePurchaseQuotationStatus.run(status, req.params.id, req.orgId);
    sendSuccess(res, { success: true });
  } catch (err) {
    console.error('Update quotation status error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

module.exports = router;
