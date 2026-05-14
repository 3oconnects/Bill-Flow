// backend/db/statements/sales.js
const db = require('../conn');

module.exports = {
  // Customers
  insertCustomer: db.prepare(`
    INSERT INTO customers (
      id, org_id, name, email, phone, address, city, state, country, pincode, gstin, pan, currency, credit_limit, notes, created_by,
      customer_id_display, contact_person, alternate_phone, company_name, business_type, 
      shipping_address_line1, shipping_address_line2, shipping_city, shipping_state, shipping_country, shipping_pincode,
      payment_terms, opening_balance, tax_preference, tags, preferred_payment_method, customer_category, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `),
  getCustomers: db.prepare(`
    SELECT 
      id, org_id, name, email, phone, address, city, state, country, pincode, gstin, pan, currency, credit_limit, notes, outstanding, created_at,
      customer_id_display, contact_person, alternate_phone, company_name, business_type, 
      shipping_address_line1, shipping_address_line2, shipping_city, shipping_state, shipping_country, shipping_pincode,
      payment_terms, opening_balance, tax_preference, tags, preferred_payment_method, customer_category, status
    FROM customers 
    WHERE org_id = ? AND deleted_at IS NULL 
    ORDER BY name
  `),
  getCustomer: db.prepare(`
    SELECT 
      id, org_id, name, email, phone, address, city, state, country, pincode, gstin, pan, currency, credit_limit, notes, outstanding, created_at,
      customer_id_display, contact_person, alternate_phone, company_name, business_type, 
      shipping_address_line1, shipping_address_line2, shipping_city, shipping_state, shipping_country, shipping_pincode,
      payment_terms, opening_balance, tax_preference, tags, preferred_payment_method, customer_category, status
    FROM customers 
    WHERE id = ? AND org_id = ? AND deleted_at IS NULL
  `),
  getCustomerByDisplayId: db.prepare(`
    SELECT 
      id, org_id, name, email, phone, address, city, state, country, pincode, gstin, pan, currency, credit_limit, notes, outstanding, created_at,
      customer_id_display, contact_person, alternate_phone, company_name, business_type, 
      shipping_address_line1, shipping_address_line2, shipping_city, shipping_state, shipping_country, shipping_pincode,
      payment_terms, opening_balance, tax_preference, tags, preferred_payment_method, customer_category, status
    FROM customers 
    WHERE customer_id_display = ? AND org_id = ? AND deleted_at IS NULL
  `),
  updateCustomer: db.prepare(`
    UPDATE customers SET 
      name=?, email=?, phone=?, address=?, city=?, state=?, country=?, pincode=?, gstin=?, pan=?, currency=?, credit_limit=?, notes=?, 
      customer_id_display=?, contact_person=?, alternate_phone=?, company_name=?, business_type=?, 
      shipping_address_line1=?, shipping_address_line2=?, shipping_city=?, shipping_state=?, shipping_country=?, shipping_pincode=?,
      payment_terms=?, opening_balance=?, tax_preference=?, tags=?, preferred_payment_method=?, customer_category=?, status=?,
      updated_at=CURRENT_TIMESTAMP 
    WHERE id=? AND org_id=?
  `),
  deleteCustomer: db.prepare(`UPDATE customers SET deleted_at=CURRENT_TIMESTAMP WHERE id=? AND org_id=?`),
  updateCustomerOutstanding: db.prepare(`UPDATE customers SET outstanding=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`),

  // Invoices
  insertInvoice: db.prepare(`
    INSERT INTO invoices (
      id, org_id, number, customer_id, customer_name, customer_phone, customer_email, 
      date, due_date, currency, place_of_supply, status, subtotal, discount_pct, discount_amount, tax, total, 
      notes, terms, created_by, paid_amount, due_amount, sales_person, reference_number, payment_terms, tax_type, discount_type, attachment_url, customer_id_display
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `),
  getInvoices: db.prepare(`
    SELECT 
      id, org_id, number, customer_id, customer_name, customer_phone, customer_email, 
      date, due_date, currency, place_of_supply, status, shipment_status, subtotal, discount_pct, discount_amount, tax, total, 
      notes, terms, created_by, created_at, paid_amount, due_amount, sales_person, reference_number, payment_terms, tax_type, discount_type, attachment_url, customer_id_display
    FROM invoices 
    WHERE org_id = ? AND deleted_at IS NULL 
    ORDER BY date DESC
  `),
  getInvoice: db.prepare(`
    SELECT 
      id, org_id, number, customer_id, customer_name, customer_phone, customer_email, 
      date, due_date, currency, place_of_supply, status, shipment_status, subtotal, discount_pct, discount_amount, tax, total, 
      notes, terms, created_by, created_at, paid_amount, due_amount, sales_person, reference_number, payment_terms, tax_type, discount_type, attachment_url, customer_id_display
    FROM invoices 
    WHERE id = ? AND org_id = ? AND deleted_at IS NULL
  `),
  updateInvoice: db.prepare(`
    UPDATE invoices SET 
      customer_id=?, customer_name=?, customer_phone=?, customer_email=?, date=?, due_date=?, currency=?, place_of_supply=?, 
      subtotal=?, discount_pct=?, discount_amount=?, tax=?, total=?, notes=?, terms=?, 
      paid_amount=?, due_amount=?, sales_person=?, reference_number=?, payment_terms=?, tax_type=?, discount_type=?, attachment_url=?, customer_id_display=?,
      updated_at=CURRENT_TIMESTAMP 
    WHERE id=? AND org_id=?
  `),
  updateInvoiceStatus: db.prepare(`UPDATE invoices SET status=?, updated_at=CURRENT_TIMESTAMP WHERE id=? AND org_id=?`),
  updateShipmentStatus: db.prepare(`UPDATE invoices SET shipment_status=?, shipment_confirmed_at=?, updated_at=CURRENT_TIMESTAMP WHERE id=? AND org_id=?`),
  deleteInvoice: db.prepare(`UPDATE invoices SET deleted_at=CURRENT_TIMESTAMP WHERE id=? AND org_id=?`),
  bumpInvNumber: db.prepare(`UPDATE organizations SET next_inv_no = next_inv_no + 1 WHERE id = ?`),

  // Invoice items
  insertInvoiceItem: db.prepare(`
    INSERT INTO invoice_items (
      id, org_id, invoice_id, description, hsn_code, product_id, sku, vendor_id, vendor_name, 
      quantity, unit_price, tax_rate, tax_amount, amount, sort_order, created_by,
      discount_pct, discount_amount, cgst_rate, cgst_amount, sgst_rate, sgst_amount, igst_rate, igst_amount, unit, subtotal
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `),
  getInvoiceItems: db.prepare(`
    SELECT 
      id, org_id, invoice_id, description, hsn_code, product_id, sku, vendor_id, vendor_name, 
      quantity, unit_price, tax_rate, tax_amount, amount, sort_order, vendor_approved, vendor_approved_at,
      discount_pct, discount_amount, cgst_rate, cgst_amount, sgst_rate, sgst_amount, igst_rate, igst_amount, unit, subtotal
    FROM invoice_items 
    WHERE invoice_id = ? AND deleted_at IS NULL 
    ORDER BY sort_order
  `),
  deleteInvoiceItems: db.prepare(`UPDATE invoice_items SET deleted_at=CURRENT_TIMESTAMP WHERE invoice_id = ?`),
  updateItemVendorApproval: db.prepare(`UPDATE invoice_items SET vendor_approved=?, vendor_approved_at=?, updated_at=CURRENT_TIMESTAMP WHERE id=? AND invoice_id=?`),

  // Payments
  insertPayment: db.prepare(`INSERT INTO payments (id, org_id, invoice_id, amount, date, currency, method, reference, notes, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`),
  getPayments: db.prepare(`SELECT p.id, p.org_id, p.invoice_id, p.amount, p.date, p.currency, p.method, p.reference, p.notes, p.created_at, i.number as invoice_number, i.customer_name FROM payments p LEFT JOIN invoices i ON p.invoice_id = i.id WHERE p.org_id = ? AND p.deleted_at IS NULL ORDER BY p.date DESC`),
  getPaymentsByInvoice: db.prepare(`SELECT id, org_id, invoice_id, amount, date, currency, method, reference, notes, created_at FROM payments WHERE invoice_id = ? AND deleted_at IS NULL`),
  deletePayment: db.prepare(`UPDATE payments SET deleted_at=CURRENT_TIMESTAMP WHERE id=? AND org_id=?`),

  // Warranty Claims
  insertWarrantyClaim: db.prepare(`INSERT INTO warranty_claims (id, org_id, customer_id, invoice_id, invoice_number, product_name, model_number, issue_description, proof_url, storage_key, status, notes, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)`),
  getWarrantyClaims: db.prepare(`SELECT id, org_id, customer_id, invoice_id, invoice_number, product_name, model_number, issue_description, proof_url, storage_key, status, notes, created_at FROM warranty_claims WHERE org_id = ? AND deleted_at IS NULL ORDER BY created_at DESC`),
  getWarrantyClaimsByCustomer: db.prepare(`SELECT id, org_id, customer_id, invoice_id, invoice_number, product_name, model_number, issue_description, proof_url, storage_key, status, notes, created_at FROM warranty_claims WHERE org_id = ? AND customer_id = ? AND deleted_at IS NULL ORDER BY created_at DESC`),
  updateWarrantyClaimStatus: db.prepare(`UPDATE warranty_claims SET status=?, notes=?, updated_at=CURRENT_TIMESTAMP WHERE id=? AND org_id=?`),
  deleteWarrantyClaim: db.prepare(`UPDATE warranty_claims SET deleted_at=CURRENT_TIMESTAMP WHERE id=? AND org_id=?`),
};
