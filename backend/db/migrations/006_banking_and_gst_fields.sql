-- ============================================================
-- Migration 006: Banking Schema + GST Compliance Fields
-- ============================================================
BEGIN;

-- ── Bank Accounts ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bank_accounts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  account_name    VARCHAR(200) NOT NULL,
  account_number  VARCHAR(50),
  bank_name       VARCHAR(200),
  ifsc_code       VARCHAR(20),
  account_type    VARCHAR(30) NOT NULL DEFAULT 'current',
  currency        VARCHAR(10) NOT NULL DEFAULT 'INR',
  opening_balance DECIMAL(14,2) NOT NULL DEFAULT 0,
  current_balance DECIMAL(14,2) NOT NULL DEFAULT 0,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_at      TIMESTAMP,
  created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_bank_account_type CHECK (account_type IN ('current','savings','cc','od','cash'))
);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_org ON bank_accounts(org_id) WHERE is_active = TRUE;

-- ── Bank Transactions ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bank_transactions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id           UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  bank_account_id  UUID NOT NULL REFERENCES bank_accounts(id) ON DELETE CASCADE,
  transaction_date DATE NOT NULL,
  value_date       DATE,
  description      TEXT,
  debit            DECIMAL(14,2) NOT NULL DEFAULT 0 CHECK (debit >= 0),
  credit           DECIMAL(14,2) NOT NULL DEFAULT 0 CHECK (credit >= 0),
  balance          DECIMAL(14,2),
  reference        VARCHAR(200),
  transaction_type VARCHAR(50) DEFAULT 'manual',
  reconciled       BOOLEAN NOT NULL DEFAULT FALSE,
  matched_to_type  VARCHAR(50),
  matched_to_id    UUID,
  import_source    VARCHAR(50),
  updated_at       TIMESTAMP,
  created_at       TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_bank_tx_account_date ON bank_transactions(bank_account_id, transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_bank_tx_org_date     ON bank_transactions(org_id, transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_bank_tx_unreconciled ON bank_transactions(org_id) WHERE reconciled = FALSE;

-- ── Bank Reconciliations ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bank_reconciliations (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  bank_account_id   UUID NOT NULL REFERENCES bank_accounts(id) ON DELETE CASCADE,
  period_start      DATE NOT NULL,
  period_end        DATE NOT NULL,
  statement_balance DECIMAL(14,2) NOT NULL,
  book_balance      DECIMAL(14,2) NOT NULL,
  difference        DECIMAL(14,2) GENERATED ALWAYS AS (statement_balance - book_balance) STORED,
  status            VARCHAR(20) NOT NULL DEFAULT 'open',
  closed_at         TIMESTAMP,
  created_by        UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at        TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_recon_status CHECK (status IN ('open','closed'))
);
CREATE INDEX IF NOT EXISTS idx_bank_recon_org ON bank_reconciliations(org_id, bank_account_id);

-- ── Razorpay Orders ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS razorpay_orders (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id             UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  invoice_id         UUID REFERENCES invoices(id) ON DELETE SET NULL,
  razorpay_order_id  VARCHAR(100) NOT NULL,
  razorpay_payment_id VARCHAR(100),
  amount             DECIMAL(14,2) NOT NULL,
  status             VARCHAR(30) NOT NULL DEFAULT 'created',
  created_at         TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMP,
  CONSTRAINT uq_rzp_order UNIQUE (razorpay_order_id),
  CONSTRAINT chk_rzp_status CHECK (status IN ('created','paid','failed','refunded'))
);
CREATE INDEX IF NOT EXISTS idx_rzp_orders_org ON razorpay_orders(org_id, status);

-- ── GST Compliance Fields ─────────────────────────────────────────────────────
-- Add missing GST columns to invoices
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS supplier_state  VARCHAR(2);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS buyer_state     VARCHAR(2);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS is_export       BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS lut_number      VARCHAR(50);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS is_rcm          BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS cgst            DECIMAL(14,2) NOT NULL DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS sgst            DECIMAL(14,2) NOT NULL DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS igst            DECIMAL(14,2) NOT NULL DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS total_tax       DECIMAL(14,2) NOT NULL DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS gst_type        VARCHAR(20)   NOT NULL DEFAULT 'intra';
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS hsn_applicable  BOOLEAN       NOT NULL DEFAULT TRUE;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS paid_amount     DECIMAL(14,2) NOT NULL DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS last_payment_date TIMESTAMP;

-- Add GST fields to invoice_items
ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS hsn_code    VARCHAR(10);
ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS sac_code    VARCHAR(10);
ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS is_exempt   BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS supply_type VARCHAR(20) NOT NULL DEFAULT 'taxable';

-- Add allocation columns to payments
ALTER TABLE payments ADD COLUMN IF NOT EXISTS allocated_amount DECIMAL(14,2) NOT NULL DEFAULT 0;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS unapplied_amount DECIMAL(14,2) NOT NULL DEFAULT 0;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS status          VARCHAR(50)   NOT NULL DEFAULT 'completed';
ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_date    DATE;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS currency        VARCHAR(10)   DEFAULT 'INR';
ALTER TABLE payments ADD COLUMN IF NOT EXISTS reference       VARCHAR(200);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS customer_id     UUID REFERENCES customers(id) ON DELETE SET NULL;

-- Backfill payment_date from existing date column
UPDATE payments SET payment_date = date::DATE WHERE payment_date IS NULL AND date IS NOT NULL;

-- Add customer last_payment_date
ALTER TABLE customers ADD COLUMN IF NOT EXISTS last_payment_date TIMESTAMP;

-- GST Ledger (ensure it exists)
CREATE TABLE IF NOT EXISTS gst_ledger (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id           UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  invoice_id       UUID REFERENCES invoices(id) ON DELETE CASCADE,
  ap_invoice_id    UUID,
  transaction_type VARCHAR(20) NOT NULL DEFAULT 'sales',
  cgst_amount      DECIMAL(14,2) NOT NULL DEFAULT 0,
  sgst_amount      DECIMAL(14,2) NOT NULL DEFAULT 0,
  igst_amount      DECIMAL(14,2) NOT NULL DEFAULT 0,
  month            INT NOT NULL,
  year             INT NOT NULL,
  created_at       TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_gst_tx_type CHECK (transaction_type IN ('sales','purchase','credit_note','adjustment'))
);
CREATE INDEX IF NOT EXISTS idx_gst_ledger_org_period ON gst_ledger(org_id, year, month);
CREATE INDEX IF NOT EXISTS idx_gst_ledger_invoice    ON gst_ledger(invoice_id) WHERE invoice_id IS NOT NULL;

-- ITC Ledger (ensure it exists)
CREATE TABLE IF NOT EXISTS itc_ledger (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  ap_invoice_id UUID,
  available     DECIMAL(14,2) NOT NULL DEFAULT 0,
  claimed       DECIMAL(14,2) NOT NULL DEFAULT 0,
  status        VARCHAR(20) NOT NULL DEFAULT 'available',
  created_at    TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_itc_status CHECK (status IN ('available','claimed','expired','reversed'))
);
CREATE INDEX IF NOT EXISTS idx_itc_ledger_org ON itc_ledger(org_id) WHERE status = 'available';

-- Payment allocations (ensure it exists)
CREATE TABLE IF NOT EXISTS payment_allocations (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  amount     DECIMAL(14,2) NOT NULL CHECK (amount > 0),
  notes      TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_payment_alloc_payment ON payment_allocations(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_alloc_invoice ON payment_allocations(invoice_id);

-- Inventory transactions (ensure it exists)
CREATE TABLE IF NOT EXISTS inventory_transactions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id           UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  product_id       UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  transaction_type VARCHAR(50) NOT NULL,
  reference_type   VARCHAR(50),
  reference_id     UUID,
  quantity         DECIMAL(14,3) NOT NULL,
  unit_cost        DECIMAL(14,2),
  total_cost       DECIMAL(14,2),
  note             TEXT,
  created_at       TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_inv_tx_org_product ON inventory_transactions(org_id, product_id);
CREATE INDEX IF NOT EXISTS idx_inv_tx_reference   ON inventory_transactions(reference_type, reference_id);

-- Inventory alerts (ensure it exists)
CREATE TABLE IF NOT EXISTS inventory_alerts (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  product_id   UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  alert_type   VARCHAR(50) NOT NULL DEFAULT 'low_stock',
  current_stock DECIMAL(14,3),
  threshold    DECIMAL(14,3),
  triggered_by UUID,
  status       VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at   TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_alert_status CHECK (status IN ('active','acknowledged','resolved'))
);
CREATE INDEX IF NOT EXISTS idx_inv_alerts_org ON inventory_alerts(org_id) WHERE status = 'active';

-- Audit logs (ensure it exists)
CREATE TABLE IF NOT EXISTS audit_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID,
  user_id     UUID,
  action      VARCHAR(20) NOT NULL,
  resource    VARCHAR(100),
  resource_id VARCHAR(100),
  entity_type VARCHAR(100),
  entity_id   VARCHAR(100),
  old_values  JSONB,
  new_values  JSONB,
  ip_address  VARCHAR(50),
  user_agent  VARCHAR(500),
  status      INT,
  timestamp   TIMESTAMP NOT NULL DEFAULT NOW(),
  created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_org_date ON audit_logs(org_id, created_at DESC);

COMMIT;
