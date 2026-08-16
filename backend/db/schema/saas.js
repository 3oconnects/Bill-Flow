// backend/db/schema/saas.js — SaaS tables: plans, subscriptions, org_roles
const db = require('../conn');

module.exports = async function schemaSaasInit() {
  // Plans table
  await db.query(`
    CREATE TABLE IF NOT EXISTS plans (
      id              TEXT PRIMARY KEY,
      name            TEXT NOT NULL UNIQUE,
      slug            TEXT NOT NULL UNIQUE,
      description     TEXT,
      price_monthly   NUMERIC(10,2) NOT NULL DEFAULT 0,
      price_yearly    NUMERIC(10,2) NOT NULL DEFAULT 0,
      currency        TEXT NOT NULL DEFAULT 'USD',
      max_users       INTEGER,
      max_invoices_mo INTEGER,
      max_customers   INTEGER,
      max_vendors     INTEGER,
      max_products    INTEGER,
      max_storage_mb  INTEGER,
      features        JSONB NOT NULL DEFAULT '{}',
      is_active       BOOLEAN DEFAULT TRUE,
      sort_order      INTEGER DEFAULT 0,
      stripe_price_id_monthly TEXT,
      stripe_price_id_yearly  TEXT,
      razorpay_plan_id_monthly TEXT,
      razorpay_plan_id_yearly  TEXT,
      created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Seed default plans (idempotent)
  await db.query(`
    INSERT INTO plans (id, name, slug, description, price_monthly, price_yearly, currency, max_users, max_invoices_mo, max_customers, max_vendors, max_products, max_storage_mb, features, sort_order)
    VALUES
      ('plan_free', 'Free', 'free', 'Perfect for freelancers and small businesses just getting started',
       0, 0, 'USD', 2, 50, 25, 10, 50, 100,
       '{"invoices":true,"quotations":true,"payments":true,"expenses":true,"basic_reports":true,"gst":true,"recurring_billing":false,"credit_notes":false,"banking":false,"procurement":false,"api_access":false,"priority_support":false,"custom_roles":false,"audit_logs":false,"warranty":false}'::jsonb, 1),
      ('plan_pro', 'Pro', 'pro', 'For growing businesses that need full billing and inventory control',
       29, 290, 'USD', 10, 500, 500, 100, 500, 1000,
       '{"invoices":true,"quotations":true,"payments":true,"expenses":true,"basic_reports":true,"advanced_reports":true,"gst":true,"recurring_billing":true,"credit_notes":true,"banking":true,"procurement":true,"api_access":true,"priority_support":false,"custom_roles":true,"audit_logs":true,"warranty":true}'::jsonb, 2),
      ('plan_enterprise', 'Enterprise', 'enterprise', 'For large teams with advanced needs, dedicated support, and unlimited usage',
       99, 990, 'USD', NULL, NULL, NULL, NULL, NULL, NULL,
       '{"invoices":true,"quotations":true,"payments":true,"expenses":true,"basic_reports":true,"advanced_reports":true,"gst":true,"recurring_billing":true,"credit_notes":true,"banking":true,"procurement":true,"api_access":true,"priority_support":true,"custom_roles":true,"audit_logs":true,"warranty":true,"sso":true,"ip_allowlist":true,"custom_domain":true}'::jsonb, 3)
    ON CONFLICT (id) DO NOTHING
  `);

  // Subscriptions
  await db.query(`
    CREATE TABLE IF NOT EXISTS subscriptions (
      id                    TEXT PRIMARY KEY,
      org_id                TEXT NOT NULL REFERENCES organizations(id),
      plan_id               TEXT NOT NULL REFERENCES plans(id),
      status                TEXT NOT NULL DEFAULT 'active'
                              CHECK (status IN ('trialing','active','past_due','canceled','expired','paused')),
      billing_cycle         TEXT NOT NULL DEFAULT 'monthly'
                              CHECK (billing_cycle IN ('monthly','yearly')),
      gateway               TEXT,
      gateway_subscription_id TEXT,
      gateway_customer_id   TEXT,
      trial_ends_at         TIMESTAMP,
      current_period_start  TIMESTAMP,
      current_period_end    TIMESTAMP,
      canceled_at           TIMESTAMP,
      invoices_this_month   INTEGER DEFAULT 0,
      usage_reset_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      created_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.query(`CREATE UNIQUE INDEX IF NOT EXISTS uq_subscriptions_org ON subscriptions(org_id)`);
  await db.query(`CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status)`);

  // Subscription events
  await db.query(`
    CREATE TABLE IF NOT EXISTS subscription_events (
      id              TEXT PRIMARY KEY,
      org_id          TEXT NOT NULL,
      subscription_id TEXT,
      event_type      TEXT NOT NULL,
      from_plan_id    TEXT,
      to_plan_id      TEXT,
      gateway_event_id TEXT,
      metadata        JSONB DEFAULT '{}',
      created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.query(`CREATE INDEX IF NOT EXISTS idx_sub_events_org ON subscription_events(org_id)`);

  // Org roles (persisted RBAC)
  await db.query(`
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
    )
  `);

  await db.query(`CREATE INDEX IF NOT EXISTS idx_org_roles_org ON org_roles(org_id)`);

  // Organization SaaS columns
  await db.query(`ALTER TABLE organizations ADD COLUMN IF NOT EXISTS plan_id TEXT DEFAULT 'plan_free'`);
  await db.query(`ALTER TABLE organizations ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT`);
  await db.query(`ALTER TABLE organizations ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE`);
  await db.query(`ALTER TABLE organizations ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMP`);

  // User email verification columns
  await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE`);
  await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verify_token TEXT`);
  await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verify_expires TIMESTAMP`);
  await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token TEXT`);
  await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMP`);

  // RLS helper function
  await db.query(`
    CREATE OR REPLACE FUNCTION current_org_id() RETURNS TEXT AS $$
    BEGIN
      RETURN current_setting('app.current_org_id', true);
    END;
    $$ LANGUAGE plpgsql STABLE SECURITY INVOKER
  `);

  // Enable RLS on all tenant-scoped tables
  await db.query(`
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
  `);
};
