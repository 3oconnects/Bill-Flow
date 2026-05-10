// backend/db/schema.js — Clean Multi-Tenant ERP Schema
const db = require('./conn');

async function initSchema() {
  try {
    console.log('Initializing PostgreSQL schema...');

    // ── Trigger function ────────────────────────────────────────
    await db.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN NEW.updated_at = CURRENT_TIMESTAMP; RETURN NEW; END;
      $$ language 'plpgsql';
    `);

    // ── ORGANIZATIONS ───────────────────────────────────────────
    await db.query(`
      CREATE TABLE IF NOT EXISTS organizations (
        id            TEXT PRIMARY KEY,
        name          TEXT NOT NULL,
        email         TEXT,
        phone         TEXT,
        address       TEXT,
        city          TEXT,
        state         TEXT DEFAULT 'Tamil Nadu',
        country       TEXT DEFAULT 'India',
        pincode       TEXT,
        gstin         TEXT,
        pan           TEXT,
        logo_url      TEXT,
        currency      TEXT DEFAULT 'INR',
        inv_prefix    TEXT DEFAULT 'INV-',
        next_inv_no   INTEGER DEFAULT 1,
        default_notes TEXT DEFAULT 'Thank you for your business.',
        default_terms TEXT DEFAULT 'Payment due within 30 days.',
        created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted_at    TIMESTAMP,
        created_by    TEXT
      )
    `);

    // ── USERS ───────────────────────────────────────────────────
    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id            TEXT PRIMARY KEY,
        org_id        TEXT NOT NULL,
        name          TEXT NOT NULL,
        email         TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        role          TEXT NOT NULL DEFAULT 'member',
        is_active     BOOLEAN DEFAULT TRUE,
        last_login    TIMESTAMP,
        created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted_at    TIMESTAMP,
        created_by    TEXT,
        UNIQUE (org_id, id)
      )
    `);

    // ── SESSIONS ────────────────────────────────────────────────
    await db.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        token      TEXT PRIMARY KEY,
        user_id    TEXT NOT NULL,
        org_id     TEXT NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // ── CUSTOMERS ───────────────────────────────────────────────
    await db.query(`
      CREATE TABLE IF NOT EXISTS customers (
        id           TEXT PRIMARY KEY,
        org_id       TEXT NOT NULL,
        name         TEXT NOT NULL,
        email        TEXT,
        phone        TEXT,
        address      TEXT,
        city         TEXT,
        state        TEXT,
        country      TEXT DEFAULT 'India',
        pincode      TEXT,
        gstin        TEXT,
        pan          TEXT,
        currency     TEXT DEFAULT 'INR',
        credit_limit NUMERIC(12,2) DEFAULT 0,
        notes        TEXT,
        outstanding  NUMERIC(12,2) DEFAULT 0,
        created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted_at   TIMESTAMP,
        created_by   TEXT,
        UNIQUE (org_id, id)
      )
    `);

    // ── VENDORS ─────────────────────────────────────────────────
    await db.query(`
      CREATE TABLE IF NOT EXISTS vendors (
        id             TEXT PRIMARY KEY,
        org_id         TEXT NOT NULL,
        name           TEXT NOT NULL,
        email          TEXT,
        phone          TEXT,
        address        TEXT,
        gstin          TEXT,
        pan            TEXT,
        bank_account   TEXT,
        ifsc           TEXT,
        notes          TEXT,
        vendor_id      TEXT,
        company_name   TEXT,
        contact_person TEXT,
        street         TEXT,
        city           TEXT,
        state          TEXT,
        pincode        TEXT,
        country        TEXT DEFAULT 'India',
        bank_name      TEXT,
        bank_branch    TEXT,
        status         TEXT DEFAULT 'active' CHECK (status IN ('active','inactive','blocked')),
        created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted_at     TIMESTAMP,
        created_by     TEXT,
        UNIQUE (org_id, id)
      )
    `);

    // ── PRODUCTS ────────────────────────────────────────────────
    await db.query(`
      CREATE TABLE IF NOT EXISTS products (
        id                 TEXT PRIMARY KEY,
        org_id             TEXT NOT NULL,
        unique_id          TEXT,
        name               TEXT NOT NULL,
        sku                TEXT,
        hsn_code           TEXT,
        description        TEXT,
        category           TEXT DEFAULT 'general',
        unit               TEXT DEFAULT 'pcs',
        unit_price         NUMERIC(12,2) DEFAULT 0,
        purchase_price     NUMERIC(12,2) DEFAULT 0,
        tax_rate           NUMERIC(5,2) DEFAULT 18,
        stock_qty          NUMERIC(12,3) DEFAULT 0,
        low_stock_alert    NUMERIC(12,3) DEFAULT 5,
        image_url          TEXT,
        brand              TEXT,
        model_number       TEXT,
        warranty_type      TEXT DEFAULT 'none',
        warranty_duration  INTEGER DEFAULT 0,
        warranty_unit      TEXT DEFAULT 'months',
        warranty_terms     TEXT,
        guarantee_type     TEXT DEFAULT 'none',
        guarantee_duration INTEGER DEFAULT 0,
        guarantee_unit     TEXT DEFAULT 'days',
        guarantee_terms    TEXT,
        is_active          BOOLEAN DEFAULT TRUE,
        created_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted_at         TIMESTAMP,
        created_by         TEXT,
        UNIQUE (org_id, id)
      )
    `);

    // ── PRODUCT VENDORS ─────────────────────────────────────────
    await db.query(`
      CREATE TABLE IF NOT EXISTS product_vendors (
        id           TEXT PRIMARY KEY,
        org_id       TEXT NOT NULL,
        product_id   TEXT NOT NULL,
        vendor_id    TEXT NOT NULL,
        supply_price NUMERIC(12,2) DEFAULT 0,
        is_primary   BOOLEAN DEFAULT FALSE,
        notes        TEXT,
        created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted_at   TIMESTAMP,
        created_by   TEXT
      )
    `);

    // ── INVOICES ────────────────────────────────────────────────
    await db.query(`
      CREATE TABLE IF NOT EXISTS invoices (
        id                    TEXT PRIMARY KEY,
        org_id                TEXT NOT NULL,
        number                TEXT NOT NULL,
        customer_id           TEXT,
        customer_name         TEXT NOT NULL,
        customer_phone        TEXT,
        customer_email        TEXT,
        date                  DATE NOT NULL,
        due_date              DATE NOT NULL,
        currency              TEXT DEFAULT 'INR',
        place_of_supply       TEXT,
        status                TEXT DEFAULT 'draft' CHECK (status IN ('draft','sent','paid','overdue','cancelled')),
        shipment_status       TEXT DEFAULT 'not_shipped' CHECK (shipment_status IN ('not_shipped','processing','shipped','delivered')),
        shipment_confirmed_at TIMESTAMP,
        subtotal              NUMERIC(12,2) DEFAULT 0,
        discount_pct          NUMERIC(5,2) DEFAULT 0,
        discount_amount       NUMERIC(12,2) DEFAULT 0,
        tax                   NUMERIC(12,2) DEFAULT 0,
        total                 NUMERIC(12,2) DEFAULT 0,
        notes                 TEXT,
        terms                 TEXT,
        created_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted_at            TIMESTAMP,
        created_by            TEXT,
        UNIQUE (org_id, id)
      )
    `);

    // ── INVOICE ITEMS ───────────────────────────────────────────
    await db.query(`
      CREATE TABLE IF NOT EXISTS invoice_items (
        id                 TEXT PRIMARY KEY,
        org_id             TEXT NOT NULL,
        invoice_id         TEXT NOT NULL,
        description        TEXT NOT NULL,
        hsn_code           TEXT,
        product_id         TEXT,
        sku                TEXT,
        vendor_id          TEXT,
        vendor_name        TEXT,
        quantity           NUMERIC(12,3) DEFAULT 1,
        unit_price         NUMERIC(12,2) DEFAULT 0,
        tax_rate           NUMERIC(5,2) DEFAULT 18,
        tax_amount         NUMERIC(12,2) DEFAULT 0,
        amount             NUMERIC(12,2) DEFAULT 0,
        sort_order         INTEGER DEFAULT 0,
        vendor_approved    BOOLEAN DEFAULT FALSE,
        vendor_approved_at TIMESTAMP,
        created_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted_at         TIMESTAMP,
        created_by         TEXT
      )
    `);

    // ── PAYMENTS ────────────────────────────────────────────────
    await db.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id         TEXT PRIMARY KEY,
        org_id     TEXT NOT NULL,
        invoice_id TEXT,
        amount     NUMERIC(12,2) NOT NULL,
        date       DATE NOT NULL,
        currency   TEXT DEFAULT 'INR',
        method     TEXT DEFAULT 'bank_transfer',
        reference  TEXT,
        notes      TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP,
        created_by TEXT
      )
    `);

    // ── EXPENSES ────────────────────────────────────────────────
    await db.query(`
      CREATE TABLE IF NOT EXISTS expenses (
        id          TEXT PRIMARY KEY,
        org_id      TEXT NOT NULL,
        description TEXT NOT NULL,
        amount      NUMERIC(12,2) NOT NULL,
        date        DATE NOT NULL,
        category    TEXT DEFAULT 'other',
        vendor_id   TEXT,
        vendor_name TEXT,
        reference   TEXT,
        currency    TEXT DEFAULT 'INR',
        gst_rate    NUMERIC(5,2) DEFAULT 0,
        notes       TEXT,
        created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted_at  TIMESTAMP,
        created_by  TEXT
      )
    `);

    // ── WARRANTY CLAIMS ─────────────────────────────────────────
    await db.query(`
      CREATE TABLE IF NOT EXISTS warranty_claims (
        id                TEXT PRIMARY KEY,
        org_id            TEXT NOT NULL,
        customer_id       TEXT NOT NULL,
        invoice_id        TEXT,
        invoice_number    TEXT,
        product_name      TEXT NOT NULL,
        model_number      TEXT,
        issue_description TEXT NOT NULL,
        proof_url         TEXT,
        storage_key       TEXT,
        status            TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','resolved')),
        notes             TEXT,
        created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted_at        TIMESTAMP,
        created_by        TEXT
      )
    `);

    // ── VENDOR DOCUMENTS ────────────────────────────────────────
    await db.query(`
      CREATE TABLE IF NOT EXISTS vendor_documents (
        id          TEXT PRIMARY KEY,
        org_id      TEXT NOT NULL,
        vendor_id   TEXT NOT NULL,
        name        TEXT NOT NULL,
        doc_type    TEXT DEFAULT 'other',
        file_url    TEXT,
        storage_key TEXT,
        file_name   TEXT,
        file_size   INTEGER,
        mime_type   TEXT,
        notes       TEXT,
        created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted_at  TIMESTAMP
      )
    `);

    // ══════════════════════════════════════════════════════════════
    // COMPOSITE UNIQUE INDEXES (for FK targets)
    // ══════════════════════════════════════════════════════════════
    await db.query(`CREATE UNIQUE INDEX IF NOT EXISTS uq_users_org_id     ON users(org_id, id)`);
    await db.query(`CREATE UNIQUE INDEX IF NOT EXISTS uq_customers_org_id ON customers(org_id, id)`);
    await db.query(`CREATE UNIQUE INDEX IF NOT EXISTS uq_vendors_org_id   ON vendors(org_id, id)`);
    await db.query(`CREATE UNIQUE INDEX IF NOT EXISTS uq_products_org_id  ON products(org_id, id)`);
    await db.query(`CREATE UNIQUE INDEX IF NOT EXISTS uq_invoices_org_id  ON invoices(org_id, id)`);

    // Business unique indexes
    await db.query(`CREATE UNIQUE INDEX IF NOT EXISTS uq_invoices_org_number   ON invoices(org_id, number)`);
    await db.query(`CREATE UNIQUE INDEX IF NOT EXISTS uq_products_org_sku      ON products(org_id, sku)`);
    await db.query(`CREATE UNIQUE INDEX IF NOT EXISTS uq_vendors_org_vendor_id ON vendors(org_id, vendor_id)`);
    await db.query(`CREATE UNIQUE INDEX IF NOT EXISTS uq_pv_org_prod_vendor    ON product_vendors(org_id, product_id, vendor_id)`);

    // ══════════════════════════════════════════════════════════════
    // FOREIGN KEYS (all composite for org-level isolation)
    // ══════════════════════════════════════════════════════════════
    const fks = [
      // organizations.created_by (deferred for circular dep)
      `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='fk_org_created_by') THEN ALTER TABLE organizations ADD CONSTRAINT fk_org_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE DEFERRABLE INITIALLY DEFERRED; END IF; END $$`,

      // users
      `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='fk_users_org') THEN ALTER TABLE users ADD CONSTRAINT fk_users_org FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE RESTRICT ON UPDATE CASCADE; END IF; END $$`,

      // sessions
      `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='fk_sessions_org') THEN ALTER TABLE sessions ADD CONSTRAINT fk_sessions_org FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$`,
      `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='fk_sessions_user') THEN ALTER TABLE sessions ADD CONSTRAINT fk_sessions_user FOREIGN KEY (org_id, user_id) REFERENCES users(org_id, id) ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$`,

      // customers
      `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='fk_customers_org') THEN ALTER TABLE customers ADD CONSTRAINT fk_customers_org FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE RESTRICT ON UPDATE CASCADE; END IF; END $$`,
      `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='fk_customers_created_by') THEN ALTER TABLE customers ADD CONSTRAINT fk_customers_created_by FOREIGN KEY (org_id, created_by) REFERENCES users(org_id, id) ON DELETE SET NULL ON UPDATE CASCADE; END IF; END $$`,

      // vendors
      `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='fk_vendors_org') THEN ALTER TABLE vendors ADD CONSTRAINT fk_vendors_org FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE RESTRICT ON UPDATE CASCADE; END IF; END $$`,
      `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='fk_vendors_created_by') THEN ALTER TABLE vendors ADD CONSTRAINT fk_vendors_created_by FOREIGN KEY (org_id, created_by) REFERENCES users(org_id, id) ON DELETE SET NULL ON UPDATE CASCADE; END IF; END $$`,

      // products
      `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='fk_products_org') THEN ALTER TABLE products ADD CONSTRAINT fk_products_org FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE RESTRICT ON UPDATE CASCADE; END IF; END $$`,
      `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='fk_products_created_by') THEN ALTER TABLE products ADD CONSTRAINT fk_products_created_by FOREIGN KEY (org_id, created_by) REFERENCES users(org_id, id) ON DELETE SET NULL ON UPDATE CASCADE; END IF; END $$`,

      // invoices
      `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='fk_invoices_org') THEN ALTER TABLE invoices ADD CONSTRAINT fk_invoices_org FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE RESTRICT ON UPDATE CASCADE; END IF; END $$`,
      `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='fk_invoices_customer') THEN ALTER TABLE invoices ADD CONSTRAINT fk_invoices_customer FOREIGN KEY (org_id, customer_id) REFERENCES customers(org_id, id) ON DELETE SET NULL ON UPDATE CASCADE; END IF; END $$`,
      `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='fk_invoices_created_by') THEN ALTER TABLE invoices ADD CONSTRAINT fk_invoices_created_by FOREIGN KEY (org_id, created_by) REFERENCES users(org_id, id) ON DELETE SET NULL ON UPDATE CASCADE; END IF; END $$`,

      // invoice_items
      `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='fk_items_org') THEN ALTER TABLE invoice_items ADD CONSTRAINT fk_items_org FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE RESTRICT ON UPDATE CASCADE; END IF; END $$`,
      `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='fk_items_invoice') THEN ALTER TABLE invoice_items ADD CONSTRAINT fk_items_invoice FOREIGN KEY (org_id, invoice_id) REFERENCES invoices(org_id, id) ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$`,
      `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='fk_items_product') THEN ALTER TABLE invoice_items ADD CONSTRAINT fk_items_product FOREIGN KEY (org_id, product_id) REFERENCES products(org_id, id) ON DELETE SET NULL ON UPDATE CASCADE; END IF; END $$`,
      `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='fk_items_vendor') THEN ALTER TABLE invoice_items ADD CONSTRAINT fk_items_vendor FOREIGN KEY (org_id, vendor_id) REFERENCES vendors(org_id, id) ON DELETE SET NULL ON UPDATE CASCADE; END IF; END $$`,
      `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='fk_items_created_by') THEN ALTER TABLE invoice_items ADD CONSTRAINT fk_items_created_by FOREIGN KEY (org_id, created_by) REFERENCES users(org_id, id) ON DELETE SET NULL ON UPDATE CASCADE; END IF; END $$`,

      // payments
      `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='fk_payments_org') THEN ALTER TABLE payments ADD CONSTRAINT fk_payments_org FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE RESTRICT ON UPDATE CASCADE; END IF; END $$`,
      `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='fk_payments_invoice') THEN ALTER TABLE payments ADD CONSTRAINT fk_payments_invoice FOREIGN KEY (org_id, invoice_id) REFERENCES invoices(org_id, id) ON DELETE SET NULL ON UPDATE CASCADE; END IF; END $$`,
      `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='fk_payments_created_by') THEN ALTER TABLE payments ADD CONSTRAINT fk_payments_created_by FOREIGN KEY (org_id, created_by) REFERENCES users(org_id, id) ON DELETE SET NULL ON UPDATE CASCADE; END IF; END $$`,

      // expenses
      `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='fk_expenses_org') THEN ALTER TABLE expenses ADD CONSTRAINT fk_expenses_org FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE RESTRICT ON UPDATE CASCADE; END IF; END $$`,
      `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='fk_expenses_vendor') THEN ALTER TABLE expenses ADD CONSTRAINT fk_expenses_vendor FOREIGN KEY (org_id, vendor_id) REFERENCES vendors(org_id, id) ON DELETE SET NULL ON UPDATE CASCADE; END IF; END $$`,
      `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='fk_expenses_created_by') THEN ALTER TABLE expenses ADD CONSTRAINT fk_expenses_created_by FOREIGN KEY (org_id, created_by) REFERENCES users(org_id, id) ON DELETE SET NULL ON UPDATE CASCADE; END IF; END $$`,

      // product_vendors
      `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='fk_pv_org') THEN ALTER TABLE product_vendors ADD CONSTRAINT fk_pv_org FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE RESTRICT ON UPDATE CASCADE; END IF; END $$`,
      `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='fk_pv_product') THEN ALTER TABLE product_vendors ADD CONSTRAINT fk_pv_product FOREIGN KEY (org_id, product_id) REFERENCES products(org_id, id) ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$`,
      `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='fk_pv_vendor') THEN ALTER TABLE product_vendors ADD CONSTRAINT fk_pv_vendor FOREIGN KEY (org_id, vendor_id) REFERENCES vendors(org_id, id) ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$`,
      `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='fk_pv_created_by') THEN ALTER TABLE product_vendors ADD CONSTRAINT fk_pv_created_by FOREIGN KEY (org_id, created_by) REFERENCES users(org_id, id) ON DELETE SET NULL ON UPDATE CASCADE; END IF; END $$`,

      // warranty_claims
      `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='fk_warranty_org') THEN ALTER TABLE warranty_claims ADD CONSTRAINT fk_warranty_org FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE RESTRICT ON UPDATE CASCADE; END IF; END $$`,
      `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='fk_warranty_customer') THEN ALTER TABLE warranty_claims ADD CONSTRAINT fk_warranty_customer FOREIGN KEY (org_id, customer_id) REFERENCES customers(org_id, id) ON DELETE RESTRICT ON UPDATE CASCADE; END IF; END $$`,
      `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='fk_warranty_invoice') THEN ALTER TABLE warranty_claims ADD CONSTRAINT fk_warranty_invoice FOREIGN KEY (org_id, invoice_id) REFERENCES invoices(org_id, id) ON DELETE SET NULL ON UPDATE CASCADE; END IF; END $$`,
      `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='fk_warranty_created_by') THEN ALTER TABLE warranty_claims ADD CONSTRAINT fk_warranty_created_by FOREIGN KEY (org_id, created_by) REFERENCES users(org_id, id) ON DELETE SET NULL ON UPDATE CASCADE; END IF; END $$`,

      // vendor_documents
      `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='fk_vdocs_org') THEN ALTER TABLE vendor_documents ADD CONSTRAINT fk_vdocs_org FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE RESTRICT ON UPDATE CASCADE; END IF; END $$`,
      `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='fk_vdocs_vendor') THEN ALTER TABLE vendor_documents ADD CONSTRAINT fk_vdocs_vendor FOREIGN KEY (org_id, vendor_id) REFERENCES vendors(org_id, id) ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$`,
    ];

    for (const fk of fks) { await db.query(fk); }

    // ══════════════════════════════════════════════════════════════
    // PERFORMANCE INDEXES
    // ══════════════════════════════════════════════════════════════
    const indexes = [
      `CREATE INDEX IF NOT EXISTS idx_users_org     ON users(org_id)`,
      `CREATE INDEX IF NOT EXISTS idx_sessions_org  ON sessions(org_id)`,
      `CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(org_id, user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_customers_org ON customers(org_id)`,
      `CREATE INDEX IF NOT EXISTS idx_vendors_org   ON vendors(org_id)`,
      `CREATE INDEX IF NOT EXISTS idx_products_org  ON products(org_id)`,
      `CREATE INDEX IF NOT EXISTS idx_invoices_org  ON invoices(org_id)`,
      `CREATE INDEX IF NOT EXISTS idx_invoices_cust ON invoices(org_id, customer_id)`,
      `CREATE INDEX IF NOT EXISTS idx_items_org     ON invoice_items(org_id)`,
      `CREATE INDEX IF NOT EXISTS idx_items_inv     ON invoice_items(org_id, invoice_id)`,
      `CREATE INDEX IF NOT EXISTS idx_items_prod    ON invoice_items(org_id, product_id)`,
      `CREATE INDEX IF NOT EXISTS idx_items_vend    ON invoice_items(org_id, vendor_id)`,
      `CREATE INDEX IF NOT EXISTS idx_payments_org  ON payments(org_id)`,
      `CREATE INDEX IF NOT EXISTS idx_payments_inv  ON payments(org_id, invoice_id)`,
      `CREATE INDEX IF NOT EXISTS idx_expenses_org  ON expenses(org_id)`,
      `CREATE INDEX IF NOT EXISTS idx_expenses_vend ON expenses(org_id, vendor_id)`,
      `CREATE INDEX IF NOT EXISTS idx_pv_product    ON product_vendors(org_id, product_id)`,
      `CREATE INDEX IF NOT EXISTS idx_pv_vendor     ON product_vendors(org_id, vendor_id)`,
      `CREATE INDEX IF NOT EXISTS idx_warranty_org  ON warranty_claims(org_id)`,
      `CREATE INDEX IF NOT EXISTS idx_warranty_cust ON warranty_claims(org_id, customer_id)`,
      `CREATE INDEX IF NOT EXISTS idx_warranty_inv  ON warranty_claims(org_id, invoice_id)`,
      `CREATE INDEX IF NOT EXISTS idx_vdocs_vendor  ON vendor_documents(org_id, vendor_id)`,
    ];
    for (const idx of indexes) { await db.query(idx); }

    // ══════════════════════════════════════════════════════════════
    // UPDATED_AT TRIGGERS
    // ══════════════════════════════════════════════════════════════
    const tables = ['organizations','users','customers','vendors','products','product_vendors','invoices','invoice_items','payments','expenses','warranty_claims','vendor_documents'];
    for (const t of tables) {
      await db.query(`DROP TRIGGER IF EXISTS trg_updated_at ON ${t}`);
      await db.query(`CREATE TRIGGER trg_updated_at BEFORE UPDATE ON ${t} FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()`);
    }

    console.log('PostgreSQL schema initialized successfully.');
  } catch (err) {
    console.error('Error initializing schema:', err);
    throw err;
  }
}

module.exports = { initSchema };
