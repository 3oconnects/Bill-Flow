-- backend/db/migrations/006_invoice_overhaul.sql

-- 1. Update Invoices Table
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS paid_amount NUMERIC(12,2) DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS due_amount NUMERIC(12,2) DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS sales_person TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS reference_number TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payment_terms TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS tax_type TEXT DEFAULT 'exclusive'; -- exclusive or inclusive
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS discount_type TEXT DEFAULT 'percentage'; -- percentage or fixed
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS attachment_url TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS customer_id_display TEXT;

-- Update status check constraint (Drop and recreate)
ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_status_check;
ALTER TABLE invoices ADD CONSTRAINT invoices_status_check CHECK (status IN ('draft', 'pending', 'sent', 'paid', 'partially_paid', 'overdue', 'cancelled', 'refunded'));

-- 2. Update Invoice Items Table
ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS discount_pct NUMERIC(5,2) DEFAULT 0;
ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(12,2) DEFAULT 0;
ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS cgst_rate NUMERIC(5,2) DEFAULT 0;
ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS cgst_amount NUMERIC(12,2) DEFAULT 0;
ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS sgst_rate NUMERIC(5,2) DEFAULT 0;
ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS sgst_amount NUMERIC(12,2) DEFAULT 0;
ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS igst_rate NUMERIC(5,2) DEFAULT 0;
ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS igst_amount NUMERIC(12,2) DEFAULT 0;
ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS unit TEXT DEFAULT 'pcs';
ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS subtotal NUMERIC(12,2) DEFAULT 0;

-- 3. Update Payments Table (if needed)
ALTER TABLE payments ADD COLUMN IF NOT EXISTS transaction_id TEXT;
