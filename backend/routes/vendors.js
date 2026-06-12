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

// ── Vendor ↔ Products links (product_vendors join table) ───────────────────
// List products linked to a vendor with supply price + primary flag.
router.get('/:id/products', requireAuth, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT pv.id, pv.product_id, pv.supply_price, pv.is_primary, pv.notes,
              p.name AS product_name, p.sku, p.hsn_code,
              p.unit_price, p.stock_qty
         FROM product_vendors pv
         JOIN products p ON p.id = pv.product_id AND p.org_id = pv.org_id
        WHERE pv.org_id=$1 AND pv.vendor_id=$2 AND pv.deleted_at IS NULL
          AND p.deleted_at IS NULL
        ORDER BY pv.is_primary DESC, p.name ASC`,
      [req.orgId, req.params.id]
    );
    sendSuccess(res, rows);
  } catch (err) {
    console.error('Get vendor products error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

// Link a product to a vendor.
router.post('/:id/products', requireAuth, async (req, res) => {
  try {
    const { product_id, supply_price, is_primary, notes } = req.body;
    if (!product_id) return sendError(res, 'product_id is required', 'VALIDATION_ERROR', 400);

    // Reject duplicate active link for same (vendor, product) pair.
    const existing = await db.query(
      `SELECT id FROM product_vendors
        WHERE org_id=$1 AND vendor_id=$2 AND product_id=$3 AND deleted_at IS NULL`,
      [req.orgId, req.params.id, product_id]
    );
    if (existing.rowCount) {
      return sendError(res, 'Product already linked to this vendor', 'DUPLICATE', 409);
    }

    const pvId = uuid();
    await db.query(
      `INSERT INTO product_vendors
         (id, org_id, product_id, vendor_id, supply_price, is_primary, notes, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [pvId, req.orgId, product_id, req.params.id,
       parseFloat(supply_price || 0), !!is_primary, notes || null, req.user.id]
    );
    sendSuccess(res, { id: pvId });
  } catch (err) {
    console.error('Link vendor product error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

// Update supply price / primary flag for a vendor-product link.
router.put('/:id/products/:pvId', requireAuth, async (req, res) => {
  try {
    const { supply_price, is_primary, notes } = req.body;
    const r = await db.query(
      `UPDATE product_vendors
          SET supply_price=$1, is_primary=$2, notes=$3, updated_at=CURRENT_TIMESTAMP
        WHERE id=$4 AND vendor_id=$5 AND org_id=$6 AND deleted_at IS NULL`,
      [parseFloat(supply_price || 0), !!is_primary, notes || null,
       req.params.pvId, req.params.id, req.orgId]
    );
    if (!r.rowCount) return sendError(res, 'Link not found', 'NOT_FOUND', 404);
    sendSuccess(res, null);
  } catch (err) {
    console.error('Update vendor product error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

// Unlink a product from a vendor.
router.delete('/:id/products/:pvId', requireAuth, async (req, res) => {
  try {
    await db.query(
      `UPDATE product_vendors SET deleted_at=CURRENT_TIMESTAMP
        WHERE id=$1 AND vendor_id=$2 AND org_id=$3`,
      [req.params.pvId, req.params.id, req.orgId]
    );
    sendSuccess(res, null);
  } catch (err) {
    console.error('Unlink vendor product error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

module.exports = router;
