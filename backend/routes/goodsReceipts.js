'use strict';
const express = require('express');
const router = express.Router();
const db = require('../db/conn');
const stmts = require('../db/statements/purchasing');
const { v4: uuidv4 } = require('uuid');
const { sendSuccess, sendError } = require('../utils/response');
const { requireAuth } = require('../auth');

router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    const receipts = await stmts.listGoodsReceipts.all(req.orgId);
    sendSuccess(res, receipts);
  } catch (err) {
    console.error('List goods receipts error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const {
      receipt_number, vendor_id, vendor_name, base_po_no,
      posting_date, document_date, status, remarks, items
    } = req.body;

    if (!receipt_number || !vendor_name) {
      return sendError(res, 'Missing required fields', 'VALIDATION_ERROR', 400);
    }

    const id = uuidv4();
    await stmts.insertGoodsReceipt.run(
      id, req.orgId, receipt_number, vendor_id || null, vendor_name, base_po_no || null,
      posting_date || null, document_date || null, status || 'open',
      remarks || null, items ? JSON.stringify(items) : '[]', req.user.id
    );
    sendSuccess(res, { id, receipt_number }, 201);
  } catch (err) {
    console.error('Create goods receipt error:', err);
    if (err.code === '23505' || (err.message && err.message.toLowerCase().includes('unique'))) {
      return sendError(res, 'Receipt number already exists', 'VALIDATION_ERROR', 400);
    }
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

module.exports = router;
