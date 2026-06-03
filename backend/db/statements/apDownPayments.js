const db = require('../conn');
const q = (sql) => ({
  all: (...p) => db.query(sql, p).then(r => r.rows),
  get: (...p) => db.query(sql, p).then(r => r.rows[0] || null),
  run: (...p) => db.query(sql, p),
});

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

module.exports = {
  listAPDownPayments, getAPDownPayment, insertAPDownPayment,
  updateAPDownPayment, updateAPDownPaymentStatus, softDeleteAPDownPayment, getAPDownPaymentStats,
};
