// backend/routes/vendors.js
const express = require('express');
const router = express.Router();
const { v4: uuid } = require('uuid');
const { stmts, db } = require('../db');
const { requireAuth, requireAdmin } = require('../auth');
const { sendSuccess, sendError } = require('../utils/response');

router.get('/', requireAuth, async (req, res) => {
  try {
    const vendors = await stmts.getVendors.all(req.orgId);
    sendSuccess(res, vendors);
  } catch (err) {
    console.error('Get vendors error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

router.get('/:id', requireAuth, async (req, res) => {
  try {
    const vendor = await stmts.getVendor.get(req.params.id, req.orgId);
    if (!vendor) return sendError(res, 'Vendor not found', 'NOT_FOUND', 404);
    const docs = await stmts.getVendorDocs.all(req.params.id, req.orgId);
    sendSuccess(res, { ...vendor, documents: docs });
  } catch (err) {
    console.error('Get vendor error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

router.post('/', requireAuth, async (req, res) => {
  try {
    const { name, email, phone, address, gstin, pan, bank_account, ifsc, notes, vendor_id, company_name, contact_person, street, city, state, pincode, country, bank_name, bank_branch, status } = req.body;
    if (!name) return sendError(res, 'Name is required', 'VALIDATION_ERROR', 400);
    const id = uuid();
    await stmts.insertVendor.run(
      id, req.orgId, vendor_id||'', name, company_name||'', contact_person||'',
      email||'', phone||'', address||'', street||'', city||'', state||'',
      pincode||'', country||'India', gstin||'', bank_account||'', ifsc||'',
      bank_name||'', bank_branch||'', status||'active', notes||'', req.user.id
    );
    sendSuccess(res, { id });
  } catch (err) {
    console.error('Create vendor error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { name, email, phone, address, gstin, pan, bank_account, ifsc, notes, vendor_id, company_name, contact_person, street, city, state, pincode, country, bank_name, bank_branch, status } = req.body;
    if (!name) return sendError(res, 'Name is required', 'VALIDATION_ERROR', 400);
    await stmts.updateVendor.run(
      name, company_name||'', contact_person||'', email||'', phone||'', address||'',
      street||'', city||'', state||'', pincode||'', country||'India', gstin||'',
      bank_account||'', ifsc||'', bank_name||'', bank_branch||'', status||'active',
      notes||'', req.params.id, req.orgId
    );
    sendSuccess(res, null);
  } catch (err) {
    console.error('Update vendor error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    await stmts.deleteVendor.run(req.params.id, req.orgId);
    sendSuccess(res, null);
  } catch (err) {
    console.error('Delete vendor error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

// Vendor Documents
router.post('/:id/documents', requireAuth, async (req, res) => {
  try {
    const { name, doc_type, file_data, file_name, file_size, mime_type, notes, file_url, storage_key } = req.body;
    if (!name || (!file_data && !file_url)) return sendError(res, 'Name and file data/url required', 'VALIDATION_ERROR', 400);
    const id = uuid();
    // Support both legacy file_data (mapped to file_url) and new file_url/storage_key
    await stmts.insertVendorDoc.run(id, req.orgId, req.params.id, name, doc_type||'other', file_url || file_data, storage_key || '', file_name||'', file_size||0, mime_type||'', notes||'');
    sendSuccess(res, { id });
  } catch (err) {
    console.error('Upload document error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

router.delete('/:id/documents/:docId', requireAuth, async (req, res) => {
  try {
    await stmts.deleteVendorDoc.run(req.params.docId, req.orgId);
    sendSuccess(res, null);
  } catch (err) {
    console.error('Delete document error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

module.exports = router;
