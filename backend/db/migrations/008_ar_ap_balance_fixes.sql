-- ============================================================
-- MIGRATION 008: AR and AP Balance Fixes
-- ============================================================

BEGIN;

-- Add amount_paid to invoices to fix the aged receivables and balance sheet report crashes
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS amount_paid DECIMAL(12,2) DEFAULT 0.00;

-- Add balance_due to ap_invoices to fix the AP aging report crashes
ALTER TABLE ap_invoices ADD COLUMN IF NOT EXISTS balance_due DECIMAL(12,2) DEFAULT 0.00;

-- Backfill data: Invoices amount_paid from payments
UPDATE invoices i
SET amount_paid = (
  SELECT COALESCE(SUM(amount), 0)
  FROM payments p
  WHERE p.invoice_id = i.id AND p.deleted_at IS NULL
)
WHERE amount_paid = 0.00;

-- Backfill data: ap_invoices balance_due
-- Assume for now balance_due = total if status is pending
UPDATE ap_invoices ai
SET balance_due = amount
WHERE status IN ('pending', 'partially_paid') AND balance_due = 0.00;

COMMIT;
