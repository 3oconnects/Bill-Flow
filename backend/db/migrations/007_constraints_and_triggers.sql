-- ============================================================
-- Migration 007: DB Constraints, Triggers, Performance Indexes
-- ============================================================
BEGIN;

-- ── Prevent negative stock at DB level ───────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_stock_non_negative'
  ) THEN
    ALTER TABLE products ADD CONSTRAINT chk_stock_non_negative CHECK (stock_qty >= 0);
  END IF;
END $$;

-- ── Prevent overpayment at DB level ──────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_paid_not_exceed_total'
  ) THEN
    ALTER TABLE invoices ADD CONSTRAINT chk_paid_not_exceed_total
      CHECK (COALESCE(paid_amount, 0) <= total + 0.01); -- 1 paise tolerance for rounding
  END IF;
END $$;

-- ── Prevent paid_amount going negative ───────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_paid_non_negative'
  ) THEN
    ALTER TABLE invoices ADD CONSTRAINT chk_paid_non_negative
      CHECK (COALESCE(paid_amount, 0) >= 0);
  END IF;
END $$;

-- ── Invoice status auto-update trigger ───────────────────────────────────────
-- Keeps status in sync when paid_amount changes
CREATE OR REPLACE FUNCTION fn_update_invoice_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.paid_amount IS NOT NULL THEN
    IF NEW.paid_amount >= NEW.total THEN
      NEW.status := 'paid';
    ELSIF NEW.paid_amount > 0 THEN
      -- Only set partially_paid if not draft/cancelled
      IF NEW.status NOT IN ('draft', 'cancelled') THEN
        NEW.status := 'partially_paid';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_invoice_status_sync ON invoices;
CREATE TRIGGER trg_invoice_status_sync
  BEFORE UPDATE OF paid_amount ON invoices
  FOR EACH ROW EXECUTE FUNCTION fn_update_invoice_status();

-- ── Prevent posting to overdue invoices marked cancelled ─────────────────────
CREATE OR REPLACE FUNCTION fn_prevent_payment_to_cancelled()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM invoices WHERE id = NEW.invoice_id AND status = 'cancelled'
  ) THEN
    RAISE EXCEPTION 'Cannot allocate payment to a cancelled invoice %', NEW.invoice_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_no_payment_to_cancelled ON payment_allocations;
CREATE TRIGGER trg_no_payment_to_cancelled
  BEFORE INSERT ON payment_allocations
  FOR EACH ROW EXECUTE FUNCTION fn_prevent_payment_to_cancelled();

-- ── Additional performance indexes ───────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_invoices_org_due       ON invoices(org_id, due_date) WHERE status IN ('sent','overdue');
CREATE INDEX IF NOT EXISTS idx_invoices_customer_open ON invoices(customer_id) WHERE status IN ('sent','partially_paid','overdue') AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_payments_org_date      ON payments(org_id, payment_date DESC);
CREATE INDEX IF NOT EXISTS idx_payments_customer      ON payments(customer_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_gst_ledger_period      ON gst_ledger(org_id, year DESC, month DESC);
CREATE INDEX IF NOT EXISTS idx_bank_tx_matched        ON bank_transactions(matched_to_type, matched_to_id) WHERE matched_to_id IS NOT NULL;

-- ── Ensure mv_daily_revenue unique index for CONCURRENTLY refresh ─────────────
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_matviews WHERE matviewname = 'mv_daily_revenue'
  ) THEN
    -- Already exists, just ensure the unique index
    EXECUTE 'CREATE UNIQUE INDEX IF NOT EXISTS uidx_mv_daily_revenue ON mv_daily_revenue(org_id, revenue_date)';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_matviews WHERE matviewname = 'mv_customer_aging'
  ) THEN
    EXECUTE 'CREATE UNIQUE INDEX IF NOT EXISTS uidx_mv_customer_aging ON mv_customer_aging(org_id, customer_id)';
  END IF;
END $$;

COMMIT;
