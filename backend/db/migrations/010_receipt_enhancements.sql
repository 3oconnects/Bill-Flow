-- Migration 010: Receipt Enhancements
-- Add columns to payments table for rich receipt generation, dynamic payment methods, and audit status.

ALTER TABLE payments ADD COLUMN IF NOT EXISTS receipt_number VARCHAR(100);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS bank_name VARCHAR(150);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS cheque_number VARCHAR(100);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS cheque_date DATE;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS transaction_id VARCHAR(150);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS terms TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_details JSONB DEFAULT '{}'::jsonb;

-- Create index on org_id and receipt_number for fast lookup
CREATE INDEX IF NOT EXISTS idx_payments_org_receipt_number ON payments(org_id, receipt_number);
