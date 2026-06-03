// schema/sales.js — Sales & Customer tables
const db = require('../conn');
module.exports = async function schemaSalesInit() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY, org_id TEXT NOT NULL, name TEXT NOT NULL,
      email TEXT, phone TEXT, address TEXT, city TEXT, state TEXT,
      country TEXT DEFAULT 'India', pincode TEXT, gstin TEXT, pan TEXT,
      currency TEXT DEFAULT 'INR', credit_limit NUMERIC(12,2) DEFAULT 0,
      notes TEXT, outstanding NUMERIC(12,2) DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      deleted_at TIMESTAMP, created_by TEXT, UNIQUE (org_id, id)
    )
  `);
  await db.query(`
    CREATE TABLE IF NOT EXISTS invoices (
      id TEXT PRIMARY KEY, org_id TEXT NOT NULL, number TEXT NOT NULL,
      customer_id TEXT, customer_name TEXT NOT NULL,
      customer_phone TEXT, customer_email TEXT,
      date DATE NOT NULL, due_date DATE NOT NULL, currency TEXT DEFAULT 'INR',
      place_of_supply TEXT,
      status TEXT DEFAULT 'draft' CHECK (status IN ('draft','sent','paid','overdue','cancelled')),
      shipment_status TEXT DEFAULT 'not_shipped'
        CHECK (shipment_status IN ('not_shipped','processing','shipped','delivered')),
      shipment_confirmed_at TIMESTAMP,
      subtotal NUMERIC(12,2) DEFAULT 0, discount_pct NUMERIC(5,2) DEFAULT 0,
      discount_amount NUMERIC(12,2) DEFAULT 0, tax NUMERIC(12,2) DEFAULT 0,
      total NUMERIC(12,2) DEFAULT 0, notes TEXT, terms TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      deleted_at TIMESTAMP, created_by TEXT, UNIQUE (org_id, id)
    )
  `);
  await db.query(`
    CREATE TABLE IF NOT EXISTS invoice_items (
      id TEXT PRIMARY KEY, org_id TEXT NOT NULL, invoice_id TEXT NOT NULL,
      description TEXT NOT NULL, hsn_code TEXT, product_id TEXT, sku TEXT,
      vendor_id TEXT, vendor_name TEXT,
      quantity NUMERIC(12,3) DEFAULT 1, unit_price NUMERIC(12,2) DEFAULT 0,
      tax_rate NUMERIC(5,2) DEFAULT 18, tax_amount NUMERIC(12,2) DEFAULT 0,
      amount NUMERIC(12,2) DEFAULT 0, sort_order INTEGER DEFAULT 0,
      vendor_approved BOOLEAN DEFAULT FALSE, vendor_approved_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      deleted_at TIMESTAMP, created_by TEXT
    )
  `);
  await db.query(`
    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY, org_id TEXT NOT NULL, invoice_id TEXT,
      amount NUMERIC(12,2) NOT NULL, date DATE NOT NULL,
      currency TEXT DEFAULT 'INR', method TEXT DEFAULT 'bank_transfer',
      reference TEXT, notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      deleted_at TIMESTAMP, created_by TEXT
    )
  `);
  await db.query(`
    CREATE TABLE IF NOT EXISTS warranty_claims (
      id TEXT PRIMARY KEY, org_id TEXT NOT NULL, customer_id TEXT NOT NULL,
      invoice_id TEXT, invoice_number TEXT, product_name TEXT NOT NULL,
      model_number TEXT, issue_description TEXT NOT NULL,
      proof_url TEXT, storage_key TEXT,
      status TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','resolved')),
      notes TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      deleted_at TIMESTAMP, created_by TEXT, UNIQUE (org_id, id)
    )
  `);
  await db.query(`
    CREATE TABLE IF NOT EXISTS quotations (
      id TEXT PRIMARY KEY, org_id TEXT NOT NULL, number TEXT NOT NULL,
      customer_id TEXT, customer_name TEXT NOT NULL,
      customer_email TEXT, customer_phone TEXT, salesperson TEXT,
      status TEXT DEFAULT 'draft'
        CHECK (status IN ('draft','sent','viewed','negotiation','approved','rejected','converted','expired')),
      subtotal NUMERIC(12,2) DEFAULT 0, discount_pct NUMERIC(5,2) DEFAULT 0,
      discount_amount NUMERIC(12,2) DEFAULT 0, tax NUMERIC(12,2) DEFAULT 0,
      total NUMERIC(12,2) DEFAULT 0, currency TEXT DEFAULT 'INR',
      valid_until DATE, notes TEXT, terms TEXT,
      win_probability INTEGER DEFAULT 50, version INTEGER DEFAULT 1,
      converted_to TEXT, items JSONB DEFAULT '[]', created_by TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      deleted_at TIMESTAMP, UNIQUE (org_id, number)
    )
  `);
  await db.query(`
    CREATE TABLE IF NOT EXISTS credit_notes (
      id TEXT PRIMARY KEY, org_id TEXT NOT NULL, number TEXT NOT NULL,
      customer_id TEXT, customer_name TEXT NOT NULL,
      invoice_id TEXT, invoice_number TEXT,
      status TEXT DEFAULT 'draft'
        CHECK (status IN ('draft','pending_review','approved','applied','closed','rejected')),
      reason TEXT DEFAULT 'other'
        CHECK (reason IN ('damaged_product','wrong_product','pricing_error','service_issue','cancellation','quality_problem','other')),
      amount NUMERIC(12,2) DEFAULT 0, tax NUMERIC(12,2) DEFAULT 0,
      total NUMERIC(12,2) DEFAULT 0, currency TEXT DEFAULT 'INR',
      items JSONB DEFAULT '[]', notes TEXT,
      approved_by TEXT, approved_at TIMESTAMP, applied_at TIMESTAMP,
      created_by TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      deleted_at TIMESTAMP, UNIQUE (org_id, number)
    )
  `);
  // Indexes
  await db.query(`CREATE INDEX IF NOT EXISTS idx_inv_org    ON invoices(org_id)`);
  await db.query(`CREATE INDEX IF NOT EXISTS idx_inv_cust   ON invoices(org_id, customer_id)`);
  await db.query(`CREATE INDEX IF NOT EXISTS idx_pay_org    ON payments(org_id)`);
  await db.query(`CREATE INDEX IF NOT EXISTS idx_quot_org   ON quotations(org_id)`);
  await db.query(`CREATE INDEX IF NOT EXISTS idx_cn_org     ON credit_notes(org_id)`);
};
