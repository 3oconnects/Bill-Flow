const express = require('express');
const router  = express.Router();
const { v4: uuid } = require('uuid');
const { requireAuth } = require('../auth');
const { sendSuccess, sendError } = require('../utils/response');
const stmts = require('../db/statements/purchasing');

router.get('/', requireAuth, async (req, res) => {
  try {
    const rows = await stmts.listBlanketAgreements.all(req.orgId);
    sendSuccess(res, rows);
  } catch (err) {
    console.error('List blanket agreements error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

router.get('/:id', requireAuth, async (req, res) => {
  try {
    const doc = await stmts.getBlanketAgreement.get(req.params.id, req.orgId);
    if (!doc) return sendError(res, 'Blanket Agreement not found', 'NOT_FOUND', 404);
    sendSuccess(res, doc);
  } catch (err) {
    console.error('Get blanket agreement error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

router.post('/', requireAuth, async (req, res) => {
  try {
    const {
      agreement_number, vendor_id, vendor_name, status,
      start_date, end_date, total_value, terms, items
    } = req.body;

    if (!agreement_number) return sendError(res, 'Agreement number is required', 'VALIDATION_ERROR', 400);
    if (!vendor_name) return sendError(res, 'Vendor name is required', 'VALIDATION_ERROR', 400);

    const id = uuid();
    await stmts.insertBlanketAgreement.run(
      id, req.orgId, agreement_number, vendor_id, vendor_name, status || 'active',
      start_date || null, end_date || null, total_value || 0,
      terms || null, items ? JSON.stringify(items) : '[]', req.user.id
    );
    sendSuccess(res, { id, agreement_number }, 201);
  } catch (err) {
    console.error('Create blanket agreement error:', err);
    if (err.code === '23505' || (err.message && err.message.toLowerCase().includes('unique'))) {
      return sendError(res, 'Agreement number already exists', 'VALIDATION_ERROR', 400);
    }
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

router.put('/:id', requireAuth, async (req, res) => {
  try {
    const {
      vendor_id, vendor_name, status,
      start_date, end_date, total_value, terms, items
    } = req.body;
    
    if (!vendor_name) return sendError(res, 'Vendor name is required', 'VALIDATION_ERROR', 400);

    const result = await stmts.updateBlanketAgreement.run(
      vendor_id, vendor_name, status || 'active',
      start_date || null, end_date || null, total_value || 0,
      terms || null, items ? JSON.stringify(items) : '[]',
      req.params.id, req.orgId
    );

    if (result.changes === 0) return sendError(res, 'Blanket Agreement not found', 'NOT_FOUND', 404);
    sendSuccess(res, { id: req.params.id });
  } catch (err) {
    console.error('Update blanket agreement error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

router.put('/:id/status', requireAuth, async (req, res) => {
  try {
    const { status } = req.body;
    if (!status) return sendError(res, 'Status is required', 'VALIDATION_ERROR', 400);

    const result = await stmts.updateBlanketAgreementStatus.run(status, req.params.id, req.orgId);
    if (result.changes === 0) return sendError(res, 'Blanket Agreement not found', 'NOT_FOUND', 404);
    sendSuccess(res, { id: req.params.id, status });
  } catch (err) {
    console.error('Update blanket agreement status error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const result = await stmts.deleteBlanketAgreement.run(req.params.id, req.orgId);
    if (result.changes === 0) return sendError(res, 'Blanket Agreement not found', 'NOT_FOUND', 404);
    sendSuccess(res, { id: req.params.id });
  } catch (err) {
    console.error('Delete blanket agreement error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

module.exports = router;
