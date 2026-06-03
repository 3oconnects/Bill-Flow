const db = require('../conn');
const q = (sql) => ({
  all: (...p) => db.query(sql, p).then(r => r.rows),
  get: (...p) => db.query(sql, p).then(r => r.rows[0] || null),
  run: (...p) => db.query(sql, p),
});

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

module.exports = {
  listAPCreditMemos, getAPCreditMemo, getAPCreditMemoItems, insertAPCreditMemo,
  insertAPCreditMemoItem, updateAPCreditMemo, deleteAPCreditMemoItems,
  updateAPCreditMemoStatus, applyAPCreditMemo, softDeleteAPCreditMemo, getAPCreditMemoStats,
};
