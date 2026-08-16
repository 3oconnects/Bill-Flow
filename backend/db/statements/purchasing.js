const db = require('../conn');

module.exports = {
  // ==========================================
  // PURCHASE QUOTATIONS
  // ==========================================
  insertPurchaseQuotation: db.prepare(`
    INSERT INTO purchase_quotations (
      id, org_id, number, vendor_id, vendor_name, vendor_email, vendor_phone,
      status, subtotal, discount_pct, discount_amount, tax, total, currency,
      valid_until, notes, terms, items, created_by
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?
    )
  `),
  updatePurchaseQuotation: db.prepare(`
    UPDATE purchase_quotations SET
      vendor_id = ?, vendor_name = ?, vendor_email = ?, vendor_phone = ?,
      status = ?, subtotal = ?, discount_pct = ?, discount_amount = ?,
      tax = ?, total = ?, currency = ?, valid_until = ?,
      notes = ?, terms = ?, items = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND org_id = ?
  `),
  getPurchaseQuotation: db.prepare(`
    SELECT * FROM purchase_quotations WHERE id = ? AND org_id = ?
  `),
  listPurchaseQuotations: db.prepare(`
    SELECT * FROM purchase_quotations WHERE org_id = ? ORDER BY created_at DESC
  `),
  deletePurchaseQuotation: db.prepare(`
    DELETE FROM purchase_quotations WHERE id = ? AND org_id = ?
  `),
  updatePurchaseQuotationStatus: db.prepare(`
    UPDATE purchase_quotations SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND org_id = ?
  `),

  // ==========================================
  // PURCHASE ORDERS
  // ==========================================
  insertPurchaseOrder: db.prepare(`
    INSERT INTO purchase_orders (
      id, org_id, po_number, vendor_id, vendor_name, quotation_ref,
      status, expected_delivery_date, subtotal, discount_pct, discount_amount,
      tax, total, currency, notes, terms, items, created_by
    ) VALUES (
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?, ?
    )
  `),
  updatePurchaseOrder: db.prepare(`
    UPDATE purchase_orders SET
      vendor_id = ?, vendor_name = ?, quotation_ref = ?, status = ?,
      expected_delivery_date = ?, subtotal = ?, discount_pct = ?,
      discount_amount = ?, tax = ?, total = ?, currency = ?,
      notes = ?, terms = ?, items = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND org_id = ?
  `),
  getPurchaseOrder: db.prepare(`
    SELECT * FROM purchase_orders WHERE id = ? AND org_id = ?
  `),
  listPurchaseOrders: db.prepare(`
    SELECT * FROM purchase_orders WHERE org_id = ? ORDER BY created_at DESC
  `),
  deletePurchaseOrder: db.prepare(`
    DELETE FROM purchase_orders WHERE id = ? AND org_id = ?
  `),
  updatePurchaseOrderStatus: db.prepare(`
    UPDATE purchase_orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND org_id = ?
  `),

  // ==========================================
  // BLANKET AGREEMENTS
  // ==========================================
  insertBlanketAgreement: db.prepare(`
    INSERT INTO blanket_agreements (
      id, org_id, agreement_number, vendor_id, vendor_name, status,
      start_date, end_date, total_value, terms, items, created_by
    ) VALUES (
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?
    )
  `),
  updateBlanketAgreement: db.prepare(`
    UPDATE blanket_agreements SET
      vendor_id = ?, vendor_name = ?, status = ?,
      start_date = ?, end_date = ?, total_value = ?,
      terms = ?, items = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND org_id = ?
  `),
  getBlanketAgreement: db.prepare(`
    SELECT * FROM blanket_agreements WHERE id = ? AND org_id = ?
  `),
  listBlanketAgreements: db.prepare(`
    SELECT * FROM blanket_agreements WHERE org_id = ? ORDER BY created_at DESC
  `),
  deleteBlanketAgreement: db.prepare(`
    DELETE FROM blanket_agreements WHERE id = ? AND org_id = ?
  `),
  updateBlanketAgreementStatus: db.prepare(`
    UPDATE blanket_agreements SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND org_id = ?
  `),

  // ==========================================
  // PURCHASE REQUESTS
  // ==========================================
  insertPurchaseRequest: db.prepare(`
    INSERT INTO purchase_requests (
      id, org_id, request_number, department, requested_by_name, status,
      required_date, items, notes, created_by
    ) VALUES (
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?
    )
  `),
  updatePurchaseRequest: db.prepare(`
    UPDATE purchase_requests SET
      department = ?, requested_by_name = ?, status = ?,
      required_date = ?, items = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND org_id = ?
  `),
  getPurchaseRequest: db.prepare(`
    SELECT * FROM purchase_requests WHERE id = ? AND org_id = ?
  `),
  listPurchaseRequests: db.prepare(`
    SELECT * FROM purchase_requests WHERE org_id = ? ORDER BY created_at DESC
  `),
  deletePurchaseRequest: db.prepare(`
    DELETE FROM purchase_requests WHERE id = ? AND org_id = ?
  `),
  updatePurchaseRequestStatus: db.prepare(`
    UPDATE purchase_requests SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND org_id = ?
  `),

  // Goods Receipt POs
  insertGoodsReceipt: db.prepare(`
    INSERT INTO goods_receipt_pos (
      id, org_id, receipt_number, vendor_id, vendor_name, base_po_no,
      posting_date, document_date, status, remarks, items, created_by
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
    )
  `),
  listGoodsReceipts: db.prepare(`
    SELECT * FROM goods_receipt_pos WHERE org_id = ? ORDER BY created_at DESC
  `)
};
