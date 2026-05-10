-- ============================================================
-- 003: CLEAN RELATIONAL REBUILD
-- Drops ALL existing FKs, then re-adds them correctly
-- using composite keys for org-level data isolation.
-- ============================================================
BEGIN;

-- ══════════════════════════════════════════════════════════════
-- STEP 1: DROP ALL EXISTING FOREIGN KEY CONSTRAINTS
-- ══════════════════════════════════════════════════════════════
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT tc.table_name, tc.constraint_name
    FROM information_schema.table_constraints tc
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = 'public'
  LOOP
    EXECUTE format('ALTER TABLE %I DROP CONSTRAINT IF EXISTS %I', r.table_name, r.constraint_name);
  END LOOP;
END $$;

-- ══════════════════════════════════════════════════════════════
-- STEP 2: DROP DUPLICATE / WRONG UNIQUE CONSTRAINTS
-- ══════════════════════════════════════════════════════════════
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT tc.table_name, tc.constraint_name
    FROM information_schema.table_constraints tc
    WHERE tc.constraint_type = 'UNIQUE'
      AND tc.table_schema = 'public'
      AND tc.constraint_name NOT IN (
        'users_email_unique',
        'users_pkey','organizations_pkey','customers_pkey','vendors_pkey',
        'products_pkey','product_vendors_pkey','invoices_pkey','invoice_items_pkey',
        'payments_pkey','expenses_pkey','warranty_claims_pkey','vendor_documents_pkey',
        'sessions_pkey','migrations_pkey','migrations_name_key'
      )
  LOOP
    EXECUTE format('ALTER TABLE %I DROP CONSTRAINT IF EXISTS %I', r.table_name, r.constraint_name);
  END LOOP;
END $$;

-- ══════════════════════════════════════════════════════════════
-- STEP 3: ENSURE CORRECT COLUMN TYPES
-- ══════════════════════════════════════════════════════════════
-- Remove legacy password column
ALTER TABLE users DROP COLUMN IF EXISTS password;

-- Ensure invoice_items has org_id
ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS org_id TEXT;
UPDATE invoice_items ii SET org_id = i.org_id
  FROM invoices i WHERE ii.invoice_id = i.id AND ii.org_id IS NULL;

-- Vendor documents: file_data → file_url/storage_key (idempotent)
ALTER TABLE vendor_documents ADD COLUMN IF NOT EXISTS file_url TEXT;
ALTER TABLE vendor_documents ADD COLUMN IF NOT EXISTS storage_key TEXT;
ALTER TABLE vendor_documents ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='vendor_documents' AND column_name='file_data') THEN
    UPDATE vendor_documents SET file_url = file_data WHERE file_url IS NULL AND file_data IS NOT NULL;
    ALTER TABLE vendor_documents DROP COLUMN file_data;
  END IF;
END $$;

-- Warranty claims: proof_data → proof_url/storage_key (idempotent)
ALTER TABLE warranty_claims ADD COLUMN IF NOT EXISTS proof_url TEXT;
ALTER TABLE warranty_claims ADD COLUMN IF NOT EXISTS storage_key TEXT;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='warranty_claims' AND column_name='proof_data') THEN
    UPDATE warranty_claims SET proof_url = proof_data WHERE proof_url IS NULL AND proof_data IS NOT NULL;
    ALTER TABLE warranty_claims DROP COLUMN proof_data;
  END IF;
END $$;

-- ══════════════════════════════════════════════════════════════
-- STEP 4: COMPOSITE UNIQUE CONSTRAINTS (required by composite FKs)
-- ══════════════════════════════════════════════════════════════
CREATE UNIQUE INDEX IF NOT EXISTS uq_users_org_id      ON users(org_id, id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_customers_org_id  ON customers(org_id, id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_vendors_org_id    ON vendors(org_id, id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_products_org_id   ON products(org_id, id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_invoices_org_id   ON invoices(org_id, id);

-- ══════════════════════════════════════════════════════════════
-- STEP 5: BUSINESS UNIQUE CONSTRAINTS
-- ══════════════════════════════════════════════════════════════
CREATE UNIQUE INDEX IF NOT EXISTS uq_invoices_org_number   ON invoices(org_id, number);
CREATE UNIQUE INDEX IF NOT EXISTS uq_products_org_sku      ON products(org_id, sku);
CREATE UNIQUE INDEX IF NOT EXISTS uq_vendors_org_vendor_id ON vendors(org_id, vendor_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_pv_org_prod_vendor    ON product_vendors(org_id, product_id, vendor_id);

-- ══════════════════════════════════════════════════════════════
-- STEP 6: ADD ALL CORRECT FOREIGN KEYS
-- ══════════════════════════════════════════════════════════════

-- organizations.created_by → users (DEFERRABLE for circular dep)
ALTER TABLE organizations ADD CONSTRAINT fk_org_created_by
  FOREIGN KEY (created_by) REFERENCES users(id)
  ON DELETE SET NULL ON UPDATE CASCADE
  DEFERRABLE INITIALLY DEFERRED;

-- users.org_id → organizations
ALTER TABLE users ADD CONSTRAINT fk_users_org
  FOREIGN KEY (org_id) REFERENCES organizations(id)
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- sessions: composite (org_id, user_id) → users
ALTER TABLE sessions ADD CONSTRAINT fk_sessions_org
  FOREIGN KEY (org_id) REFERENCES organizations(id)
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE sessions ADD CONSTRAINT fk_sessions_user
  FOREIGN KEY (org_id, user_id) REFERENCES users(org_id, id)
  ON DELETE CASCADE ON UPDATE CASCADE;

-- customers
ALTER TABLE customers ADD CONSTRAINT fk_customers_org
  FOREIGN KEY (org_id) REFERENCES organizations(id)
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE customers ADD CONSTRAINT fk_customers_created_by
  FOREIGN KEY (org_id, created_by) REFERENCES users(org_id, id)
  ON DELETE SET NULL ON UPDATE CASCADE;

-- vendors
ALTER TABLE vendors ADD CONSTRAINT fk_vendors_org
  FOREIGN KEY (org_id) REFERENCES organizations(id)
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE vendors ADD CONSTRAINT fk_vendors_created_by
  FOREIGN KEY (org_id, created_by) REFERENCES users(org_id, id)
  ON DELETE SET NULL ON UPDATE CASCADE;

-- products
ALTER TABLE products ADD CONSTRAINT fk_products_org
  FOREIGN KEY (org_id) REFERENCES organizations(id)
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE products ADD CONSTRAINT fk_products_created_by
  FOREIGN KEY (org_id, created_by) REFERENCES users(org_id, id)
  ON DELETE SET NULL ON UPDATE CASCADE;

-- invoices
ALTER TABLE invoices ADD CONSTRAINT fk_invoices_org
  FOREIGN KEY (org_id) REFERENCES organizations(id)
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE invoices ADD CONSTRAINT fk_invoices_customer
  FOREIGN KEY (org_id, customer_id) REFERENCES customers(org_id, id)
  ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE invoices ADD CONSTRAINT fk_invoices_created_by
  FOREIGN KEY (org_id, created_by) REFERENCES users(org_id, id)
  ON DELETE SET NULL ON UPDATE CASCADE;

-- invoice_items
ALTER TABLE invoice_items ADD CONSTRAINT fk_items_org
  FOREIGN KEY (org_id) REFERENCES organizations(id)
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE invoice_items ADD CONSTRAINT fk_items_invoice
  FOREIGN KEY (org_id, invoice_id) REFERENCES invoices(org_id, id)
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE invoice_items ADD CONSTRAINT fk_items_product
  FOREIGN KEY (org_id, product_id) REFERENCES products(org_id, id)
  ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE invoice_items ADD CONSTRAINT fk_items_vendor
  FOREIGN KEY (org_id, vendor_id) REFERENCES vendors(org_id, id)
  ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE invoice_items ADD CONSTRAINT fk_items_created_by
  FOREIGN KEY (org_id, created_by) REFERENCES users(org_id, id)
  ON DELETE SET NULL ON UPDATE CASCADE;

-- payments
ALTER TABLE payments ADD CONSTRAINT fk_payments_org
  FOREIGN KEY (org_id) REFERENCES organizations(id)
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE payments ADD CONSTRAINT fk_payments_invoice
  FOREIGN KEY (org_id, invoice_id) REFERENCES invoices(org_id, id)
  ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE payments ADD CONSTRAINT fk_payments_created_by
  FOREIGN KEY (org_id, created_by) REFERENCES users(org_id, id)
  ON DELETE SET NULL ON UPDATE CASCADE;

-- expenses
ALTER TABLE expenses ADD CONSTRAINT fk_expenses_org
  FOREIGN KEY (org_id) REFERENCES organizations(id)
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE expenses ADD CONSTRAINT fk_expenses_vendor
  FOREIGN KEY (org_id, vendor_id) REFERENCES vendors(org_id, id)
  ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE expenses ADD CONSTRAINT fk_expenses_created_by
  FOREIGN KEY (org_id, created_by) REFERENCES users(org_id, id)
  ON DELETE SET NULL ON UPDATE CASCADE;

-- product_vendors
ALTER TABLE product_vendors ADD CONSTRAINT fk_pv_org
  FOREIGN KEY (org_id) REFERENCES organizations(id)
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE product_vendors ADD CONSTRAINT fk_pv_product
  FOREIGN KEY (org_id, product_id) REFERENCES products(org_id, id)
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE product_vendors ADD CONSTRAINT fk_pv_vendor
  FOREIGN KEY (org_id, vendor_id) REFERENCES vendors(org_id, id)
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE product_vendors ADD CONSTRAINT fk_pv_created_by
  FOREIGN KEY (org_id, created_by) REFERENCES users(org_id, id)
  ON DELETE SET NULL ON UPDATE CASCADE;

-- warranty_claims
ALTER TABLE warranty_claims ADD CONSTRAINT fk_warranty_org
  FOREIGN KEY (org_id) REFERENCES organizations(id)
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE warranty_claims ADD CONSTRAINT fk_warranty_customer
  FOREIGN KEY (org_id, customer_id) REFERENCES customers(org_id, id)
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE warranty_claims ADD CONSTRAINT fk_warranty_invoice
  FOREIGN KEY (org_id, invoice_id) REFERENCES invoices(org_id, id)
  ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE warranty_claims ADD CONSTRAINT fk_warranty_created_by
  FOREIGN KEY (org_id, created_by) REFERENCES users(org_id, id)
  ON DELETE SET NULL ON UPDATE CASCADE;

-- vendor_documents
ALTER TABLE vendor_documents ADD CONSTRAINT fk_vdocs_org
  FOREIGN KEY (org_id) REFERENCES organizations(id)
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE vendor_documents ADD CONSTRAINT fk_vdocs_vendor
  FOREIGN KEY (org_id, vendor_id) REFERENCES vendors(org_id, id)
  ON DELETE CASCADE ON UPDATE CASCADE;

-- ══════════════════════════════════════════════════════════════
-- STEP 7: FK INDEXES
-- ══════════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_users_org        ON users(org_id);
CREATE INDEX IF NOT EXISTS idx_sessions_org     ON sessions(org_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user    ON sessions(org_id, user_id);
CREATE INDEX IF NOT EXISTS idx_customers_org    ON customers(org_id);
CREATE INDEX IF NOT EXISTS idx_vendors_org      ON vendors(org_id);
CREATE INDEX IF NOT EXISTS idx_products_org     ON products(org_id);
CREATE INDEX IF NOT EXISTS idx_invoices_org     ON invoices(org_id);
CREATE INDEX IF NOT EXISTS idx_invoices_cust    ON invoices(org_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_items_org        ON invoice_items(org_id);
CREATE INDEX IF NOT EXISTS idx_items_invoice    ON invoice_items(org_id, invoice_id);
CREATE INDEX IF NOT EXISTS idx_items_product    ON invoice_items(org_id, product_id);
CREATE INDEX IF NOT EXISTS idx_items_vendor     ON invoice_items(org_id, vendor_id);
CREATE INDEX IF NOT EXISTS idx_payments_org     ON payments(org_id);
CREATE INDEX IF NOT EXISTS idx_payments_inv     ON payments(org_id, invoice_id);
CREATE INDEX IF NOT EXISTS idx_expenses_org     ON expenses(org_id);
CREATE INDEX IF NOT EXISTS idx_expenses_vendor  ON expenses(org_id, vendor_id);
CREATE INDEX IF NOT EXISTS idx_pv_product       ON product_vendors(org_id, product_id);
CREATE INDEX IF NOT EXISTS idx_pv_vendor        ON product_vendors(org_id, vendor_id);
CREATE INDEX IF NOT EXISTS idx_warranty_org     ON warranty_claims(org_id);
CREATE INDEX IF NOT EXISTS idx_warranty_cust    ON warranty_claims(org_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_warranty_inv     ON warranty_claims(org_id, invoice_id);
CREATE INDEX IF NOT EXISTS idx_vdocs_vendor     ON vendor_documents(org_id, vendor_id);

-- ══════════════════════════════════════════════════════════════
-- STEP 8: UPDATED_AT TRIGGER
-- ══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = CURRENT_TIMESTAMP; RETURN NEW; END;
$$ language 'plpgsql';

DO $$
DECLARE t text;
BEGIN
  FOR t IN
    SELECT table_name FROM information_schema.columns
    WHERE column_name = 'updated_at' AND table_schema = 'public'
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_updated_at ON %I', t);
    EXECUTE format('CREATE TRIGGER trg_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()', t);
  END LOOP;
END $$;

COMMIT;
