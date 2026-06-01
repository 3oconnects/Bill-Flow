// backend/db/statements/ap.js
const db = require('../conn');
const q = (sql) => ({
  all: (...p) => db.query(sql, p).then(r => r.rows),
  get: (...p) => db.query(sql, p).then(r => r.rows[0] || null),
  run: (...p) => db.query(sql, p),
});

// ── Shared: Activity Log ───────────────────────────────────────────────
const insertAPLog = q(`
  INSERT INTO ap_activity_logs (id, org_id, doc_type, doc_id, action, old_status, new_status, note, created_by)
  VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
`);

const getAPLogs = q(`
  SELECT l.*, u.name AS actor_name
  FROM ap_activity_logs l
  LEFT JOIN users u ON u.id = l.created_by
  WHERE l.doc_type=$1 AND l.doc_id=$2
  ORDER BY l.created_at ASC
`);

// ══════════════════════════════════════════════════════════════
// A/P DOWN PAYMENTS
// ══════════════════════════════════════════════════════════════
const listAPDownPayments = q(`
  SELECT d.*, v.name AS vendor_display_name,
    u.name AS created_by_name
  FROM ap_down_payments d
  LEFT JOIN vendors v ON v.id = d.vendor_id AND v.org_id = d.org_id
  LEFT JOIN users u ON u.id = d.created_by
  WHERE d.org_id=$1 AND d.deleted_at IS NULL
  ORDER BY d.created_at DESC
`);

const getAPDownPayment = q(`
  SELECT d.*, v.name AS vendor_display_name, v.phone AS vendor_phone,
    v.email AS vendor_email, v.address AS vendor_address,
    u.name AS created_by_name, a.name AS approved_by_name
  FROM ap_down_payments d
  LEFT JOIN vendors v ON v.id = d.vendor_id AND v.org_id = d.org_id
  LEFT JOIN users u ON u.id = d.created_by
  LEFT JOIN users a ON a.id = d.approved_by
  WHERE d.id=$1 AND d.org_id=$2 AND d.deleted_at IS NULL
`);

const insertAPDownPayment = q(`
  INSERT INTO ap_down_payments
    (id, org_id, doc_no, vendor_id, vendor_name, vendor_gstin, po_ref,
     payment_date, due_date, currency, payment_terms, amount, pct_amount,
     tax_rate, tax_amount, total_amount, notes, created_by)
  VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
`);

const updateAPDownPayment = q(`
  UPDATE ap_down_payments SET
    vendor_id=$3, vendor_name=$4, vendor_gstin=$5, po_ref=$6,
    payment_date=$7, due_date=$8, currency=$9, payment_terms=$10,
    amount=$11, pct_amount=$12, tax_rate=$13, tax_amount=$14, total_amount=$15, notes=$16
  WHERE id=$1 AND org_id=$2 AND deleted_at IS NULL
`);

const updateAPDownPaymentStatus = q(`
  UPDATE ap_down_payments SET status=$3,
    approved_by = CASE WHEN $3='approved' THEN $4 ELSE approved_by END,
    approved_at = CASE WHEN $3='approved' THEN NOW() ELSE approved_at END,
    paid_at     = CASE WHEN $3='paid'     THEN NOW() ELSE paid_at END,
    paid_amount = CASE WHEN $3='paid'     THEN total_amount ELSE paid_amount END
  WHERE id=$1 AND org_id=$2 AND deleted_at IS NULL
`);

const softDeleteAPDownPayment = q(`
  UPDATE ap_down_payments SET deleted_at=NOW(), status='cancelled'
  WHERE id=$1 AND org_id=$2 AND deleted_at IS NULL
`);

const getAPDownPaymentStats = q(`
  SELECT
    COUNT(*) FILTER (WHERE deleted_at IS NULL) AS total,
    COUNT(*) FILTER (WHERE deleted_at IS NULL AND status='draft') AS draft,
    COUNT(*) FILTER (WHERE deleted_at IS NULL AND status='approved') AS approved,
    COUNT(*) FILTER (WHERE deleted_at IS NULL AND status='paid') AS paid,
    COALESCE(SUM(total_amount) FILTER (WHERE deleted_at IS NULL AND status='paid'),0) AS total_paid,
    COALESCE(SUM(total_amount) FILTER (WHERE deleted_at IS NULL AND status IN ('draft','approved')),0) AS outstanding
  FROM ap_down_payments WHERE org_id=$1
`);

// ══════════════════════════════════════════════════════════════
// A/P INVOICES
// ══════════════════════════════════════════════════════════════
const listAPInvoices = q(`
  SELECT i.*, v.name AS vendor_display_name, u.name AS created_by_name,
    (i.total_amount - i.paid_amount) AS balance_due
  FROM ap_invoices i
  LEFT JOIN vendors v ON v.id = i.vendor_id AND v.org_id = i.org_id
  LEFT JOIN users u ON u.id = i.created_by
  WHERE i.org_id=$1 AND i.deleted_at IS NULL
  ORDER BY i.created_at DESC
`);

const getAPInvoice = q(`
  SELECT i.*, v.name AS vendor_display_name, v.phone AS vendor_phone,
    v.email AS vendor_email, v.address AS vendor_address,
    u.name AS created_by_name, a.name AS approved_by_name,
    (i.total_amount - i.paid_amount) AS balance_due
  FROM ap_invoices i
  LEFT JOIN vendors v ON v.id = i.vendor_id AND v.org_id = i.org_id
  LEFT JOIN users u ON u.id = i.created_by
  LEFT JOIN users a ON a.id = i.approved_by
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
  INSERT INTO ap_invoices
    (id, org_id, doc_no, vendor_id, vendor_name, vendor_gstin, vendor_inv_no,
     po_ref, gr_ref, invoice_date, posting_date, due_date, currency, payment_terms,
     subtotal, discount_pct, discount_amount, tax_amount, total_amount, notes, created_by)
  VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)
`);

const insertAPInvoiceItem = q(`
  INSERT INTO ap_invoice_items
    (id, org_id, invoice_id, product_id, item_code, item_name, description,
     quantity, unit_price, discount, tax_rate, tax_amount, line_total, sort_order)
  VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
`);

const updateAPInvoice = q(`
  UPDATE ap_invoices SET
    vendor_id=$3, vendor_name=$4, vendor_gstin=$5, vendor_inv_no=$6,
    po_ref=$7, gr_ref=$8, invoice_date=$9, posting_date=$10, due_date=$11,
    currency=$12, payment_terms=$13, subtotal=$14, discount_pct=$15,
    discount_amount=$16, tax_amount=$17, total_amount=$18, notes=$19
  WHERE id=$1 AND org_id=$2 AND deleted_at IS NULL
`);

const deleteAPInvoiceItems = q(`DELETE FROM ap_invoice_items WHERE invoice_id=$1`);

const updateAPInvoiceStatus = q(`
  UPDATE ap_invoices SET status=$3,
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

// ══════════════════════════════════════════════════════════════
// A/P CREDIT MEMOS
// ══════════════════════════════════════════════════════════════
const listAPCreditMemos = q(`
  SELECT c.*, v.name AS vendor_display_name, u.name AS created_by_name,
    (c.total_amount - c.applied_amount) AS balance_amount
  FROM ap_credit_memos c
  LEFT JOIN vendors v ON v.id = c.vendor_id AND v.org_id = c.org_id
  LEFT JOIN users u ON u.id = c.created_by
  WHERE c.org_id=$1 AND c.deleted_at IS NULL
  ORDER BY c.created_at DESC
`);

const getAPCreditMemo = q(`
  SELECT c.*, v.name AS vendor_display_name, v.phone AS vendor_phone,
    v.email AS vendor_email, u.name AS created_by_name, a.name AS approved_by_name,
    (c.total_amount - c.applied_amount) AS balance_amount
  FROM ap_credit_memos c
  LEFT JOIN vendors v ON v.id = c.vendor_id AND v.org_id = c.org_id
  LEFT JOIN users u ON u.id = c.created_by
  LEFT JOIN users a ON a.id = c.approved_by
  WHERE c.id=$1 AND c.org_id=$2 AND c.deleted_at IS NULL
`);

const getAPCreditMemoItems = q(`
  SELECT i.*, p.name AS product_display_name
  FROM ap_credit_memo_items i
  LEFT JOIN products p ON p.id = i.product_id
  WHERE i.memo_id=$1
  ORDER BY i.sort_order, i.created_at
`);

const insertAPCreditMemo = q(`
  INSERT INTO ap_credit_memos
    (id, org_id, doc_no, vendor_id, vendor_name, vendor_gstin, ref_invoice_id, ref_invoice_no,
     credit_date, posting_date, currency, reason, subtotal, discount_amount, tax_amount, total_amount, notes, created_by)
  VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
`);

const insertAPCreditMemoItem = q(`
  INSERT INTO ap_credit_memo_items
    (id, org_id, memo_id, product_id, item_code, item_name, description,
     quantity, unit_price, discount, tax_rate, tax_amount, line_total, sort_order)
  VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
`);

const updateAPCreditMemo = q(`
  UPDATE ap_credit_memos SET
    vendor_id=$3, vendor_name=$4, vendor_gstin=$5, ref_invoice_id=$6, ref_invoice_no=$7,
    credit_date=$8, posting_date=$9, currency=$10, reason=$11,
    subtotal=$12, discount_amount=$13, tax_amount=$14, total_amount=$15, notes=$16
  WHERE id=$1 AND org_id=$2 AND deleted_at IS NULL
`);

const deleteAPCreditMemoItems = q(`DELETE FROM ap_credit_memo_items WHERE memo_id=$1`);

const updateAPCreditMemoStatus = q(`
  UPDATE ap_credit_memos SET status=$3,
    approved_by = CASE WHEN $3='approved' THEN $4 ELSE approved_by END,
    approved_at = CASE WHEN $3='approved' THEN NOW() ELSE approved_at END
  WHERE id=$1 AND org_id=$2 AND deleted_at IS NULL
`);

const applyAPCreditMemo = q(`
  UPDATE ap_credit_memos SET
    applied_amount = LEAST(total_amount, applied_amount + $3),
    status = CASE WHEN LEAST(total_amount, applied_amount + $3) >= total_amount THEN 'applied' ELSE status END
  WHERE id=$1 AND org_id=$2 AND deleted_at IS NULL
  RETURNING applied_amount, status
`);

const softDeleteAPCreditMemo = q(`
  UPDATE ap_credit_memos SET deleted_at=NOW(), status='cancelled'
  WHERE id=$1 AND org_id=$2 AND deleted_at IS NULL
`);

const getAPCreditMemoStats = q(`
  SELECT
    COUNT(*) FILTER (WHERE deleted_at IS NULL) AS total,
    COUNT(*) FILTER (WHERE deleted_at IS NULL AND status='pending_approval') AS pending,
    COUNT(*) FILTER (WHERE deleted_at IS NULL AND status='approved') AS approved,
    COUNT(*) FILTER (WHERE deleted_at IS NULL AND status='applied') AS applied,
    COALESCE(SUM(total_amount) FILTER (WHERE deleted_at IS NULL AND status IN ('approved','applied')),0) AS total_credits,
    COALESCE(SUM(total_amount - applied_amount) FILTER (WHERE deleted_at IS NULL AND status='approved'),0) AS available_balance
  FROM ap_credit_memos WHERE org_id=$1
`);

// ══════════════════════════════════════════════════════════════
// A/P RESERVE INVOICES
// ══════════════════════════════════════════════════════════════
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
  insertAPLog, getAPLogs,
  // Down Payments
  listAPDownPayments, getAPDownPayment, insertAPDownPayment,
  updateAPDownPayment, updateAPDownPaymentStatus, softDeleteAPDownPayment, getAPDownPaymentStats,
  // Invoices
  listAPInvoices, getAPInvoice, getAPInvoiceItems, insertAPInvoice, insertAPInvoiceItem,
  updateAPInvoice, deleteAPInvoiceItems, updateAPInvoiceStatus, recordAPInvoicePayment,
  softDeleteAPInvoice, getAPInvoiceStats,
  // Credit Memos
  listAPCreditMemos, getAPCreditMemo, getAPCreditMemoItems, insertAPCreditMemo,
  insertAPCreditMemoItem, updateAPCreditMemo, deleteAPCreditMemoItems,
  updateAPCreditMemoStatus, applyAPCreditMemo, softDeleteAPCreditMemo, getAPCreditMemoStats,
  // Reserve Invoices
  listAPReserveInvoices, getAPReserveInvoice, getAPReserveInvoiceItems, insertAPReserveInvoice,
  insertAPReserveInvoiceItem, updateAPReserveInvoice, deleteAPReserveInvoiceItems,
  updateAPReserveInvoiceStatus, softDeleteAPReserveInvoice, getAPReserveInvoiceStats,
};
