-- ============================================================
-- BILLFLOW FULL RELATIONAL SCHEMA MIGRATION
-- Migration: 001_full_relational_schema
-- Safe to run on existing data - uses ALTER TABLE ADD CONSTRAINT IF NOT EXISTS
-- ============================================================

BEGIN;

-- ============================================================
-- STEP 1: DATA TYPE FIXES & COLUMN RENAMES
-- ============================================================

-- Rename password → password_hash (safe, adds new col then migrates)
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;
UPDATE users SET password_hash = password WHERE password_hash IS NULL;
ALTER TABLE users ALTER COLUMN password_hash SET NOT NULL;

-- Convert REAL money fields → DECIMAL(12,2)
ALTER TABLE customers    ALTER COLUMN credit_limit   TYPE DECIMAL(12,2) USING credit_limit::DECIMAL(12,2);
ALTER TABLE customers    ALTER COLUMN outstanding     TYPE DECIMAL(12,2) USING outstanding::DECIMAL(12,2);
ALTER TABLE invoices     ALTER COLUMN subtotal        TYPE DECIMAL(12,2) USING subtotal::DECIMAL(12,2);
ALTER TABLE invoices     ALTER COLUMN discount_pct    TYPE DECIMAL(12,2) USING discount_pct::DECIMAL(12,2);
ALTER TABLE invoices     ALTER COLUMN discount_amount TYPE DECIMAL(12,2) USING discount_amount::DECIMAL(12,2);
ALTER TABLE invoices     ALTER COLUMN tax             TYPE DECIMAL(12,2) USING tax::DECIMAL(12,2);
ALTER TABLE invoices     ALTER COLUMN total           TYPE DECIMAL(12,2) USING total::DECIMAL(12,2);
ALTER TABLE invoice_items ALTER COLUMN unit_price     TYPE DECIMAL(12,2) USING unit_price::DECIMAL(12,2);
ALTER TABLE invoice_items ALTER COLUMN tax_rate       TYPE DECIMAL(12,2) USING tax_rate::DECIMAL(12,2);
ALTER TABLE invoice_items ALTER COLUMN tax_amount     TYPE DECIMAL(12,2) USING tax_amount::DECIMAL(12,2);
ALTER TABLE invoice_items ALTER COLUMN amount         TYPE DECIMAL(12,2) USING amount::DECIMAL(12,2);
ALTER TABLE payments      ALTER COLUMN amount         TYPE DECIMAL(12,2) USING amount::DECIMAL(12,2);
ALTER TABLE expenses      ALTER COLUMN amount         TYPE DECIMAL(12,2) USING amount::DECIMAL(12,2);
ALTER TABLE expenses      ALTER COLUMN gst_rate       TYPE DECIMAL(12,2) USING gst_rate::DECIMAL(12,2);
ALTER TABLE products      ALTER COLUMN unit_price     TYPE DECIMAL(12,2) USING unit_price::DECIMAL(12,2);
ALTER TABLE products      ALTER COLUMN purchase_price TYPE DECIMAL(12,2) USING purchase_price::DECIMAL(12,2);
ALTER TABLE products      ALTER COLUMN tax_rate       TYPE DECIMAL(12,2) USING tax_rate::DECIMAL(12,2);
ALTER TABLE products      ALTER COLUMN stock_qty      TYPE DECIMAL(12,2) USING stock_qty::DECIMAL(12,2);
ALTER TABLE products      ALTER COLUMN low_stock_alert TYPE DECIMAL(12,2) USING low_stock_alert::DECIMAL(12,2);
ALTER TABLE product_vendors ALTER COLUMN supply_price TYPE DECIMAL(12,2) USING supply_price::DECIMAL(12,2);

-- Convert date TEXT fields → DATE (safe cast)
ALTER TABLE invoices  ALTER COLUMN date     TYPE DATE USING date::DATE;
ALTER TABLE invoices  ALTER COLUMN due_date TYPE DATE USING due_date::DATE;
ALTER TABLE payments  ALTER COLUMN date     TYPE DATE USING date::DATE;
ALTER TABLE expenses  ALTER COLUMN date     TYPE DATE USING date::DATE;

-- Convert integer flags → BOOLEAN (safe handle defaults)
DO $$ 
BEGIN
  -- users.is_active
  ALTER TABLE users ALTER COLUMN is_active DROP DEFAULT;
  ALTER TABLE users ALTER COLUMN is_active TYPE BOOLEAN USING is_active::BOOLEAN;
  ALTER TABLE users ALTER COLUMN is_active SET DEFAULT TRUE;

  -- products.is_active
  ALTER TABLE products ALTER COLUMN is_active DROP DEFAULT;
  ALTER TABLE products ALTER COLUMN is_active TYPE BOOLEAN USING is_active::BOOLEAN;
  ALTER TABLE products ALTER COLUMN is_active SET DEFAULT TRUE;

  -- product_vendors.is_primary
  ALTER TABLE product_vendors ALTER COLUMN is_primary DROP DEFAULT;
  ALTER TABLE product_vendors ALTER COLUMN is_primary TYPE BOOLEAN USING is_primary::BOOLEAN;
  ALTER TABLE product_vendors ALTER COLUMN is_primary SET DEFAULT FALSE;

  -- invoice_items.vendor_approved
  ALTER TABLE invoice_items ALTER COLUMN vendor_approved DROP DEFAULT;
  ALTER TABLE invoice_items ALTER COLUMN vendor_approved TYPE BOOLEAN USING vendor_approved::BOOLEAN;
  ALTER TABLE invoice_items ALTER COLUMN vendor_approved SET DEFAULT FALSE;
END $$;

-- ============================================================
-- STEP 2: UNIQUE CONSTRAINTS
-- ============================================================

ALTER TABLE users
  DROP CONSTRAINT IF EXISTS users_email_unique,
  ADD  CONSTRAINT users_email_unique UNIQUE (email);

ALTER TABLE invoices
  DROP CONSTRAINT IF EXISTS invoices_org_number_unique,
  ADD  CONSTRAINT invoices_org_number_unique UNIQUE (org_id, number);

ALTER TABLE products
  DROP CONSTRAINT IF EXISTS products_org_sku_unique,
  ADD  CONSTRAINT products_org_sku_unique UNIQUE (org_id, sku);

ALTER TABLE vendors
  DROP CONSTRAINT IF EXISTS vendors_org_vendor_id_unique,
  ADD  CONSTRAINT vendors_org_vendor_id_unique UNIQUE (org_id, vendor_id);

ALTER TABLE product_vendors
  DROP CONSTRAINT IF EXISTS product_vendors_product_vendor_unique,
  ADD  CONSTRAINT product_vendors_product_vendor_unique UNIQUE (product_id, vendor_id);

-- ============================================================
-- STEP 3: STATUS CHECK CONSTRAINTS
-- ============================================================

ALTER TABLE invoices
  DROP CONSTRAINT IF EXISTS chk_invoice_status,
  ADD  CONSTRAINT chk_invoice_status CHECK (status IN ('draft','sent','paid','overdue','cancelled'));

ALTER TABLE invoices
  DROP CONSTRAINT IF EXISTS chk_shipment_status,
  ADD  CONSTRAINT chk_shipment_status CHECK (shipment_status IN ('not_shipped','processing','shipped','delivered'));

ALTER TABLE vendors
  DROP CONSTRAINT IF EXISTS chk_vendor_status,
  ADD  CONSTRAINT chk_vendor_status CHECK (status IN ('active','inactive','blocked'));

ALTER TABLE warranty_claims
  DROP CONSTRAINT IF EXISTS chk_warranty_status,
  ADD  CONSTRAINT chk_warranty_status CHECK (status IN ('pending','approved','rejected','resolved'));

-- ============================================================
-- STEP 4: FOREIGN KEYS — ORGANIZATION OWNERSHIP
-- ============================================================

ALTER TABLE users
  DROP CONSTRAINT IF EXISTS fk_users_org,
  ADD  CONSTRAINT fk_users_org FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE RESTRICT;

ALTER TABLE customers
  DROP CONSTRAINT IF EXISTS fk_customers_org,
  ADD  CONSTRAINT fk_customers_org FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE RESTRICT;

ALTER TABLE invoices
  DROP CONSTRAINT IF EXISTS fk_invoices_org,
  ADD  CONSTRAINT fk_invoices_org FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE RESTRICT;

ALTER TABLE payments
  DROP CONSTRAINT IF EXISTS fk_payments_org,
  ADD  CONSTRAINT fk_payments_org FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE RESTRICT;

ALTER TABLE expenses
  DROP CONSTRAINT IF EXISTS fk_expenses_org,
  ADD  CONSTRAINT fk_expenses_org FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE RESTRICT;

ALTER TABLE products
  DROP CONSTRAINT IF EXISTS fk_products_org,
  ADD  CONSTRAINT fk_products_org FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE RESTRICT;

ALTER TABLE vendors
  DROP CONSTRAINT IF EXISTS fk_vendors_org,
  ADD  CONSTRAINT fk_vendors_org FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE RESTRICT;

ALTER TABLE product_vendors
  DROP CONSTRAINT IF EXISTS fk_product_vendors_org,
  ADD  CONSTRAINT fk_product_vendors_org FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE RESTRICT;

ALTER TABLE vendor_documents
  DROP CONSTRAINT IF EXISTS fk_vendor_docs_org,
  ADD  CONSTRAINT fk_vendor_docs_org FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE RESTRICT;

ALTER TABLE warranty_claims
  DROP CONSTRAINT IF EXISTS fk_warranty_org,
  ADD  CONSTRAINT fk_warranty_org FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE RESTRICT;

ALTER TABLE sessions
  DROP CONSTRAINT IF EXISTS fk_sessions_org,
  ADD  CONSTRAINT fk_sessions_org FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;

-- ============================================================
-- STEP 5: FOREIGN KEYS — USER TRACEABILITY (created_by)
-- ============================================================

ALTER TABLE organizations
  DROP CONSTRAINT IF EXISTS fk_org_created_by,
  ADD  CONSTRAINT fk_org_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE customers
  DROP CONSTRAINT IF EXISTS fk_customers_created_by,
  ADD  CONSTRAINT fk_customers_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE invoices
  DROP CONSTRAINT IF EXISTS fk_invoices_created_by,
  ADD  CONSTRAINT fk_invoices_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE invoice_items
  DROP CONSTRAINT IF EXISTS fk_invoice_items_created_by,
  ADD  CONSTRAINT fk_invoice_items_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE payments
  DROP CONSTRAINT IF EXISTS fk_payments_created_by,
  ADD  CONSTRAINT fk_payments_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE expenses
  DROP CONSTRAINT IF EXISTS fk_expenses_created_by,
  ADD  CONSTRAINT fk_expenses_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE products
  DROP CONSTRAINT IF EXISTS fk_products_created_by,
  ADD  CONSTRAINT fk_products_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE vendors
  DROP CONSTRAINT IF EXISTS fk_vendors_created_by,
  ADD  CONSTRAINT fk_vendors_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE product_vendors
  DROP CONSTRAINT IF EXISTS fk_product_vendors_created_by,
  ADD  CONSTRAINT fk_product_vendors_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE warranty_claims
  DROP CONSTRAINT IF EXISTS fk_warranty_created_by,
  ADD  CONSTRAINT fk_warranty_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

-- ============================================================
-- STEP 6: FOREIGN KEYS — CUSTOMER BILLING
-- ============================================================

ALTER TABLE invoices
  DROP CONSTRAINT IF EXISTS fk_invoices_customer,
  ADD  CONSTRAINT fk_invoices_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL;

ALTER TABLE warranty_claims
  DROP CONSTRAINT IF EXISTS fk_warranty_customer,
  ADD  CONSTRAINT fk_warranty_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT;

-- ============================================================
-- STEP 7: FOREIGN KEYS — INVOICE CHILD RECORDS
-- ============================================================

ALTER TABLE invoice_items
  DROP CONSTRAINT IF EXISTS fk_invoice_items_invoice,
  ADD  CONSTRAINT fk_invoice_items_invoice FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE;

ALTER TABLE payments
  DROP CONSTRAINT IF EXISTS fk_payments_invoice,
  ADD  CONSTRAINT fk_payments_invoice FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE SET NULL;

ALTER TABLE warranty_claims
  DROP CONSTRAINT IF EXISTS fk_warranty_invoice,
  ADD  CONSTRAINT fk_warranty_invoice FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE SET NULL;

-- ============================================================
-- STEP 8: FOREIGN KEYS — PRODUCT CONNECTIONS
-- ============================================================

ALTER TABLE invoice_items
  DROP CONSTRAINT IF EXISTS fk_invoice_items_product,
  ADD  CONSTRAINT fk_invoice_items_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL;

ALTER TABLE product_vendors
  DROP CONSTRAINT IF EXISTS fk_product_vendors_product,
  ADD  CONSTRAINT fk_product_vendors_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;

-- ============================================================
-- STEP 9: FOREIGN KEYS — VENDOR CONNECTIONS
-- ============================================================

ALTER TABLE invoice_items
  DROP CONSTRAINT IF EXISTS fk_invoice_items_vendor,
  ADD  CONSTRAINT fk_invoice_items_vendor FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE SET NULL;

ALTER TABLE expenses
  DROP CONSTRAINT IF EXISTS fk_expenses_vendor,
  ADD  CONSTRAINT fk_expenses_vendor FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE SET NULL;

ALTER TABLE product_vendors
  DROP CONSTRAINT IF EXISTS fk_product_vendors_vendor,
  ADD  CONSTRAINT fk_product_vendors_vendor FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE;

ALTER TABLE vendor_documents
  DROP CONSTRAINT IF EXISTS fk_vendor_docs_vendor,
  ADD  CONSTRAINT fk_vendor_docs_vendor FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE;

-- ============================================================
-- STEP 10: FOREIGN KEYS — SESSION OWNERSHIP
-- ============================================================

ALTER TABLE sessions
  DROP CONSTRAINT IF EXISTS fk_sessions_user,
  ADD  CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- ============================================================
-- STEP 11: PERFORMANCE INDEXES
-- ============================================================

-- FK indexes on all child tables
CREATE INDEX IF NOT EXISTS idx_users_org_id              ON users(org_id);
CREATE INDEX IF NOT EXISTS idx_customers_org_id          ON customers(org_id);
CREATE INDEX IF NOT EXISTS idx_customers_created_by      ON customers(created_by);
CREATE INDEX IF NOT EXISTS idx_invoices_org_id           ON invoices(org_id);
CREATE INDEX IF NOT EXISTS idx_invoices_customer_id      ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_created_by       ON invoices(created_by);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id  ON invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_product_id  ON invoice_items(product_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_vendor_id   ON invoice_items(vendor_id);
CREATE INDEX IF NOT EXISTS idx_payments_org_id           ON payments(org_id);
CREATE INDEX IF NOT EXISTS idx_payments_invoice_id       ON payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_created_by       ON payments(created_by);
CREATE INDEX IF NOT EXISTS idx_expenses_org_id           ON expenses(org_id);
CREATE INDEX IF NOT EXISTS idx_expenses_vendor_id        ON expenses(vendor_id);
CREATE INDEX IF NOT EXISTS idx_expenses_created_by       ON expenses(created_by);
CREATE INDEX IF NOT EXISTS idx_products_org_id           ON products(org_id);
CREATE INDEX IF NOT EXISTS idx_products_created_by       ON products(created_by);
CREATE INDEX IF NOT EXISTS idx_vendors_org_id            ON vendors(org_id);
CREATE INDEX IF NOT EXISTS idx_vendors_created_by        ON vendors(created_by);
CREATE INDEX IF NOT EXISTS idx_product_vendors_product   ON product_vendors(product_id);
CREATE INDEX IF NOT EXISTS idx_product_vendors_vendor    ON product_vendors(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_docs_vendor_id     ON vendor_documents(vendor_id);
CREATE INDEX IF NOT EXISTS idx_warranty_org_id           ON warranty_claims(org_id);
CREATE INDEX IF NOT EXISTS idx_warranty_customer_id      ON warranty_claims(customer_id);
CREATE INDEX IF NOT EXISTS idx_warranty_invoice_id       ON warranty_claims(invoice_id);
CREATE INDEX IF NOT EXISTS idx_warranty_created_by       ON warranty_claims(created_by);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id          ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_org_id           ON sessions(org_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at       ON sessions(expires_at);

-- Business composite indexes for query performance
CREATE INDEX IF NOT EXISTS idx_invoices_org_status       ON invoices(org_id, status);
CREATE INDEX IF NOT EXISTS idx_invoices_org_customer     ON invoices(org_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_org_date         ON invoices(org_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_payments_org_invoice      ON payments(org_id, invoice_id);
CREATE INDEX IF NOT EXISTS idx_products_org_sku          ON products(org_id, sku);
CREATE INDEX IF NOT EXISTS idx_vendors_org_status        ON vendors(org_id, status);
CREATE INDEX IF NOT EXISTS idx_warranty_org_status       ON warranty_claims(org_id, status);
CREATE INDEX IF NOT EXISTS idx_expenses_org_date         ON expenses(org_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_customers_org_name        ON customers(org_id, name);

COMMIT;
