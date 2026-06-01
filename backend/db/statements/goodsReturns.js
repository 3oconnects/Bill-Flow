// backend/db/statements/goodsReturns.js
const db = require('../conn');

// ── Helpers ────────────────────────────────────────────────────────────
const q = (sql) => ({ all: (...p) => db.query(sql, p).then(r => r.rows), get: (...p) => db.query(sql, p).then(r => r.rows[0] || null), run: (...p) => db.query(sql, p).then(r => r) });

// ── Goods Returns ──────────────────────────────────────────────────────
const listGoodsReturns = q(`
  SELECT gr.*, v.name AS vendor_display_name,
    (SELECT COUNT(*) FROM goods_return_items WHERE return_id = gr.id) AS item_count
  FROM goods_returns gr
  LEFT JOIN vendors v ON v.id = gr.vendor_id AND v.org_id = gr.org_id
  WHERE gr.org_id = $1 AND gr.deleted_at IS NULL
  ORDER BY gr.created_at DESC
`);

const getGoodsReturn = q(`
  SELECT gr.*, v.name AS vendor_display_name, v.phone AS vendor_phone, v.email AS vendor_email,
    v.address AS vendor_address, v.gstin AS vendor_gstin_actual,
    u.name AS created_by_name, a.name AS approved_by_name
  FROM goods_returns gr
  LEFT JOIN vendors v ON v.id = gr.vendor_id AND v.org_id = gr.org_id
  LEFT JOIN users u ON u.id = gr.created_by
  LEFT JOIN users a ON a.id = gr.approved_by
  WHERE gr.id = $1 AND gr.org_id = $2 AND gr.deleted_at IS NULL
`);

const getGoodsReturnItems = q(`
  SELECT gri.*, p.name AS product_display_name, p.sku AS product_sku
  FROM goods_return_items gri
  LEFT JOIN products p ON p.id = gri.product_id AND p.org_id = $2
  WHERE gri.return_id = $1
  ORDER BY gri.sort_order, gri.created_at
`);

const getGoodsReturnLogs = q(`
  SELECT grl.*, u.name AS actor_name
  FROM goods_return_logs grl
  LEFT JOIN users u ON u.id = grl.created_by
  WHERE grl.return_id = $1 AND grl.org_id = $2
  ORDER BY grl.created_at ASC
`);

const insertGoodsReturn = q(`
  INSERT INTO goods_returns
    (id, org_id, return_no, vendor_id, vendor_name, vendor_gstin, base_receipt_no,
     return_date, warehouse, status, transport_carrier, transport_doc_no,
     transport_remarks, subtotal, tax_amount, total_amount, remarks, created_by)
  VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
`);

const insertGoodsReturnItem = q(`
  INSERT INTO goods_return_items
    (id, org_id, return_id, product_id, item_code, item_name, batch_no,
     qty_returned, unit_price, tax_rate, tax_amount, return_amount, reason, sort_order)
  VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
`);

const insertGoodsReturnLog = q(`
  INSERT INTO goods_return_logs (id, org_id, return_id, action, old_status, new_status, note, created_by)
  VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
`);

const updateGoodsReturn = q(`
  UPDATE goods_returns SET
    vendor_id=$3, vendor_name=$4, vendor_gstin=$5, base_receipt_no=$6,
    return_date=$7, warehouse=$8, transport_carrier=$9, transport_doc_no=$10,
    transport_remarks=$11, subtotal=$12, tax_amount=$13, total_amount=$14, remarks=$15
  WHERE id=$1 AND org_id=$2 AND deleted_at IS NULL
`);

const updateGoodsReturnStatus = q(`
  UPDATE goods_returns SET status=$3,
    approved_by = CASE WHEN $3 = 'approved' THEN $4 ELSE approved_by END,
    approved_at = CASE WHEN $3 = 'approved' THEN NOW() ELSE approved_at END,
    returned_at = CASE WHEN $3 = 'returned' THEN NOW() ELSE returned_at END,
    closed_at   = CASE WHEN $3 = 'closed'   THEN NOW() ELSE closed_at END
  WHERE id=$1 AND org_id=$2 AND deleted_at IS NULL
`);

const updateGoodsReturnCreditNote = q(`
  UPDATE goods_returns SET credit_note_no=$3, credit_note_date=$4, ap_adjusted=TRUE
  WHERE id=$1 AND org_id=$2 AND deleted_at IS NULL
`);

const markGoodsReturnStockAdjusted = q(`
  UPDATE goods_returns SET stock_adjusted=TRUE WHERE id=$1 AND org_id=$2
`);

const deleteGoodsReturnItems = q(`
  DELETE FROM goods_return_items WHERE return_id=$1
`);

const softDeleteGoodsReturn = q(`
  UPDATE goods_returns SET deleted_at=NOW(), status='cancelled'
  WHERE id=$1 AND org_id=$2 AND deleted_at IS NULL
`);

// ── Next Return Number ─────────────────────────────────────────────────
const getNextReturnNo = q(`
  SELECT COUNT(*) AS cnt FROM goods_returns
  WHERE org_id=$1 AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW())
`);

// ── Dashboard Stats ────────────────────────────────────────────────────
const getGoodsReturnStats = q(`
  SELECT
    COUNT(*) FILTER (WHERE deleted_at IS NULL)                                         AS total_returns,
    COUNT(*) FILTER (WHERE deleted_at IS NULL AND date_trunc('month', return_date) = date_trunc('month', NOW())) AS returns_this_month,
    COALESCE(SUM(total_amount) FILTER (WHERE deleted_at IS NULL), 0)                   AS total_value,
    COALESCE(SUM(total_amount) FILTER (WHERE deleted_at IS NULL AND date_trunc('month', return_date) = date_trunc('month', NOW())), 0) AS value_this_month,
    COUNT(*) FILTER (WHERE deleted_at IS NULL AND status='draft')                      AS draft_count,
    COUNT(*) FILTER (WHERE deleted_at IS NULL AND status='submitted')                  AS submitted_count,
    COUNT(*) FILTER (WHERE deleted_at IS NULL AND status='approved')                   AS approved_count,
    COUNT(*) FILTER (WHERE deleted_at IS NULL AND status='returned')                   AS returned_count,
    COUNT(*) FILTER (WHERE deleted_at IS NULL AND status='closed')                     AS closed_count
  FROM goods_returns WHERE org_id=$1
`);

const getTopSupplierReturns = q(`
  SELECT vendor_name, vendor_id,
    COUNT(*) AS return_count,
    COALESCE(SUM(total_amount), 0) AS total_value
  FROM goods_returns
  WHERE org_id=$1 AND deleted_at IS NULL
  GROUP BY vendor_name, vendor_id
  ORDER BY return_count DESC
  LIMIT 5
`);

module.exports = {
  listGoodsReturns,
  getGoodsReturn,
  getGoodsReturnItems,
  getGoodsReturnLogs,
  insertGoodsReturn,
  insertGoodsReturnItem,
  insertGoodsReturnLog,
  updateGoodsReturn,
  updateGoodsReturnStatus,
  updateGoodsReturnCreditNote,
  markGoodsReturnStockAdjusted,
  deleteGoodsReturnItems,
  softDeleteGoodsReturn,
  getNextReturnNo,
  getGoodsReturnStats,
  getTopSupplierReturns,
};
