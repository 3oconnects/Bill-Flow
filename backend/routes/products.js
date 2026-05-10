// backend/routes/products.js
const express = require('express');
const router = express.Router();
const { v4: uuid } = require('uuid');
const { stmts, db } = require('../db');
const { requireAuth, requireAdmin } = require('../auth');
const { sendSuccess, sendError } = require('../utils/response');

router.get('/', requireAuth, async (req, res) => {
  try {
    const products = await stmts.getProducts.all(req.orgId);
    sendSuccess(res, products);
  } catch (err) {
    console.error('Get products error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

router.get('/sku/generate', requireAuth, async (req, res) => {
  try {
    const brand = (req.query.brand || 'PROD').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
    const prefix = `SKU-${brand}-`;
    const rows = await db.prepare(`SELECT sku FROM products WHERE org_id = ? AND sku LIKE ? AND deleted_at IS NULL`).all(req.orgId, prefix + '%');
    let maxSerial = 0;
    rows.forEach(r => {
      const parts = r.sku.split('-');
      const serial = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(serial) && serial > maxSerial) maxSerial = serial;
    });
    sendSuccess(res, { sku: `${prefix}${String(maxSerial + 1).padStart(4, '0')}` });
  } catch (err) {
    console.error('Generate SKU error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

router.get('/:id', requireAuth, async (req, res) => {
  try {
    const prod = await stmts.getProduct.get(req.params.id, req.orgId);
    if (!prod) return sendError(res, 'Product not found', 'NOT_FOUND', 404);
    sendSuccess(res, prod);
  } catch (err) {
    console.error('Get product error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

router.post('/', requireAuth, async (req, res) => {
  try {
    const { name, sku, hsn_code, description, category, unit, unit_price, purchase_price, tax_rate, stock_qty, low_stock_alert, image_url, brand, model_number, warranty_type, warranty_duration, warranty_unit, warranty_terms, guarantee_type, guarantee_duration, guarantee_unit, guarantee_terms, is_active } = req.body;
    if (!name) return sendError(res, 'Name is required', 'VALIDATION_ERROR', 400);
    const id = uuid();
    const unique_id = uuid().split('-')[0].toUpperCase();
    await stmts.insertProduct.run(id, req.orgId, unique_id, name, sku||'', hsn_code||'', description||'', category||'general', unit||'pcs', unit_price||0, purchase_price||0, tax_rate||18, stock_qty||0, low_stock_alert||5, image_url||'', brand||'', model_number||'', warranty_type||'none', warranty_duration||0, warranty_unit||'months', warranty_terms||'', guarantee_type||'none', guarantee_duration||0, guarantee_unit||'days', guarantee_terms||'', is_active===undefined?1:is_active, req.user.id);
    sendSuccess(res, { id, unique_id });
  } catch (err) {
    console.error('Create product error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { name, sku, hsn_code, description, category, unit, unit_price, purchase_price, tax_rate, stock_qty, low_stock_alert, image_url, brand, model_number, warranty_type, warranty_duration, warranty_unit, warranty_terms, guarantee_type, guarantee_duration, guarantee_unit, guarantee_terms, is_active } = req.body;
    if (!name) return sendError(res, 'Name is required', 'VALIDATION_ERROR', 400);
    await stmts.updateProduct.run(name, sku||'', hsn_code||'', description||'', category||'general', unit||'pcs', unit_price||0, purchase_price||0, tax_rate||18, stock_qty||0, low_stock_alert||5, image_url||'', brand||'', model_number||'', warranty_type||'none', warranty_duration||0, warranty_unit||'months', warranty_terms||'', guarantee_type||'none', guarantee_duration||0, guarantee_unit||'days', guarantee_terms||'', is_active===undefined?1:is_active, req.params.id, req.orgId);
    sendSuccess(res, null);
  } catch (err) {
    console.error('Update product error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    await stmts.deleteProduct.run(req.params.id, req.orgId);
    sendSuccess(res, null);
  } catch (err) {
    console.error('Delete product error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

router.patch('/:id/stock', requireAuth, async (req, res) => {
  try {
    const { delta } = req.body;
    if (isNaN(delta)) return sendError(res, 'Invalid delta', 'VALIDATION_ERROR', 400);
    await stmts.updateProductStock.run(delta, req.params.id, req.orgId);
    sendSuccess(res, null);
  } catch (err) {
    console.error('Update stock error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

// Product Vendors
router.get('/:id/vendors', requireAuth, async (req, res) => {
  try {
    const vendors = await stmts.getProductVendors.all(req.params.id, req.orgId);
    sendSuccess(res, vendors);
  } catch (err) {
    console.error('Get product vendors error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

router.post('/:id/vendors', requireAuth, async (req, res) => {
  try {
    const { vendor_id, supply_price, is_primary, notes } = req.body;
    if (!vendor_id) return sendError(res, 'vendor_id required', 'VALIDATION_ERROR', 400);
    
    const product = await db.prepare(`SELECT id FROM products WHERE id = ? AND org_id = ? AND deleted_at IS NULL`).get(req.params.id, req.orgId);
    if (!product) return sendError(res, 'Product not found', 'NOT_FOUND', 404);
    const vendor = await db.prepare(`SELECT id FROM vendors WHERE id = ? AND org_id = ? AND deleted_at IS NULL`).get(vendor_id, req.orgId);
    if (!vendor) return sendError(res, 'Vendor not found', 'NOT_FOUND', 404);
    
    const existing = await db.prepare(`SELECT id FROM product_vendors WHERE product_id = ? AND vendor_id = ? AND org_id = ? AND deleted_at IS NULL`).get(req.params.id, vendor_id, req.orgId);
    if (existing) return sendSuccess(res, { id: existing.id, duplicate: true });

    const vid = uuid();
    if (is_primary) await stmts.clearPrimaryVendor.run(req.params.id, req.orgId);
    await stmts.insertProductVendor.run(vid, req.orgId, req.params.id, vendor_id, supply_price||0, is_primary?1:0, notes||'', req.user.id);
    sendSuccess(res, { id: vid });
  } catch (err) {
    console.error('Add product vendor error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

router.put('/:id/vendors/:pvid', requireAuth, async (req, res) => {
  try {
    const { supply_price, is_primary, notes } = req.body;
    if (is_primary) await stmts.clearPrimaryVendor.run(req.params.id, req.orgId);
    await stmts.updateProductVendor.run(supply_price||0, is_primary?1:0, notes||'', req.params.pvid, req.orgId);
    sendSuccess(res, null);
  } catch (err) {
    console.error('Update product vendor error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

router.delete('/:id/vendors/:pvid', requireAuth, async (req, res) => {
  try {
    await stmts.deleteProductVendor.run(req.params.pvid, req.orgId);
    sendSuccess(res, null);
  } catch (err) {
    console.error('Delete product vendor error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

router.post('/bulk', requireAuth, async (req, res) => {
  try {
    const { products } = req.body;
    if (!Array.isArray(products)) return sendError(res, 'Invalid products array', 'VALIDATION_ERROR', 400);

    let succeeded = 0;
    let failed = 0;
    const failedRows = [];

    for (let i = 0; i < products.length; i++) {
      const p = products[i];
      try {
        const id = uuid();
        const unique_id = uuid().split('-')[0].toUpperCase();
        
        // Ensure SKU is generated if empty
        let sku = p.sku || '';
        if (!sku) {
          const brand = (p.brand || 'PROD').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
          const prefix = `SKU-${brand}-`;
          const rows = await db.prepare(`SELECT sku FROM products WHERE org_id = ? AND sku LIKE ? AND deleted_at IS NULL`).all(req.orgId, prefix + '%');
          let maxSerial = 0;
          rows.forEach(r => {
            const parts = r.sku.split('-');
            const serial = parseInt(parts[parts.length - 1], 10);
            if (!isNaN(serial) && serial > maxSerial) maxSerial = serial;
          });
          sku = `${prefix}${String(maxSerial + 1).padStart(4, '0')}`;
        }

        await stmts.insertProduct.run(
          id, req.orgId, unique_id, p.name, sku, p.hsn_code||'', p.description||'', 
          p.category||'general', p.unit||'pcs', p.unit_price||0, p.purchase_price||0, 
          p.tax_rate||18, p.stock_qty||0, p.low_stock_alert||5, p.image_url||'', 
          p.brand||'', p.model_number||'', p.warranty_type||'none', 
          parseInt(p.warranty_duration)||0, p.warranty_unit||'months', p.warranty_terms||'', 
          p.guarantee_type||'none', parseInt(p.guarantee_duration)||0, 
          p.guarantee_unit||'days', p.guarantee_terms||'', 1, req.user.id
        );
        succeeded++;
      } catch (err) {
        console.error(`Bulk upload failed for row ${i}:`, err);
        failed++;
        failedRows.push({
          row: i + 1,
          name: p.name,
          error: err.message
        });
      }
    }

    sendSuccess(res, { succeeded, failed, failedRows });
  } catch (err) {
    console.error('Bulk upload error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

module.exports = router;
