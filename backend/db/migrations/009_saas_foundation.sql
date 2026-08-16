-- 009_saas_foundation.sql
-- BillFlow Pro: SaaS Foundation Migration
-- Adds: plans, subscriptions, subscription_events, persisted roles/permissions,
--        email verification, and Row-Level Security on all tenant-scoped tables.

BEGIN;

-- ============================================================================
-- 1. PLANS — Pricing tiers (Free / Pro / Enterprise)
-- ============================================================================

CREATE TABLE IF NOT EXISTS plans (
  id              TEXT PRIMARY KEY,
  name            TEXT NOT NULL UNIQUE,
  slug            TEXT NOT NULL UNIQUE,  -- 'free', 'pro', 'enterprise'
  description     TEXT,
  price_monthly   NUMERIC(10,2) NOT NULL DEFAULT 0,
  price_yearly    NUMERIC(10,2) NOT NULL DEFAULT 0,
  currency        TEXT NOT NULL DEFAULT 'USD',
  -- Feature limits (NULL = unlimited)
  max_users       INTEGER,
  max_invoices_mo INTEGER,                -- per month
  max_customers   INTEGER,
  max_vendors     INTEGER,
  max_products    INTEGER,
  max_storage_mb  INTEGER,
  -- Feature flags
  features        JSONB NOT NULL DEFAULT '{}',
  is_active       BOOLEAN DEFAULT TRUE,
  sort_order      INTEGER DEFAULT 0,
  stripe_price_id_monthly TEXT,            -- Stripe price ID
  stripe_price_id_yearly  TEXT,
  razorpay_plan_id_monthly TEXT,           -- Razorpay plan ID
  razorpay_plan_id_yearly  TEXT,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed default plans
INSERT INTO plans (id, name, slug, description, price_monthly, price_yearly, currency, max_users, max_invoices_mo, max_customers, max_vendors, max_products, max_storage_mb, features, sort_order)
VALUES
  ('plan_free', 'Free', 'free',
   'Perfect for freelancers and small businesses just getting started',
   0, 0, 'USD',
   2, 50, 25, 10, 50, 100,
   '{"invoices":true,"quotations":true,"payments":true,"expenses":true,"basic_reports":true,"gst":true,"recurring_billing":false,"credit_notes":false,"banking":false,"procurement":false,"api_access":false,"priority_support":false,"custom_roles":false,"audit_logs":false,"warranty":false}'::jsonb,
   1),
  ('plan_pro', 'Pro', 'pro',
   'For growing businesses that need full billing and inventory control',
   29, 290, 'USD',
   10, 500, 500, 100, 500, 1000,
   '{"invoices":true,"quotations":true,"payments":true,"expenses":true,"basic_reports":true,"advanced_reports":true,"gst":true,"recurring_billing":true,"credit_notes":true,"banking":true,"procurement":true,"api_access":true,"priority_support":false,"custom_roles":true,"audit_logs":true,"warranty":true}'::jsonb,
   2),
  ('plan_enterprise', 'Enterprise', 'enterprise',
   'For large teams with advanced needs, dedicated support, and unlimited usage',
   99, 990, 'USD',
   NULL, NULL, NULL, NULL, NULL, NULL,
   '{"invoices":true,"quotations":true,"payments":true,"expenses":true,"basic_reports":true,"advanced_reports":true,"gst":true,"recurring_billing":true,"credit_notes":true,"banking":true,"procurement":true,"api_access":true,"priority_support":true,"custom_roles":true,"audit_logs":true,"warranty":true,"sso":true,"ip_allowlist":true,"custom_domain":true}'::jsonb,
   3)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 2. SUBSCRIPTIONS — Links org to a plan
-- ============================================================================

CREATE TABLE IF NOT EXISTS subscriptions (
  id                    TEXT PRIMARY KEY,
  org_id                TEXT NOT NULL REFERENCES organizations(id),
  plan_id               TEXT NOT NULL REFERENCES plans(id),
  status                TEXT NOT NULL DEFAULT 'active'
                          CHECK (status IN ('trialing','active','past_due','canceled','expired','paused')),
  billing_cycle         TEXT NOT NULL DEFAULT 'monthly'
                          CHECK (billing_cycle IN ('monthly','yearly')),
  -- Gateway references (gateway-agnostic)
  gateway               TEXT,  -- 'stripe' | 'razorpay' | NULL (free)
  gateway_subscription_id TEXT,
  gateway_customer_id   TEXT,
  -- Dates
  trial_ends_at         TIMESTAMP,
  current_period_start  TIMESTAMP,
  current_period_end    TIMESTAMP,
  canceled_at           TIMESTAMP,
  -- Usage counters (refreshed monthly by cron)
  invoices_this_month   INTEGER DEFAULT 0,
  usage_reset_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_subscriptions_org ON subscriptions(org_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_gateway ON subscriptions(gateway, gateway_subscription_id);

-- ============================================================================
-- 3. SUBSCRIPTION EVENTS — Audit trail for billing lifecycle
-- ============================================================================

CREATE TABLE IF NOT EXISTS subscription_events (
  id              TEXT PRIMARY KEY,
  org_id          TEXT NOT NULL,
  subscription_id TEXT REFERENCES subscriptions(id),
  event_type      TEXT NOT NULL,  -- 'created','upgraded','downgraded','canceled','renewed','payment_failed','payment_succeeded','trial_started','trial_ended'
  from_plan_id    TEXT,
  to_plan_id      TEXT,
  gateway_event_id TEXT,
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sub_events_org ON subscription_events(org_id);
CREATE INDEX IF NOT EXISTS idx_sub_events_sub ON subscription_events(subscription_id);

-- ============================================================================
-- 4. PERSISTED ROLES & PERMISSIONS (replace in-memory cache)
-- ============================================================================

CREATE TABLE IF NOT EXISTS org_roles (
  id          TEXT PRIMARY KEY,
  org_id      TEXT NOT NULL,
  name        TEXT NOT NULL,
  description TEXT DEFAULT '',
  is_system   BOOLEAN DEFAULT FALSE,
  color       TEXT DEFAULT '#2563eb',
  permissions JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at  TIMESTAMP,
  UNIQUE (org_id, name)
);

CREATE INDEX IF NOT EXISTS idx_org_roles_org ON org_roles(org_id);

-- ============================================================================
-- 5. EMAIL VERIFICATION
-- ============================================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verify_token TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verify_expires TIMESTAMP;

-- Existing users are considered verified (grandfathered in)
UPDATE users SET email_verified = TRUE WHERE email_verified IS NULL OR email_verified = FALSE;

-- ============================================================================
-- 6. PASSWORD RESET TOKENS
-- ============================================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMP;

-- ============================================================================
-- 7. ORGANIZATION — Link to plan, add SaaS metadata
-- ============================================================================

ALTER TABLE organizations ADD COLUMN IF NOT EXISTS plan_id TEXT DEFAULT 'plan_free';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMP;

-- ============================================================================
-- 8. ROW-LEVEL SECURITY (RLS) — Defense-in-depth for tenant isolation
-- ============================================================================
-- The application sets `app.current_org_id` on each request via SET LOCAL.
-- RLS policies use this to restrict row access to the current tenant.
-- Note: We use a custom GUC (app.current_org_id) because BillFlow uses
-- its own JWT auth, not Supabase Auth.

-- Helper function to get current org_id from GUC
CREATE OR REPLACE FUNCTION current_org_id() RETURNS TEXT AS $$
BEGIN
  RETURN current_setting('app.current_org_id', true);
END;
$$ LANGUAGE plpgsql STABLE SECURITY INVOKER;

-- Enable RLS on all tenant-scoped tables
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY[
      'customers','invoices','invoice_items','payments','products',
      'expenses','vendors','warranty_claims','quotations','credit_notes',
      'recurring_invoices','purchase_templates',
      'ap_down_payments','ap_invoices','ap_invoice_items',
      'ap_credit_memos','ap_credit_memo_items',
      'ap_reserve_invoices','ap_reserve_invoice_items',
      'ap_activity_logs','audit_logs','payment_allocations',
      'org_roles','subscriptions','subscription_events'
    ])
  LOOP
    -- Enable RLS (idempotent)
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
    -- Force RLS even for table owner (defense-in-depth)
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', tbl);

    -- Drop existing policies to avoid conflicts
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation_select ON %I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation_insert ON %I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation_update ON %I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation_delete ON %I', tbl);

    -- SELECT: only rows matching current org
    EXECUTE format(
      'CREATE POLICY tenant_isolation_select ON %I FOR SELECT USING (org_id = current_org_id())', tbl
    );
    -- INSERT: can only insert rows for current org
    EXECUTE format(
      'CREATE POLICY tenant_isolation_insert ON %I FOR INSERT WITH CHECK (org_id = current_org_id())', tbl
    );
    -- UPDATE: can only update own org's rows, and can't change org_id
    EXECUTE format(
      'CREATE POLICY tenant_isolation_update ON %I FOR UPDATE USING (org_id = current_org_id()) WITH CHECK (org_id = current_org_id())', tbl
    );
    -- DELETE: can only delete own org's rows
    EXECUTE format(
      'CREATE POLICY tenant_isolation_delete ON %I FOR DELETE USING (org_id = current_org_id())', tbl
    );
  END LOOP;
END $$;

-- Tables without org_id that should NOT have tenant RLS:
-- organizations, users, sessions, plans
-- Users are cross-org lookupable (by email for login), so RLS is at app level.
-- Organizations table: no tenant-scoping needed (each org sees only itself via route logic).

-- ============================================================================
-- 9. Updated-at triggers for new tables
-- ============================================================================

DROP TRIGGER IF EXISTS trg_updated_at ON plans;
CREATE TRIGGER trg_updated_at BEFORE UPDATE ON plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_updated_at ON subscriptions;
CREATE TRIGGER trg_updated_at BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_updated_at ON org_roles;
CREATE TRIGGER trg_updated_at BEFORE UPDATE ON org_roles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMIT;
