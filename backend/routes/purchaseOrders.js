const express = require('express');
const router  = express.Router();
const { v4: uuid } = require('uuid');
const { requireAuth } = require('../auth');
const { sendSuccess, sendError } = require('../utils/response');
const stmts = require('../db/statements/purchasing');

router.get('/', requireAuth, async (req, res) => {
  try {
    const rows = await stmts.listPurchaseOrders.all(req.orgId);
    sendSuccess(res, rows);
  } catch (err) {
    console.error('List purchase orders error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

router.get('/:id', requireAuth, async (req, res) => {
  try {
    const doc = await stmts.getPurchaseOrder.get(req.params.id, req.orgId);
    if (!doc) return sendError(res, 'PO not found', 'NOT_FOUND', 404);
    sendSuccess(res, doc);
  } catch (err) {
    console.error('Get purchase order error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

router.post('/', requireAuth, async (req, res) => {
  try {
    const {
      po_number, vendor_id, vendor_name, quotation_ref,
      status, expected_delivery_date, subtotal, discount_pct,
      discount_amount, tax, total, currency, notes, terms, items
    } = req.body;

    if (!po_number) return sendError(res, 'PO number is required', 'VALIDATION_ERROR', 400);
    if (!vendor_name) return sendError(res, 'Vendor name is required', 'VALIDATION_ERROR', 400);

    const id = uuid();
    await stmts.insertPurchaseOrder.run(
      id, req.orgId, po_number, vendor_id || null, vendor_name,
      quotation_ref || null, status || 'draft', expected_delivery_date || null,
      subtotal || 0, discount_pct || 0, discount_amount || 0, tax || 0,
      total || 0, currency || 'INR', notes || '', terms || '',
      JSON.stringify(items || []), req.user.id
    );

    // If there is a quotation_ref, we could update the quotation to 'converted' automatically.
    // For now, simple creation is fine.

    sendSuccess(res, { id });
  } catch (err) {
    console.error('Create purchase order error:', err);
    if (err.code === '23505') return sendError(res, 'PO number already exists', 'VALIDATION_ERROR', 400);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

router.put('/:id', requireAuth, async (req, res) => {
  try {
    const {
      vendor_id, vendor_name, quotation_ref,
      status, expected_delivery_date, subtotal, discount_pct,
      discount_amount, tax, total, currency, notes, terms, items
    } = req.body;

    if (!vendor_name) return sendError(res, 'Vendor name is required', 'VALIDATION_ERROR', 400);

    await stmts.updatePurchaseOrder.run(
      vendor_id || null, vendor_name, quotation_ref || null, status || 'draft',
      expected_delivery_date || null, subtotal || 0, discount_pct || 0,
      discount_amount || 0, tax || 0, total || 0, currency || 'INR',
      notes || '', terms || '', JSON.stringify(items || []),
      req.params.id, req.orgId
    );

    sendSuccess(res, { success: true });
  } catch (err) {
    console.error('Update purchase order error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    await stmts.deletePurchaseOrder.run(req.params.id, req.orgId);
    sendSuccess(res, { success: true });
  } catch (err) {
    console.error('Delete purchase order error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

router.patch('/:id/status', requireAuth, async (req, res) => {
  try {
    const { status } = req.body;
    if (!status) return sendError(res, 'Status is required', 'VALIDATION_ERROR', 400);
    
    await stmts.updatePurchaseOrderStatus.run(status, req.params.id, req.orgId);
    sendSuccess(res, { success: true });
  } catch (err) {
    console.error('Update PO status error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

module.exports = router;
