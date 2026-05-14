// backend/routes/warranty.js
const express = require('express');
const router = express.Router();
const { v4: uuid } = require('uuid');
const { stmts } = require('../db');
const { requireAuth } = require('../auth');
const { sendSuccess, sendError } = require('../utils/response');

router.get('/', requireAuth, async (req, res) => {
  try {
    const claims = await stmts.getWarrantyClaims.all(req.orgId);
    sendSuccess(res, claims);
  } catch (err) {
    console.error('Get warranty claims error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

router.post('/', requireAuth, async (req, res) => {
  try {
    const { customer_id, invoice_id, invoice_number, product_name, model_number, issue_description, proof_url, storage_key, proof_data, notes } = req.body;
    if (!customer_id || !product_name || !issue_description)
      return sendError(res, 'Required fields missing', 'VALIDATION_ERROR', 400);

    const id = uuid();
    await stmts.insertWarrantyClaim.run(
      id, req.orgId, customer_id, invoice_id || null, invoice_number || '', 
      product_name, model_number || '', issue_description, 
      proof_url || proof_data || '', storage_key || '', notes || '', req.user.id
    );
    sendSuccess(res, { id });
  } catch (err) {
    console.error('Create warranty claim error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

router.patch('/:id/status', requireAuth, async (req, res) => {
  try {
    const { status, notes } = req.body;
    await stmts.updateWarrantyClaimStatus.run(status, notes || '', req.params.id, req.orgId);
    sendSuccess(res, null);
  } catch (err) {
    console.error('Update warranty status error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    await stmts.deleteWarrantyClaim.run(req.params.id, req.orgId);
    sendSuccess(res, null);
  } catch (err) {
    console.error('Delete warranty claim error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

module.exports = router;
