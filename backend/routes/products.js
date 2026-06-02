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

// Image upload — stores base64 data-URL directly in image_url column (no external storage needed)
router.post('/:id/image', requireAuth, async (req, res) => {
  try {
    const { data_url } = req.body;
    if (!data_url || !data_url.startsWith('data:image/')) return sendError(res, 'Invalid image data', 'VALIDATION_ERROR', 400);
    if (data_url.length > 2 * 1024 * 1024) return sendError(res, 'Image too large (max 1.5 MB)', 'VALIDATION_ERROR', 400);
    const product = await stmts.getProduct.get(req.params.id, req.orgId);
    if (!product) return sendError(res, 'Product not found', 'NOT_FOUND', 404);
    await stmts.updateProduct.run(
      product.name, product.sku, product.hsn_code, product.description, product.category,
      product.unit, product.unit_price, product.purchase_price, product.tax_rate,
      product.stock_qty, product.low_stock_alert, data_url,
      product.brand, product.model_number, product.warranty_type, product.warranty_duration,
      product.warranty_unit, product.warranty_terms, product.guarantee_type,
      product.guarantee_duration, product.guarantee_unit, product.guarantee_terms,
      product.is_active, req.params.id, req.orgId
    );
    sendSuccess(res, { image_url: data_url });
  } catch (err) {
    console.error('Image upload error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

router.patch('/:id/stock', requireAuth, async (req, res) => {
  try {
    const { delta, reason, note } = req.body;
    if (isNaN(delta)) return sendError(res, 'Invalid delta', 'VALIDATION_ERROR', 400);
    const product = await stmts.getProduct.get(req.params.id, req.orgId);
    if (!product) return sendError(res, 'Product not found', 'NOT_FOUND', 404);
    const qty_before = Number(product.stock_qty);
    const qty_after  = qty_before + Number(delta);
    await stmts.updateProductStock.run(delta, req.params.id, req.orgId);
    await stmts.insertStockMovement.run(uuid(), req.orgId, req.params.id, 'adjustment', delta, qty_before, qty_after, reason||'manual', note||'', null, req.user.id);
    sendSuccess(res, { qty_before, qty_after });
  } catch (err) {
    console.error('Update stock error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

// Stock movement history
router.get('/:id/stock-history', requireAuth, async (req, res) => {
  try {
    const movements = await stmts.getStockMovements.all(req.orgId, req.params.id);
    sendSuccess(res, movements);
  } catch (err) {
    if (err.message?.includes('does not exist') || err.message?.includes('no such table')) {
      return sendSuccess(res, []); // migration not yet run
    }
    console.error('Stock history error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

// Sales history — invoices that included this product
router.get('/:id/sales-history', requireAuth, async (req, res) => {
  try {
    const rows = await db.prepare(`
      SELECT ii.id, ii.invoice_id, ii.quantity, ii.unit_price, ii.amount, ii.tax_rate, ii.tax_amount,
             i.number as invoice_number, i.date as invoice_date, i.status as invoice_status,
             c.name as customer_name
      FROM invoice_items ii
      JOIN invoices i ON ii.invoice_id = i.id AND i.org_id = ii.org_id
      LEFT JOIN customers c ON i.customer_id = c.id
      WHERE ii.product_id = ? AND ii.org_id = ? AND i.deleted_at IS NULL
      ORDER BY i.date DESC
      LIMIT 50
    `).all(req.params.id, req.orgId);
    sendSuccess(res, rows);
  } catch (err) {
    if (err.message?.includes('does not exist') || err.message?.includes('no such table')) {
      return sendSuccess(res, []);
    }
    console.error('Sales history error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

// Clone product
router.post('/:id/clone', requireAuth, async (req, res) => {
  try {
    const original = await stmts.getProduct.get(req.params.id, req.orgId);
    if (!original) return sendError(res, 'Product not found', 'NOT_FOUND', 404);
    const newId = uuid();
    const unique_id = uuid().split('-')[0].toUpperCase();
    const newSku = original.sku ? original.sku + '-COPY' : '';
    await stmts.insertProduct.run(newId, req.orgId, unique_id, 'Copy of ' + original.name, newSku,
      original.hsn_code, original.description, original.category, original.unit,
      original.unit_price, original.purchase_price, original.tax_rate, 0,
      original.low_stock_alert, original.image_url, original.brand, original.model_number,
      original.warranty_type, original.warranty_duration, original.warranty_unit, original.warranty_terms,
      original.guarantee_type, original.guarantee_duration, original.guarantee_unit, original.guarantee_terms,
      1, req.user.id);
    sendSuccess(res, { id: newId });
  } catch (err) {
    console.error('Clone product error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

// Export products as CSV data
router.get('/export/csv', requireAuth, async (req, res) => {
  try {
    const products = await stmts.getProducts.all(req.orgId);
    const headers = ['Name','SKU','Brand','Model Number','Category','Unit','Sell Price','Purchase Price','GST Rate','Stock Qty','Low Stock Alert','HSN Code','Status','Description'];
    const rows = products.map(p => [
      p.name, p.sku, p.brand, p.model_number, p.category, p.unit,
      p.unit_price, p.purchase_price, p.tax_rate, p.stock_qty, p.low_stock_alert,
      p.hsn_code, p.is_active ? 'Active' : 'Inactive', p.description
    ].map(v => `"${String(v||'').replace(/"/g,'""')}"`).join(','));
    const csv = [headers.join(','), ...rows].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="products.csv"');
    res.send(csv);
  } catch (err) {
    console.error('Export error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

// Product categories
router.get('/categories/list', requireAuth, async (req, res) => {
  try {
    const cats = await stmts.getProductCategories.all(req.orgId);
    sendSuccess(res, cats);
  } catch (err) {
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});
router.post('/categories/list', requireAuth, async (req, res) => {
  try {
    const { name, color, sort_order } = req.body;
    if (!name) return sendError(res, 'Name required', 'VALIDATION_ERROR', 400);
    const id = uuid();
    await stmts.insertProductCategory.run(id, req.orgId, name, color||'#6366f1', sort_order||0);
    sendSuccess(res, { id });
  } catch (err) {
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});
router.put('/categories/:catId', requireAuth, async (req, res) => {
  try {
    const { name, color, sort_order } = req.body;
    await stmts.updateProductCategory.run(name, color||'#6366f1', sort_order||0, req.params.catId, req.orgId);
    sendSuccess(res, null);
  } catch (err) {
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});
router.delete('/categories/:catId', requireAuth, async (req, res) => {
  try {
    await stmts.deleteProductCategory.run(req.params.catId, req.orgId);
    sendSuccess(res, null);
  } catch (err) {
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

// Price lists
router.get('/:id/price-lists', requireAuth, async (req, res) => {
  try {
    const lists = await stmts.getPriceLists.all(req.orgId, req.params.id);
    sendSuccess(res, lists);
  } catch (err) {
    if (err.message?.includes('does not exist') || err.message?.includes('no such table')) return sendSuccess(res, []);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});
router.post('/:id/price-lists', requireAuth, async (req, res) => {
  try {
    const { label, price, min_qty, currency } = req.body;
    if (!label || isNaN(price)) return sendError(res, 'label and price required', 'VALIDATION_ERROR', 400);
    const id = uuid();
    await stmts.insertPriceList.run(id, req.orgId, req.params.id, label, price, min_qty||1, currency||'INR');
    sendSuccess(res, { id });
  } catch (err) {
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});
router.put('/:id/price-lists/:plId', requireAuth, async (req, res) => {
  try {
    const { label, price, min_qty, currency } = req.body;
    await stmts.updatePriceList.run(label, price, min_qty||1, currency||'INR', req.params.plId, req.orgId);
    sendSuccess(res, null);
  } catch (err) {
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});
router.delete('/:id/price-lists/:plId', requireAuth, async (req, res) => {
  try {
    await stmts.deletePriceList.run(req.params.plId, req.orgId);
    sendSuccess(res, null);
  } catch (err) {
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

// Product Vendors

module.exports = router;