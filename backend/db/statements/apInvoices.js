const db = require('../conn');

// Query builder helper
const q = (sql) => ({
  all: (...p) => db.query(sql, p).then(r => r.rows),
  get: (...p) => db.query(sql, p).then(r => r.rows[0] || null),
  run: (...p) => db.query(sql, p),
});

// ============ SQL Fragment Builders ============

const SELECT_INVOICE_BASE = `
  SELECT i.*, v.name AS vendor_display_name, u.name AS created_by_name,
    (i.total_amount - i.paid_amount) AS balance_due
`;

const SELECT_INVOICE_DETAIL = `
  SELECT i.*, v.name AS vendor_display_name, v.phone AS vendor_phone,
    v.email AS vendor_email, v.address AS vendor_address,
    u.name AS created_by_name, a.name AS approved_by_name,
    (i.total_amount - i.paid_amount) AS balance_due
`;

const FROM_INVOICES_WITH_VENDORS = `
  FROM ap_invoices i
  LEFT JOIN vendors v ON v.id = i.vendor_id AND v.org_id = i.org_id
  LEFT JOIN users u ON u.id = i.created_by
`;

const FROM_INVOICES_FULL = `
  FROM ap_invoices i
  LEFT JOIN vendors v ON v.id = i.vendor_id AND v.org_id = i.org_id
  LEFT JOIN users u ON u.id = i.created_by
  LEFT JOIN users a ON a.id = i.approved_by
`;

const WHERE_ORG_NOT_DELETED = `WHERE i.org_id=$1 AND i.deleted_at IS NULL`;

// ============ Insert/Update Field Lists ============

const INVOICE_FIELDS = [
  'id', 'org_id', 'doc_no', 'vendor_id', 'vendor_name', 'vendor_gstin',
  'vendor_inv_no', 'po_ref', 'gr_ref', 'invoice_date', 'posting_date',
  'due_date', 'currency', 'payment_terms', 'subtotal', 'discount_pct',
  'discount_amount', 'tax_amount', 'total_amount', 'notes', 'created_by'
];

const INVOICE_UPDATE_FIELDS = [
  'vendor_id', 'vendor_name', 'vendor_gstin', 'vendor_inv_no', 'po_ref',
  'gr_ref', 'invoice_date', 'posting_date', 'due_date', 'currency',
  'payment_terms', 'subtotal', 'discount_pct', 'discount_amount',
  'tax_amount', 'total_amount', 'notes'
];

const INVOICE_ITEM_FIELDS = [
  'id', 'org_id', 'invoice_id', 'product_id', 'item_code', 'item_name',
  'description', 'quantity', 'unit_price', 'discount', 'tax_rate',
  'tax_amount', 'line_total', 'sort_order'
];

// ============ Helper: Build Placeholders ============

const buildPlaceholders = (startIndex = 1, count) =>
  Array.from({ length: count }, (_, i) => `$${startIndex + i}`).join(',');

const buildUpdateSet = (fields, startIndex = 3) =>
  fields.map((field, i) => `${field}=$${startIndex + i}`).join(', ');

// ============ Queries ============

const listAPInvoices = q(`
  ${SELECT_INVOICE_BASE}
  ${FROM_INVOICES_WITH_VENDORS}
  ${WHERE_ORG_NOT_DELETED}
  ORDER BY i.created_at DESC
`);

const getAPInvoice = q(`
  ${SELECT_INVOICE_DETAIL}
  ${FROM_INVOICES_FULL}
  WHERE i.id=$1 AND i.org_id=$2 AND i.deleted_at IS NULL
`);

const getAPInvoiceItems = q(`
  SELECT ii.*, p.name AS product_display_name, p.sku AS product_sku
  FROM ap_invoice_items ii
  LEFT JOIN products p ON p.id = ii.product_id
  WHERE ii.invoice_id=$1
  ORDER BY ii.sort_order, ii.created_at
`);

const insertAPInvoice = q(`
  INSERT INTO ap_invoices (${INVOICE_FIELDS.join(', ')})
  VALUES (${buildPlaceholders(1, INVOICE_FIELDS.length)})
`);

const insertAPInvoiceItem = q(`
  INSERT INTO ap_invoice_items (${INVOICE_ITEM_FIELDS.join(', ')})
  VALUES (${buildPlaceholders(1, INVOICE_ITEM_FIELDS.length)})
`);

const updateAPInvoice = q(`
  UPDATE ap_invoices SET
    ${buildUpdateSet(INVOICE_UPDATE_FIELDS)}
  WHERE id=$1 AND org_id=$2 AND deleted_at IS NULL
`);

const deleteAPInvoiceItems = q(`DELETE FROM ap_invoice_items WHERE invoice_id=$1`);

const updateAPInvoiceStatus = q(`
  UPDATE ap_invoices SET
    status=$3,
    approved_by = CASE WHEN $3='approved' THEN $4 ELSE approved_by END,
    approved_at = CASE WHEN $3='approved' THEN NOW() ELSE approved_at END
  WHERE id=$1 AND org_id=$2 AND deleted_at IS NULL
`);

const recordAPInvoicePayment = q(`
  UPDATE ap_invoices SET
    paid_amount = LEAST(total_amount, paid_amount + $3),
    status = CASE
      WHEN LEAST(total_amount, paid_amount + $3) >= total_amount THEN 'paid'
      WHEN paid_amount + $3 > 0 THEN 'partially_paid'
      ELSE status
    END
  WHERE id=$1 AND org_id=$2 AND deleted_at IS NULL
  RETURNING paid_amount, status
`);

const softDeleteAPInvoice = q(`
  UPDATE ap_invoices SET deleted_at=NOW(), status='cancelled'
  WHERE id=$1 AND org_id=$2 AND deleted_at IS NULL
`);

const getAPInvoiceStats = q(`
  SELECT
    COUNT(*) FILTER (WHERE deleted_at IS NULL) AS total,
    COUNT(*) FILTER (WHERE deleted_at IS NULL AND status='draft') AS draft,
    COUNT(*) FILTER (WHERE deleted_at IS NULL AND status IN ('submitted','approved')) AS pending,
    COUNT(*) FILTER (WHERE deleted_at IS NULL AND status IN ('partially_paid','paid')) AS paid_count,
    COALESCE(SUM(total_amount) FILTER (WHERE deleted_at IS NULL),0) AS total_value,
    COALESCE(SUM(total_amount - paid_amount) FILTER (WHERE deleted_at IS NULL AND status NOT IN ('paid','closed','cancelled')),0) AS outstanding
  FROM ap_invoices WHERE org_id=$1
`);

module.exports = {
  listAPInvoices,
  getAPInvoice,
  getAPInvoiceItems,
  insertAPInvoice,
  insertAPInvoiceItem,
  updateAPInvoice,
  deleteAPInvoiceItems,
  updateAPInvoiceStatus,
  recordAPInvoicePayment,
  softDeleteAPInvoice,
  getAPInvoiceStats,
};
