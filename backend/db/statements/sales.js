// backend/db/statements/sales.js
const db = require('../conn');

module.exports = {
  // Customers
  insertCustomer: db.prepare(`INSERT INTO customers (id, org_id, name, email, phone, address, city, state, country, pincode, gstin, pan, currency, credit_limit, notes, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`),
  getCustomers: db.prepare(`SELECT id, org_id, name, email, phone, address, city, state, country, pincode, gstin, pan, currency, credit_limit, notes, outstanding, created_at FROM customers WHERE org_id = ? AND deleted_at IS NULL ORDER BY name`),
  getCustomer: db.prepare(`SELECT id, org_id, name, email, phone, address, city, state, country, pincode, gstin, pan, currency, credit_limit, notes, outstanding, created_at FROM customers WHERE id = ? AND org_id = ? AND deleted_at IS NULL`),
  updateCustomer: db.prepare(`UPDATE customers SET name=?, email=?, phone=?, address=?, city=?, state=?, country=?, pincode=?, gstin=?, pan=?, currency=?, credit_limit=?, notes=?, updated_at=CURRENT_TIMESTAMP WHERE id=? AND org_id=?`),
  deleteCustomer: db.prepare(`UPDATE customers SET deleted_at=CURRENT_TIMESTAMP WHERE id=? AND org_id=?`),
  updateCustomerOutstanding: db.prepare(`UPDATE customers SET outstanding=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`),

  // Invoices
  insertInvoice: db.prepare(`INSERT INTO invoices (id, org_id, number, customer_id, customer_name, customer_phone, customer_email, date, due_date, currency, place_of_supply, status, subtotal, discount_pct, discount_amount, tax, total, notes, terms, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`),
  getInvoices: db.prepare(`SELECT id, org_id, number, customer_id, customer_name, customer_phone, customer_email, date, due_date, currency, place_of_supply, status, shipment_status, subtotal, discount_pct, discount_amount, tax, total, notes, terms, created_by, created_at FROM invoices WHERE org_id = ? AND deleted_at IS NULL ORDER BY date DESC`),
  getInvoice: db.prepare(`SELECT id, org_id, number, customer_id, customer_name, customer_phone, customer_email, date, due_date, currency, place_of_supply, status, shipment_status, subtotal, discount_pct, discount_amount, tax, total, notes, terms, created_by, created_at FROM invoices WHERE id = ? AND org_id = ? AND deleted_at IS NULL`),
  updateInvoice: db.prepare(`UPDATE invoices SET customer_id=?, customer_name=?, customer_phone=?, customer_email=?, date=?, due_date=?, currency=?, place_of_supply=?, subtotal=?, discount_pct=?, discount_amount=?, tax=?, total=?, notes=?, terms=?, updated_at=CURRENT_TIMESTAMP WHERE id=? AND org_id=?`),
  updateInvoiceStatus: db.prepare(`UPDATE invoices SET status=?, updated_at=CURRENT_TIMESTAMP WHERE id=? AND org_id=?`),
  updateShipmentStatus: db.prepare(`UPDATE invoices SET shipment_status=?, shipment_confirmed_at=?, updated_at=CURRENT_TIMESTAMP WHERE id=? AND org_id=?`),
  deleteInvoice: db.prepare(`UPDATE invoices SET deleted_at=CURRENT_TIMESTAMP WHERE id=? AND org_id=?`),
  bumpInvNumber: db.prepare(`UPDATE organizations SET next_inv_no = next_inv_no + 1 WHERE id = ?`),

  // Invoice items
  insertInvoiceItem: db.prepare(`INSERT INTO invoice_items (id, org_id, invoice_id, description, hsn_code, product_id, sku, vendor_id, vendor_name, quantity, unit_price, tax_rate, tax_amount, amount, sort_order, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`),
  getInvoiceItems: db.prepare(`SELECT id, org_id, invoice_id, description, hsn_code, product_id, sku, vendor_id, vendor_name, quantity, unit_price, tax_rate, tax_amount, amount, sort_order, vendor_approved, vendor_approved_at FROM invoice_items WHERE invoice_id = ? AND deleted_at IS NULL ORDER BY sort_order`),
  deleteInvoiceItems: db.prepare(`UPDATE invoice_items SET deleted_at=CURRENT_TIMESTAMP WHERE invoice_id = ?`),
  updateItemVendorApproval: db.prepare(`UPDATE invoice_items SET vendor_approved=?, vendor_approved_at=?, updated_at=CURRENT_TIMESTAMP WHERE id=? AND invoice_id=?`),

  // Payments
  insertPayment: db.prepare(`INSERT INTO payments (id, org_id, invoice_id, amount, date, currency, method, reference, notes, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`),
  getPayments: db.prepare(`SELECT p.id, p.org_id, p.invoice_id, p.amount, p.date, p.currency, p.method, p.reference, p.notes, p.created_at, i.number as invoice_number, i.customer_name FROM payments p LEFT JOIN invoices i ON p.invoice_id = i.id WHERE p.org_id = ? AND p.deleted_at IS NULL ORDER BY p.date DESC`),
  getPaymentsByInvoice: db.prepare(`SELECT id, org_id, invoice_id, amount, date, currency, method, reference, notes, created_at FROM payments WHERE invoice_id = ? AND deleted_at IS NULL`),
  deletePayment: db.prepare(`UPDATE payments SET deleted_at=CURRENT_TIMESTAMP WHERE id=? AND org_id=?`),

  // Warranty Claims
  insertWarrantyClaim: db.prepare(`INSERT INTO warranty_claims (id, org_id, customer_id, invoice_id, invoice_number, product_name, model_number, issue_description, proof_url, storage_key, status, notes, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)`),
  getWarrantyClaims: db.prepare(`SELECT w.id, w.org_id, w.customer_id, c.name AS customer_name, c.email AS customer_email, c.phone AS customer_phone, w.invoice_id, w.invoice_number, w.product_name, w.model_number, w.issue_description, w.proof_url, w.storage_key, w.status, w.notes, w.created_at, w.updated_at FROM warranty_claims w LEFT JOIN customers c ON c.id = w.customer_id AND c.org_id = w.org_id WHERE w.org_id = ? AND w.deleted_at IS NULL ORDER BY w.created_at DESC`),
  getWarrantyClaimsByCustomer: db.prepare(`SELECT w.id, w.org_id, w.customer_id, c.name AS customer_name, c.email AS customer_email, c.phone AS customer_phone, w.invoice_id, w.invoice_number, w.product_name, w.model_number, w.issue_description, w.proof_url, w.storage_key, w.status, w.notes, w.created_at, w.updated_at FROM warranty_claims w LEFT JOIN customers c ON c.id = w.customer_id AND c.org_id = w.org_id WHERE w.org_id = ? AND w.customer_id = ? AND w.deleted_at IS NULL ORDER BY w.created_at DESC`),
  updateWarrantyClaimStatus: db.prepare(`UPDATE warranty_claims SET status=?, notes=?, updated_at=CURRENT_TIMESTAMP WHERE id=? AND org_id=?`),
  deleteWarrantyClaim: db.prepare(`UPDATE warranty_claims SET deleted_at=CURRENT_TIMESTAMP WHERE id=? AND org_id=?`),
};
