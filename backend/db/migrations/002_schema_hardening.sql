-- ============================================================
-- BILLFLOW SCHEMA HARDENING & MULTI-TENANCY MISSION
-- Migration: 002_schema_hardening
-- ============================================================

BEGIN;

-- ── 1. UPDATED_AT TRIGGER INFRASTRUCTURE ────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- ── 2. DATA CLEANUP & RENAMES ───────────────────────────────

-- Remove legacy password column
ALTER TABLE users DROP COLUMN IF EXISTS password;

-- Handle file data migration for Vendor Documents
ALTER TABLE vendor_documents ADD COLUMN IF NOT EXISTS file_url TEXT;
ALTER TABLE vendor_documents ADD COLUMN IF NOT EXISTS storage_key TEXT;
UPDATE vendor_documents SET file_url = file_data WHERE file_url IS NULL AND file_data IS NOT NULL;
ALTER TABLE vendor_documents DROP COLUMN IF EXISTS file_data;

-- Handle file data migration for Warranty Claims
ALTER TABLE warranty_claims ADD COLUMN IF NOT EXISTS proof_url TEXT;
ALTER TABLE warranty_claims ADD COLUMN IF NOT EXISTS storage_key TEXT;
UPDATE warranty_claims SET proof_url = proof_data WHERE proof_url IS NULL AND proof_data IS NOT NULL;
ALTER TABLE warranty_claims DROP COLUMN IF EXISTS proof_data;

-- Convert types
ALTER TABLE invoice_items ALTER COLUMN quantity TYPE NUMERIC(12,3) USING quantity::NUMERIC(12,3);
ALTER TABLE products      ALTER COLUMN tax_rate TYPE NUMERIC(5,2) USING tax_rate::NUMERIC(5,2);
ALTER TABLE invoice_items ALTER COLUMN tax_rate TYPE NUMERIC(5,2) USING tax_rate::NUMERIC(5,2);
ALTER TABLE expenses      ALTER COLUMN gst_rate TYPE NUMERIC(5,2) USING gst_rate::NUMERIC(5,2);
ALTER TABLE invoices      ALTER COLUMN discount_pct TYPE NUMERIC(5,2) USING discount_pct::NUMERIC(5,2);

-- ── 3. ADD MISSING ORG_ID TO INVOICE_ITEMS ──────────────────

ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS org_id TEXT;

-- Backfill org_id from invoices table
UPDATE invoice_items ii
SET org_id = i.org_id
FROM invoices i
WHERE ii.invoice_id = i.id AND ii.org_id IS NULL;

-- Now make it NOT NULL
ALTER TABLE invoice_items ALTER COLUMN org_id SET NOT NULL;

-- ── 4. RESOLVE CIRCULAR DEPENDENCY (DEFERRABLE CONSTRAINTS) ──
ALTER TABLE organizations DROP CONSTRAINT IF EXISTS fk_org_created_by;
ALTER TABLE organizations 
  ADD CONSTRAINT fk_org_created_by 
  FOREIGN KEY (created_by) REFERENCES users(id) 
  ON DELETE SET NULL 
  DEFERRABLE INITIALLY DEFERRED;

-- ── 5. ORG-LEVEL SAFETY (COMPOSITE FOREIGN KEYS) ────────────

-- Ensure parents have composite unique keys
ALTER TABLE customers ADD CONSTRAINT customers_org_id_unique UNIQUE (org_id, id);
ALTER TABLE vendors   ADD CONSTRAINT vendors_org_id_unique   UNIQUE (org_id, id);
ALTER TABLE products  ADD CONSTRAINT products_org_id_unique  UNIQUE (org_id, id);
ALTER TABLE invoices  ADD CONSTRAINT invoices_org_id_unique  UNIQUE (org_id, id);

-- Invoices
ALTER TABLE invoices DROP CONSTRAINT IF EXISTS fk_invoices_customer;
ALTER TABLE invoices 
  ADD CONSTRAINT fk_invoices_customer 
  FOREIGN KEY (org_id, customer_id) REFERENCES customers(org_id, id) 
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Invoice Items
ALTER TABLE invoice_items DROP CONSTRAINT IF EXISTS fk_items_invoice;
ALTER TABLE invoice_items 
  ADD CONSTRAINT fk_items_invoice 
  FOREIGN KEY (org_id, invoice_id) REFERENCES invoices(org_id, id) 
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE invoice_items DROP CONSTRAINT IF EXISTS fk_items_product;
ALTER TABLE invoice_items 
  ADD CONSTRAINT fk_items_product 
  FOREIGN KEY (org_id, product_id) REFERENCES products(org_id, id) 
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE invoice_items DROP CONSTRAINT IF EXISTS fk_items_vendor;
ALTER TABLE invoice_items 
  ADD CONSTRAINT fk_items_vendor 
  FOREIGN KEY (org_id, vendor_id) REFERENCES vendors(org_id, id) 
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Product Vendors
ALTER TABLE product_vendors DROP CONSTRAINT IF EXISTS fk_pv_product;
ALTER TABLE product_vendors 
  ADD CONSTRAINT fk_pv_product 
  FOREIGN KEY (org_id, product_id) REFERENCES products(org_id, id) 
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE product_vendors DROP CONSTRAINT IF EXISTS fk_pv_vendor;
ALTER TABLE product_vendors 
  ADD CONSTRAINT fk_pv_vendor 
  FOREIGN KEY (org_id, vendor_id) REFERENCES vendors(org_id, id) 
  ON DELETE CASCADE ON UPDATE CASCADE;

-- Warranty Claims
ALTER TABLE warranty_claims DROP CONSTRAINT IF EXISTS fk_warranty_customer;
ALTER TABLE warranty_claims 
  ADD CONSTRAINT fk_warranty_customer 
  FOREIGN KEY (org_id, customer_id) REFERENCES customers(org_id, id) 
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE warranty_claims DROP CONSTRAINT IF EXISTS fk_warranty_invoice;
ALTER TABLE warranty_claims 
  ADD CONSTRAINT fk_warranty_invoice 
  FOREIGN KEY (org_id, invoice_id) REFERENCES invoices(org_id, id) 
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Payments
ALTER TABLE payments DROP CONSTRAINT IF EXISTS fk_payments_invoice;
ALTER TABLE payments 
  ADD CONSTRAINT fk_payments_invoice 
  FOREIGN KEY (org_id, invoice_id) REFERENCES invoices(org_id, id) 
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Expenses
ALTER TABLE expenses DROP CONSTRAINT IF EXISTS fk_expenses_vendor;
ALTER TABLE expenses 
  ADD CONSTRAINT fk_expenses_vendor 
  FOREIGN KEY (org_id, vendor_id) REFERENCES vendors(org_id, id) 
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Vendor Documents
ALTER TABLE vendor_documents DROP CONSTRAINT IF EXISTS fk_vendor_docs_vendor;
ALTER TABLE vendor_documents 
  ADD CONSTRAINT fk_vendor_docs_vendor 
  FOREIGN KEY (org_id, vendor_id) REFERENCES vendors(org_id, id) 
  ON DELETE CASCADE ON UPDATE CASCADE;

-- ── 6. APPLY UPDATED_AT TRIGGERS ────────────────────────────

DO $$
DECLARE
    t text;
BEGIN
    FOR t IN 
        SELECT table_name 
        FROM information_schema.columns 
        WHERE column_name = 'updated_at' 
        AND table_schema = 'public'
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS trg_update_updated_at ON %I', t);
        EXECUTE format('CREATE TRIGGER trg_update_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()', t);
    END LOOP;
END $$;

-- ── 7. ENSURE INDEXES ───────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_items_org_id ON invoice_items(org_id);
CREATE INDEX IF NOT EXISTS idx_items_invoice_id ON invoice_items(invoice_id);

COMMIT;
