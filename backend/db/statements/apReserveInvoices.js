const db = require('../conn');
const q = (sql) => ({
  all: (...p) => db.query(sql, p).then(r => r.rows),
  get: (...p) => db.query(sql, p).then(r => r.rows[0] || null),
  run: (...p) => db.query(sql, p),
});

const listAPReserveInvoices = q(`
  SELECT r.*, v.name AS vendor_display_name, u.name AS created_by_name
  FROM ap_reserve_invoices r
  LEFT JOIN vendors v ON v.id = r.vendor_id AND v.org_id = r.org_id
  LEFT JOIN users u ON u.id = r.created_by
  WHERE r.org_id=$1 AND r.deleted_at IS NULL
  ORDER BY r.created_at DESC
`);

const getAPReserveInvoice = q(`
  SELECT r.*, v.name AS vendor_display_name, v.phone AS vendor_phone,
    v.email AS vendor_email, u.name AS created_by_name, a.name AS approved_by_name
  FROM ap_reserve_invoices r
  LEFT JOIN vendors v ON v.id = r.vendor_id AND v.org_id = r.org_id
  LEFT JOIN users u ON u.id = r.created_by
  LEFT JOIN users a ON a.id = r.approved_by
  WHERE r.id=$1 AND r.org_id=$2 AND r.deleted_at IS NULL
`);

const getAPReserveInvoiceItems = q(`
  SELECT i.*, p.name AS product_display_name
  FROM ap_reserve_invoice_items i
  LEFT JOIN products p ON p.id = i.product_id
  WHERE i.reserve_id=$1
  ORDER BY i.sort_order, i.created_at
`);

const insertAPReserveInvoice = q(`
  INSERT INTO ap_reserve_invoices
    (id, org_id, doc_no, vendor_id, vendor_name, vendor_gstin, vendor_ref_no,
     po_ref, gr_ref, invoice_date, posting_date, due_date, currency,
     department, cost_center, project, payment_terms, description,
     subtotal, discount_amount, tax_amount, total_amount, notes, created_by)
  VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24)
`);

const insertAPReserveInvoiceItem = q(`
  INSERT INTO ap_reserve_invoice_items
    (id, org_id, reserve_id, product_id, item_code, item_name, description,
     quantity, unit_price, discount, tax_rate, tax_amount, total_amount, sort_order)
  VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
`);

const updateAPReserveInvoice = q(`
  UPDATE ap_reserve_invoices SET
    vendor_id=$3, vendor_name=$4, vendor_gstin=$5, vendor_ref_no=$6,
    po_ref=$7, gr_ref=$8, invoice_date=$9, posting_date=$10, due_date=$11,
    currency=$12, department=$13, cost_center=$14, project=$15, payment_terms=$16,
    description=$17, subtotal=$18, discount_amount=$19, tax_amount=$20, total_amount=$21, notes=$22
  WHERE id=$1 AND org_id=$2 AND deleted_at IS NULL
`);

const deleteAPReserveInvoiceItems = q(`DELETE FROM ap_reserve_invoice_items WHERE reserve_id=$1`);

const updateAPReserveInvoiceStatus = q(`
  UPDATE ap_reserve_invoices SET status=$3,
    approved_by = CASE WHEN $3='approved' THEN $4 ELSE approved_by END,
    approved_at = CASE WHEN $3='approved' THEN NOW() ELSE approved_at END,
    converted_to_id = CASE WHEN $3='converted' THEN $5 ELSE converted_to_id END
  WHERE id=$1 AND org_id=$2 AND deleted_at IS NULL
`);

const softDeleteAPReserveInvoice = q(`
  UPDATE ap_reserve_invoices SET deleted_at=NOW(), status='cancelled'
  WHERE id=$1 AND org_id=$2 AND deleted_at IS NULL
`);

const getAPReserveInvoiceStats = q(`
  SELECT
    COUNT(*) FILTER (WHERE deleted_at IS NULL) AS total,
    COUNT(*) FILTER (WHERE deleted_at IS NULL AND status IN ('submitted','approved','reserved')) AS outstanding,
    COUNT(*) FILTER (WHERE deleted_at IS NULL AND status IN ('submitted','approved')) AS pending_approval,
    COUNT(*) FILTER (WHERE deleted_at IS NULL AND status='converted') AS converted,
    COALESCE(SUM(total_amount) FILTER (WHERE deleted_at IS NULL AND status IN ('approved','reserved')),0) AS outstanding_liability,
    COUNT(*) FILTER (WHERE deleted_at IS NULL AND due_date <= NOW() + INTERVAL '7 days' AND status NOT IN ('converted','closed','cancelled')) AS due_this_week
  FROM ap_reserve_invoices WHERE org_id=$1
`);

module.exports = {
  listAPReserveInvoices, getAPReserveInvoice, getAPReserveInvoiceItems, insertAPReserveInvoice,
  insertAPReserveInvoiceItem, updateAPReserveInvoice, deleteAPReserveInvoiceItems,
  updateAPReserveInvoiceStatus, softDeleteAPReserveInvoice, getAPReserveInvoiceStats,
};
