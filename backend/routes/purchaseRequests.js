const express = require('express');
const router  = express.Router();
const { v4: uuid } = require('uuid');
const { requireAuth } = require('../auth');
const { sendSuccess, sendError } = require('../utils/response');
const stmts = require('../db/statements/purchasing');

router.get('/', requireAuth, async (req, res) => {
  try {
    const rows = await stmts.listPurchaseRequests.all(req.orgId);
    sendSuccess(res, rows);
  } catch (err) {
    console.error('List purchase requests error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

router.get('/:id', requireAuth, async (req, res) => {
  try {
    const doc = await stmts.getPurchaseRequest.get(req.params.id, req.orgId);
    if (!doc) return sendError(res, 'Purchase Request not found', 'NOT_FOUND', 404);
    sendSuccess(res, doc);
  } catch (err) {
    console.error('Get purchase request error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

router.post('/', requireAuth, async (req, res) => {
  try {
    const {
      request_number, department, requested_by_name, status,
      required_date, items, notes
    } = req.body;

    if (!request_number) return sendError(res, 'Request number is required', 'VALIDATION_ERROR', 400);

    const id = uuid();
    await stmts.insertPurchaseRequest.run(
      id, req.orgId, request_number, department || null, requested_by_name || null, status || 'draft',
      required_date || null, items ? JSON.stringify(items) : '[]', notes || null, req.user.id
    );
    sendSuccess(res, { id, request_number }, 201);
  } catch (err) {
    console.error('Create purchase request error:', err);
    if (err.code === '23505' || (err.message && err.message.toLowerCase().includes('unique'))) {
      return sendError(res, 'Request number already exists', 'VALIDATION_ERROR', 400);
    }
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

router.put('/:id', requireAuth, async (req, res) => {
  try {
    const {
      department, requested_by_name, status,
      required_date, items, notes
    } = req.body;

    const result = await stmts.updatePurchaseRequest.run(
      department || null, requested_by_name || null, status || 'draft',
      required_date || null, items ? JSON.stringify(items) : '[]', notes || null,
      req.params.id, req.orgId
    );

    if (result.changes === 0) return sendError(res, 'Purchase Request not found', 'NOT_FOUND', 404);
    sendSuccess(res, { id: req.params.id });
  } catch (err) {
    console.error('Update purchase request error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

router.put('/:id/status', requireAuth, async (req, res) => {
  try {
    const { status } = req.body;
    if (!status) return sendError(res, 'Status is required', 'VALIDATION_ERROR', 400);

    const result = await stmts.updatePurchaseRequestStatus.run(status, req.params.id, req.orgId);
    if (result.changes === 0) return sendError(res, 'Purchase Request not found', 'NOT_FOUND', 404);
    sendSuccess(res, { id: req.params.id, status });
  } catch (err) {
    console.error('Update purchase request status error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const result = await stmts.deletePurchaseRequest.run(req.params.id, req.orgId);
    if (result.changes === 0) return sendError(res, 'Purchase Request not found', 'NOT_FOUND', 404);
    sendSuccess(res, { id: req.params.id });
  } catch (err) {
    console.error('Delete purchase request error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

module.exports = router;
