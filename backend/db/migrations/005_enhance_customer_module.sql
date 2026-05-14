-- 005_enhance_customer_module.sql
-- Enhancing customers table with additional fields for professional CRM functionality

ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS customer_id_display TEXT,
ADD COLUMN IF NOT EXISTS contact_person TEXT,
ADD COLUMN IF NOT EXISTS alternate_phone TEXT,
ADD COLUMN IF NOT EXISTS company_name TEXT,
ADD COLUMN IF NOT EXISTS business_type TEXT,
ADD COLUMN IF NOT EXISTS shipping_address_line1 TEXT,
ADD COLUMN IF NOT EXISTS shipping_address_line2 TEXT,
ADD COLUMN IF NOT EXISTS shipping_city TEXT,
ADD COLUMN IF NOT EXISTS shipping_state TEXT,
ADD COLUMN IF NOT EXISTS shipping_country TEXT DEFAULT 'India',
ADD COLUMN IF NOT EXISTS shipping_pincode TEXT,
ADD COLUMN IF NOT EXISTS payment_terms TEXT,
ADD COLUMN IF NOT EXISTS opening_balance NUMERIC(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS tax_preference TEXT DEFAULT 'taxable',
ADD COLUMN IF NOT EXISTS tags TEXT,
ADD COLUMN IF NOT EXISTS preferred_payment_method TEXT,
ADD COLUMN IF NOT EXISTS customer_category TEXT,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'blacklisted'));

-- Create an index for searching
CREATE INDEX IF NOT EXISTS idx_customers_search ON customers(org_id, name, email, phone, company_name, gstin);
