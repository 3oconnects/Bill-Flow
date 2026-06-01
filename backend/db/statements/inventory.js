// backend/db/statements/inventory.js
const db = require('../conn');

module.exports = {
  
  // Vendors
  insertVendor: db.prepare(`INSERT INTO vendors (id, org_id, vendor_id, name, company_name, contact_person, email, phone, address, street, city, state, pincode, country, gstin, bank_account, ifsc, bank_name, bank_branch, status, notes, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`),
  getVendors: db.prepare(`SELECT id, org_id, vendor_id, name, company_name, contact_person, email, phone, address, street, city, state, pincode, country, gstin, bank_account, ifsc, bank_name, bank_branch, status, notes, created_at FROM vendors WHERE org_id = ? AND deleted_at IS NULL ORDER BY name`),
  getVendor: db.prepare(`SELECT id, org_id, vendor_id, name, company_name, contact_person, email, phone, address, street, city, state, pincode, country, gstin, bank_account, ifsc, bank_name, bank_branch, status, notes, created_at FROM vendors WHERE id = ? AND org_id = ? AND deleted_at IS NULL`),
  updateVendor: db.prepare(`UPDATE vendors SET name=?, company_name=?, contact_person=?, email=?, phone=?, address=?, street=?, city=?, state=?, pincode=?, country=?, gstin=?, bank_account=?, ifsc=?, bank_name=?, bank_branch=?, status=?, notes=?, updated_at=CURRENT_TIMESTAMP WHERE id=? AND org_id=?`),
  deleteVendor: db.prepare(`UPDATE vendors SET deleted_at=CURRENT_TIMESTAMP WHERE id=? AND org_id=?`),
  getLastVendorId: db.prepare(`SELECT vendor_id FROM vendors WHERE org_id = ? AND vendor_id IS NOT NULL AND vendor_id != '' ORDER BY created_at DESC LIMIT 50`),

  // Vendor Documents
  insertVendorDoc: db.prepare(`INSERT INTO vendor_documents (id, org_id, vendor_id, name, doc_type, file_url, storage_key, file_name, file_size, mime_type, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`),
  getVendorDocs: db.prepare(`SELECT id, org_id, vendor_id, name, doc_type, file_url, storage_key, file_name, file_size, mime_type, notes, created_at FROM vendor_documents WHERE vendor_id = ? AND org_id = ? AND deleted_at IS NULL ORDER BY created_at DESC`),
  getVendorDoc: db.prepare(`SELECT id, org_id, vendor_id, name, doc_type, file_url, storage_key, file_name, file_size, mime_type, notes, created_at FROM vendor_documents WHERE id = ? AND org_id = ? AND deleted_at IS NULL`),
  deleteVendorDoc: db.prepare(`UPDATE vendor_documents SET deleted_at=CURRENT_TIMESTAMP WHERE id = ? AND org_id = ?`),

  // Product Vendors
  insertProductVendor: db.prepare(`INSERT INTO product_vendors (id, org_id, product_id, vendor_id, supply_price, is_primary, notes, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`),
  getProductVendors: db.prepare(`SELECT pv.id, pv.org_id, pv.product_id, pv.vendor_id, pv.supply_price, pv.is_primary, pv.notes, pv.created_at, v.name as vendor_name, v.vendor_id as vendor_code, v.email as vendor_email, v.phone as vendor_phone FROM product_vendors pv LEFT JOIN vendors v ON pv.vendor_id = v.id WHERE pv.product_id = ? AND pv.org_id = ? AND pv.deleted_at IS NULL ORDER BY pv.is_primary DESC, pv.created_at DESC`),
  deleteProductVendor: db.prepare(`UPDATE product_vendors SET deleted_at=CURRENT_TIMESTAMP WHERE id = ? AND org_id = ?`),
  updateProductVendor: db.prepare(`UPDATE product_vendors SET supply_price=?, is_primary=?, notes=?, updated_at=CURRENT_TIMESTAMP WHERE id=? AND org_id=?`),
  clearPrimaryVendor: db.prepare(`UPDATE product_vendors SET is_primary=0, updated_at=CURRENT_TIMESTAMP WHERE product_id=? AND org_id=?`),

  // Expenses
  insertExpense: db.prepare(`INSERT INTO expenses (id, org_id, description, amount, date, category, vendor_id, vendor_name, reference, currency, gst_rate, notes, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`),
  getExpenses: db.prepare(`SELECT id, org_id, description, amount, date, category, vendor_id, vendor_name, reference, currency, gst_rate, notes, created_at FROM expenses WHERE org_id = ? AND deleted_at IS NULL ORDER BY date DESC`),
  updateExpense: db.prepare(`UPDATE expenses SET description=?, amount=?, date=?, category=?, vendor_id=?, vendor_name=?, reference=?, currency=?, gst_rate=?, notes=?, updated_at=CURRENT_TIMESTAMP WHERE id=? AND org_id=?`),
  deleteExpense: db.prepare(`UPDATE expenses SET deleted_at=CURRENT_TIMESTAMP WHERE id=? AND org_id=?`),

  // Products
  insertProduct: db.prepare(`INSERT INTO products (id, org_id, unique_id, name, sku, hsn_code, description, category, unit, unit_price, purchase_price, tax_rate, stock_qty, low_stock_alert, image_url, brand, model_number, warranty_type, warranty_duration, warranty_unit, warranty_terms, guarantee_type, guarantee_duration, guarantee_unit, guarantee_terms, is_active, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`),
  getProducts: db.prepare(`SELECT id, org_id, unique_id, name, sku, hsn_code, description, category, unit, unit_price, purchase_price, tax_rate, stock_qty, low_stock_alert, image_url, brand, model_number, warranty_type, warranty_duration, warranty_unit, warranty_terms, guarantee_type, guarantee_duration, guarantee_unit, guarantee_terms, is_active, created_at FROM products WHERE org_id = ? AND deleted_at IS NULL ORDER BY name`),
  getProduct: db.prepare(`SELECT id, org_id, unique_id, name, sku, hsn_code, description, category, unit, unit_price, purchase_price, tax_rate, stock_qty, low_stock_alert, image_url, brand, model_number, warranty_type, warranty_duration, warranty_unit, warranty_terms, guarantee_type, guarantee_duration, guarantee_unit, guarantee_terms, is_active, created_at FROM products WHERE id = ? AND org_id = ? AND deleted_at IS NULL`),
  updateProduct: db.prepare(`UPDATE products SET name=?, sku=?, hsn_code=?, description=?, category=?, unit=?, unit_price=?, purchase_price=?, tax_rate=?, stock_qty=?, low_stock_alert=?, image_url=?, brand=?, model_number=?, warranty_type=?, warranty_duration=?, warranty_unit=?, warranty_terms=?, guarantee_type=?, guarantee_duration=?, guarantee_unit=?, guarantee_terms=?, is_active=?, updated_at=CURRENT_TIMESTAMP WHERE id=? AND org_id=?`),
  deleteProduct: db.prepare(`UPDATE products SET deleted_at=CURRENT_TIMESTAMP WHERE id=? AND org_id=?`),
  updateProductStock: db.prepare(`UPDATE products SET stock_qty=stock_qty+?, updated_at=CURRENT_TIMESTAMP WHERE id=? AND org_id=?`),

  // Stock movements
  insertStockMovement: db.prepare(`INSERT INTO stock_movements (id, org_id, product_id, type, delta, qty_before, qty_after, reason, note, reference_id, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`),
  getStockMovements: db.prepare(`SELECT sm.*, u.name as created_by_name FROM stock_movements sm LEFT JOIN users u ON sm.created_by = u.id WHERE sm.org_id = ? AND sm.product_id = ? ORDER BY sm.created_at DESC LIMIT 100`),

  // Product categories
  getProductCategories: db.prepare(`SELECT * FROM product_categories WHERE org_id = ? ORDER BY sort_order, name`),
  insertProductCategory: db.prepare(`INSERT INTO product_categories (id, org_id, name, color, sort_order) VALUES (?, ?, ?, ?, ?)`),
  updateProductCategory: db.prepare(`UPDATE product_categories SET name=?, color=?, sort_order=?, updated_at=CURRENT_TIMESTAMP WHERE id=? AND org_id=?`),
  deleteProductCategory: db.prepare(`DELETE FROM product_categories WHERE id=? AND org_id=?`),

  // Price lists
  getPriceLists: db.prepare(`SELECT * FROM price_lists WHERE org_id = ? AND product_id = ? AND is_active = TRUE ORDER BY min_qty`),
  insertPriceList: db.prepare(`INSERT INTO price_lists (id, org_id, product_id, label, price, min_qty, currency) VALUES (?, ?, ?, ?, ?, ?, ?)`),
  updatePriceList: db.prepare(`UPDATE price_lists SET label=?, price=?, min_qty=?, currency=?, updated_at=CURRENT_TIMESTAMP WHERE id=? AND org_id=?`),
  deletePriceList: db.prepare(`DELETE FROM price_lists WHERE id=? AND org_id=?`),
};
