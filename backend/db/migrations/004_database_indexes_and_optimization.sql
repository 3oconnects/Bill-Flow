-- ============================================================
-- MIGRATION 004: Database Indexes & Performance Optimization
-- ============================================================

BEGIN;

-- ========== INVOICE INDEXES ==========
CREATE INDEX IF NOT EXISTS idx_invoices_org_customer ON invoices(org_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_org_status ON invoices(org_id, status);
CREATE INDEX IF NOT EXISTS idx_invoices_org_date ON invoices(org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_org_outstanding ON invoices(org_id) WHERE status IN ('sent', 'partially_paid', 'overdue');
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(org_id, due_date) WHERE status = 'sent';

-- ========== PAYMENT INDEXES ==========
CREATE INDEX IF NOT EXISTS idx_payments_org_customer ON payments(org_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_org_date ON payments(org_id, payment_date DESC);
CREATE INDEX IF NOT EXISTS idx_payments_invoice ON payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(org_id, status);

-- ========== CUSTOMER INDEXES ==========
CREATE INDEX IF NOT EXISTS idx_customers_org ON customers(org_id);
CREATE INDEX IF NOT EXISTS idx_customers_org_outstanding ON customers(org_id) WHERE outstanding > 0;
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email) WHERE deleted_at IS NULL;

-- ========== PRODUCT INDEXES ==========
CREATE INDEX IF NOT EXISTS idx_products_org_sku ON products(org_id, sku);
CREATE INDEX IF NOT EXISTS idx_products_org_active ON products(org_id, is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_products_low_stock ON products(org_id) WHERE stock_qty <= low_stock_alert;

-- ========== VENDOR & AP INDEXES ==========
CREATE INDEX IF NOT EXISTS idx_vendors_org ON vendors(org_id);
CREATE INDEX IF NOT EXISTS idx_ap_invoices_vendor ON ap_invoices(org_id, vendor_id);
CREATE INDEX IF NOT EXISTS idx_ap_invoices_due_date ON ap_invoices(org_id, due_date) WHERE status IN ('pending', 'partially_paid');

-- ========== GST & TAX INDEXES ==========
CREATE INDEX IF NOT EXISTS idx_gst_ledger_org_month ON gst_ledger(org_id, year, month);
CREATE INDEX IF NOT EXISTS idx_gst_ledger_invoice ON gst_ledger(invoice_id);
CREATE INDEX IF NOT EXISTS idx_itc_ledger_available ON itc_ledger(org_id) WHERE status = 'available';

-- ========== INVENTORY INDEXES ==========
CREATE INDEX IF NOT EXISTS idx_inventory_trans_product_date ON inventory_transactions(org_id, product_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_trans_type ON inventory_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_inventory_alerts_org ON inventory_alerts(org_id) WHERE status = 'active';

-- ========== AUDIT & SESSION INDEXES ==========
CREATE INDEX IF NOT EXISTS idx_audit_logs_org_date ON audit_logs(org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource, created_at DESC);

-- ========== PARTIAL INDEXES FOR PERFORMANCE ==========

-- Only index active customers
CREATE INDEX IF NOT EXISTS idx_customers_active_outstanding
  ON customers(org_id, outstanding DESC)
  WHERE deleted_at IS NULL AND outstanding > 0;

-- Only index unpaid invoices
CREATE INDEX IF NOT EXISTS idx_invoices_unpaid
  ON invoices(org_id, created_at DESC)
  WHERE status IN ('sent', 'partially_paid', 'overdue');

-- Only index pending AP invoices
CREATE INDEX IF NOT EXISTS idx_ap_invoices_pending
  ON ap_invoices(org_id, due_date ASC)
  WHERE status IN ('pending', 'partially_paid');

-- ========== MATERIALIZED VIEWS FOR REPORTING ==========

-- Daily revenue summary (for dashboard)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_daily_revenue AS
SELECT
  org_id,
  DATE(created_at) as revenue_date,
  COUNT(*) as invoice_count,
  SUM(total) as total_revenue,
  AVG(total) as avg_invoice,
  SUM(CASE WHEN status = 'paid' THEN total ELSE 0 END) as paid_revenue,
  SUM(CASE WHEN status IN ('sent', 'partially_paid', 'overdue') THEN total ELSE 0 END) as outstanding_revenue
FROM invoices
WHERE deleted_at IS NULL
GROUP BY org_id, DATE(created_at);

CREATE INDEX IF NOT EXISTS idx_mv_daily_revenue ON mv_daily_revenue(org_id, revenue_date DESC);

-- Customer aging summary (for AR aging report)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_customer_aging AS
SELECT
  c.org_id,
  c.id as customer_id,
  c.customer_name,
  SUM(CASE WHEN NOW() - i.due_date < INTERVAL '30 days' AND i.due_date <= NOW() THEN (i.total - COALESCE(i.paid_amount, 0)) ELSE 0 END) as current,
  SUM(CASE WHEN NOW() - i.due_date BETWEEN INTERVAL '30 days' AND INTERVAL '60 days' THEN (i.total - COALESCE(i.paid_amount, 0)) ELSE 0 END) as days_30_60,
  SUM(CASE WHEN NOW() - i.due_date BETWEEN INTERVAL '60 days' AND INTERVAL '90 days' THEN (i.total - COALESCE(i.paid_amount, 0)) ELSE 0 END) as days_60_90,
  SUM(CASE WHEN NOW() - i.due_date > INTERVAL '90 days' THEN (i.total - COALESCE(i.paid_amount, 0)) ELSE 0 END) as days_90_plus,
  SUM(i.total - COALESCE(i.paid_amount, 0)) as total_outstanding
FROM customers c
LEFT JOIN invoices i ON c.id = i.customer_id AND i.org_id = c.org_id AND i.status IN ('sent', 'partially_paid', 'overdue')
WHERE c.deleted_at IS NULL AND i.deleted_at IS NULL
GROUP BY c.org_id, c.id, c.customer_name;

CREATE INDEX IF NOT EXISTS idx_mv_customer_aging ON mv_customer_aging(org_id, total_outstanding DESC);

-- GST summary for returns (GSTR-1 & GSTR-3B)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_gst_summary AS
SELECT
  gl.org_id,
  gl.year,
  gl.month,
  gl.transaction_type,
  SUM(gl.cgst_amount) as cgst_total,
  SUM(gl.sgst_amount) as sgst_total,
  SUM(gl.igst_amount) as igst_total,
  SUM(gl.cgst_amount + gl.sgst_amount + gl.igst_amount) as total_tax,
  COUNT(*) as transaction_count
FROM gst_ledger gl
GROUP BY gl.org_id, gl.year, gl.month, gl.transaction_type;

CREATE INDEX IF NOT EXISTS idx_mv_gst_summary ON mv_gst_summary(org_id, year DESC, month DESC);

-- Inventory valuation (at cost)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_inventory_valuation AS
SELECT
  p.org_id,
  p.id as product_id,
  p.sku,
  p.product_name,
  p.stock_qty,
  p.purchase_price,
  (p.stock_qty * p.purchase_price) as total_cost,
  COUNT(DISTINCT CASE WHEN it.transaction_type = 'sale' THEN it.id END) as sale_count,
  COUNT(DISTINCT CASE WHEN it.transaction_type = 'purchase' THEN it.id END) as purchase_count
FROM products p
LEFT JOIN inventory_transactions it ON p.id = it.product_id
WHERE p.deleted_at IS NULL
GROUP BY p.org_id, p.id, p.sku, p.product_name, p.stock_qty, p.purchase_price;

CREATE INDEX IF NOT EXISTS idx_mv_inventory_valuation ON mv_inventory_valuation(org_id, total_cost DESC);

-- ========== REFRESH STRATEGY ==========

-- Create function to refresh materialized views
CREATE OR REPLACE FUNCTION refresh_materialized_views()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_daily_revenue;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_customer_aging;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_gst_summary;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_inventory_valuation;
END;
$$ LANGUAGE plpgsql;

-- Refresh views every hour (via cron job)
-- SELECT cron.schedule('refresh_views_hourly', '0 * * * *', 'SELECT refresh_materialized_views()');

-- ========== STATISTICS & ANALYZE ==========

-- Update table statistics for query planner
ANALYZE invoices;
ANALYZE payments;
ANALYZE customers;
ANALYZE products;
ANALYZE vendors;
ANALYZE ap_invoices;
ANALYZE gst_ledger;
ANALYZE inventory_transactions;

-- ========== PERFORMANCE SETTINGS ==========

-- Increase work memory for complex queries (requires PostgreSQL restart or SET SESSION)
SET work_mem = '256MB';

-- Enable parallel query execution for large tables
ALTER TABLE invoices SET (parallel_workers = 4);
ALTER TABLE payments SET (parallel_workers = 2);
ALTER TABLE inventory_transactions SET (parallel_workers = 2);

COMMIT;
