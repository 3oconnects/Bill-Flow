-- ============================================================
-- MIGRATION 003: Payment Allocation Engine & Financial Accuracy
-- Migration Date: 2026-06-03
-- ============================================================

BEGIN;

-- ========== PAYMENT ALLOCATION TABLES ==========

-- Payment allocation ledger (tracks which payment was applied to which invoice)
CREATE TABLE IF NOT EXISTS payment_allocations (
  id UUID PRIMARY KEY,
  payment_id UUID NOT NULL,
  invoice_id UUID NOT NULL,
  amount DECIMAL(14,2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_payment_alloc_payment FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE CASCADE,
  CONSTRAINT fk_payment_alloc_invoice FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
);

CREATE INDEX idx_payment_allocations_payment ON payment_allocations(payment_id);
CREATE INDEX idx_payment_allocations_invoice ON payment_allocations(invoice_id);

-- ========== INVOICE MODIFICATIONS ==========

-- Add payment tracking columns
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS paid_amount DECIMAL(14,2) DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS last_payment_date TIMESTAMP;

-- Add GST columns (split CGST/SGST/IGST)
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS cgst DECIMAL(14,2) DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS sgst DECIMAL(14,2) DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS igst DECIMAL(14,2) DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS total_tax DECIMAL(14,2) DEFAULT 0;

-- Add supplier/buyer state for GST determination
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS supplier_state VARCHAR(2);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS buyer_state VARCHAR(2);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS place_of_supply VARCHAR(2);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS gst_type VARCHAR(20) DEFAULT 'intra';  -- 'intra' or 'igst'
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS hsn_applicable BOOLEAN DEFAULT TRUE;

-- ========== PAYMENT MODIFICATIONS ==========

-- Add allocation tracking
ALTER TABLE payments ADD COLUMN IF NOT EXISTS allocated_amount DECIMAL(14,2) DEFAULT 0;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS unapplied_amount DECIMAL(14,2) DEFAULT 0;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'completed';  -- 'completed', 'failed', 'reversed', 'pending'

-- ========== INVOICE ITEM MODIFICATIONS ==========

-- Add HSN code (required for GST in India)
ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS hsn_code VARCHAR(10);

-- ========== CUSTOMER MODIFICATIONS ==========

-- Track last payment date for aging
ALTER TABLE customers ADD COLUMN IF NOT EXISTS last_payment_date TIMESTAMP;

-- ========== INVENTORY TRANSACTION TABLES ==========

CREATE TABLE IF NOT EXISTS inventory_transactions (
  id UUID PRIMARY KEY,
  org_id UUID NOT NULL,
  product_id UUID NOT NULL,
  transaction_type VARCHAR(50) NOT NULL,  -- 'sale', 'purchase', 'return', 'adjustment'
  reference_type VARCHAR(50),  -- 'invoice', 'receipt', 'goods_return', 'adjustment'
  reference_id UUID,
  quantity DECIMAL(14,2) NOT NULL,
  unit_cost DECIMAL(14,2),
  total_cost DECIMAL(14,2),
  note TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_inv_trans_org FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE,
  CONSTRAINT fk_inv_trans_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE INDEX idx_inventory_transactions_product ON inventory_transactions(product_id);
CREATE INDEX idx_inventory_transactions_org_date ON inventory_transactions(org_id, created_at DESC);
CREATE INDEX idx_inventory_transactions_type ON inventory_transactions(transaction_type);

-- Inventory ledger (for COGS tracking)
CREATE TABLE IF NOT EXISTS inventory_ledger (
  id UUID PRIMARY KEY,
  org_id UUID NOT NULL,
  product_id UUID NOT NULL,
  movement_type VARCHAR(20),  -- 'inbound', 'outbound'
  quantity DECIMAL(14,2),
  unit_cost DECIMAL(14,2),
  total_cost DECIMAL(14,2),
  source VARCHAR(50),  -- 'purchase_receipt', 'sales_invoice', 'return'
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_ledger_org FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE,
  CONSTRAINT fk_ledger_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- Stock alerts
CREATE TABLE IF NOT EXISTS inventory_alerts (
  id UUID PRIMARY KEY,
  org_id UUID NOT NULL,
  product_id UUID NOT NULL,
  alert_type VARCHAR(50),  -- 'low_stock', 'out_of_stock', 'overstock'
  current_stock DECIMAL(14,2),
  threshold DECIMAL(14,2),
  triggered_by UUID,
  status VARCHAR(20) DEFAULT 'active',  -- 'active', 'resolved', 'dismissed'
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP,

  CONSTRAINT fk_alert_org FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE,
  CONSTRAINT fk_alert_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- Goods return table
CREATE TABLE IF NOT EXISTS goods_returns (
  id UUID PRIMARY KEY,
  org_id UUID NOT NULL,
  invoice_id UUID NOT NULL,
  return_date DATE NOT NULL,
  status VARCHAR(50) DEFAULT 'completed',  -- 'pending', 'completed'
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_return_org FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE,
  CONSTRAINT fk_return_invoice FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
);

-- Purchase receipt tracking
CREATE TABLE IF NOT EXISTS purchase_receipts (
  id UUID PRIMARY KEY,
  org_id UUID NOT NULL,
  po_id UUID,
  receipt_date DATE NOT NULL,
  status VARCHAR(50) DEFAULT 'completed',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_receipt_org FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE
);

-- Inventory adjustments (for stock count variances)
CREATE TABLE IF NOT EXISTS inventory_adjustments (
  id UUID PRIMARY KEY,
  org_id UUID NOT NULL,
  adjustment_date DATE NOT NULL,
  reason VARCHAR(100),  -- 'damage', 'shrinkage', 'count_variance', 'recount'
  notes TEXT,
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_adj_org FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE
);

-- ========== GST TABLES ==========

CREATE TABLE IF NOT EXISTS gst_ledger (
  id UUID PRIMARY KEY,
  org_id UUID NOT NULL,
  invoice_id UUID,
  ap_invoice_id UUID,
  transaction_type VARCHAR(50),  -- 'sales', 'purchase'
  cgst_amount DECIMAL(14,2) DEFAULT 0,
  sgst_amount DECIMAL(14,2) DEFAULT 0,
  igst_amount DECIMAL(14,2) DEFAULT 0,
  month INTEGER,
  year INTEGER,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_gst_ledger_org FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE
);

CREATE INDEX idx_gst_ledger_period ON gst_ledger(org_id, year, month DESC);

-- Input tax credit tracking
CREATE TABLE IF NOT EXISTS itc_ledger (
  id UUID PRIMARY KEY,
  org_id UUID NOT NULL,
  ap_invoice_id UUID NOT NULL,
  available DECIMAL(14,2) DEFAULT 0,
  claimed DECIMAL(14,2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'available',  -- 'available', 'claimed', 'reversed'
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_itc_org FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE,
  CONSTRAINT fk_itc_ap_invoice FOREIGN KEY (ap_invoice_id) REFERENCES ap_invoices(id) ON DELETE CASCADE
);

-- ========== AUDIT LOGGING TABLE ==========

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY,
  org_id UUID,
  user_id UUID,
  action VARCHAR(255),  -- e.g., 'POST /api/invoices', 'DELETE /api/payments/:id'
  resource VARCHAR(100),  -- e.g., 'invoices', 'payments'
  resource_id UUID,
  status INTEGER,  -- HTTP status code
  ip_address VARCHAR(50),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_audit_org FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE SET NULL,
  CONSTRAINT fk_audit_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_audit_logs_org_date ON audit_logs(org_id, created_at DESC);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource);

-- ========== CONSTRAINTS ==========

ALTER TABLE invoices ADD CONSTRAINT chk_invoice_paid_amount
  CHECK (paid_amount >= 0 AND paid_amount <= total);

ALTER TABLE payments ADD CONSTRAINT chk_payment_allocation
  CHECK (allocated_amount + unapplied_amount = amount);

ALTER TABLE products ADD CONSTRAINT chk_stock_qty
  CHECK (stock_qty >= 0);

-- ========== POPULATE INITIAL DATA ==========

-- Set paid_amount for existing invoices with payments
UPDATE invoices i
SET paid_amount = COALESCE((
  SELECT SUM(amount)
  FROM payments
  WHERE invoice_id = i.id AND status IN ('completed', 'partially_applied')
), 0)
WHERE paid_amount = 0;

COMMIT;
