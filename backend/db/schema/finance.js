// schema/finance.js — Expenses, AP tables, Audit logs, Recurring, Quotations, Credit Notes
const db = require('../conn');
module.exports = async function schemaFinanceInit() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY, org_id TEXT NOT NULL, description TEXT NOT NULL,
      amount NUMERIC(12,2) NOT NULL, date DATE NOT NULL,
      category TEXT DEFAULT 'other', vendor_id TEXT, vendor_name TEXT,
      reference TEXT, currency TEXT DEFAULT 'INR', gst_rate NUMERIC(5,2) DEFAULT 0, notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      deleted_at TIMESTAMP, created_by TEXT
    )
  `);
  await db.query(`
    CREATE TABLE IF NOT EXISTS ap_down_payments (
      id TEXT PRIMARY KEY, org_id TEXT NOT NULL, doc_no TEXT NOT NULL,
      vendor_id TEXT, vendor_name TEXT NOT NULL, vendor_gstin TEXT, po_ref TEXT,
      payment_date DATE NOT NULL, due_date DATE, currency TEXT DEFAULT 'INR',
      payment_terms TEXT, amount NUMERIC(12,2) DEFAULT 0, pct_amount NUMERIC(5,2),
      tax_rate NUMERIC(5,2) DEFAULT 18, tax_amount NUMERIC(12,2) DEFAULT 0,
      total_amount NUMERIC(12,2) DEFAULT 0, paid_amount NUMERIC(12,2) DEFAULT 0,
      status TEXT DEFAULT 'draft' CHECK (status IN ('draft','approved','paid','closed','cancelled')),
      notes TEXT, approved_by TEXT, approved_at TIMESTAMP, paid_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      deleted_at TIMESTAMP, created_by TEXT, UNIQUE (org_id, doc_no)
    )
  `);
  await db.query(`
    CREATE TABLE IF NOT EXISTS ap_invoices (
      id TEXT PRIMARY KEY, org_id TEXT NOT NULL, doc_no TEXT NOT NULL,
      vendor_id TEXT, vendor_name TEXT NOT NULL, vendor_gstin TEXT,
      vendor_inv_no TEXT, po_ref TEXT, gr_ref TEXT,
      invoice_date DATE NOT NULL, posting_date DATE, due_date DATE,
      currency TEXT DEFAULT 'INR', payment_terms TEXT,
      subtotal NUMERIC(12,2) DEFAULT 0, discount_pct NUMERIC(5,2) DEFAULT 0,
      discount_amount NUMERIC(12,2) DEFAULT 0, tax_amount NUMERIC(12,2) DEFAULT 0,
      total_amount NUMERIC(12,2) DEFAULT 0, paid_amount NUMERIC(12,2) DEFAULT 0,
      status TEXT DEFAULT 'draft'
        CHECK (status IN ('draft','submitted','approved','partially_paid','paid','closed','cancelled')),
      notes TEXT, approved_by TEXT, approved_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      deleted_at TIMESTAMP, created_by TEXT, UNIQUE (org_id, doc_no)
    )
  `);
  await db.query(`
    CREATE TABLE IF NOT EXISTS ap_invoice_items (
      id TEXT PRIMARY KEY, org_id TEXT NOT NULL, invoice_id TEXT NOT NULL,
      product_id TEXT, item_code TEXT, item_name TEXT NOT NULL, description TEXT,
      quantity NUMERIC(12,3) DEFAULT 1, unit_price NUMERIC(12,2) DEFAULT 0,
      discount NUMERIC(5,2) DEFAULT 0, tax_rate NUMERIC(5,2) DEFAULT 18,
      tax_amount NUMERIC(12,2) DEFAULT 0, line_total NUMERIC(12,2) DEFAULT 0,
      sort_order INTEGER DEFAULT 0, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await db.query(`
    CREATE TABLE IF NOT EXISTS ap_credit_memos (
      id TEXT PRIMARY KEY, org_id TEXT NOT NULL, doc_no TEXT NOT NULL,
      vendor_id TEXT, vendor_name TEXT NOT NULL, vendor_gstin TEXT,
      ref_invoice_id TEXT, ref_invoice_no TEXT, credit_date DATE NOT NULL,
      posting_date DATE, currency TEXT DEFAULT 'INR', reason TEXT DEFAULT 'Return Goods',
      subtotal NUMERIC(12,2) DEFAULT 0, discount_amount NUMERIC(12,2) DEFAULT 0,
      tax_amount NUMERIC(12,2) DEFAULT 0, total_amount NUMERIC(12,2) DEFAULT 0,
      applied_amount NUMERIC(12,2) DEFAULT 0,
      status TEXT DEFAULT 'draft'
        CHECK (status IN ('draft','pending_approval','approved','applied','closed','cancelled')),
      notes TEXT, approved_by TEXT, approved_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      deleted_at TIMESTAMP, created_by TEXT, UNIQUE (org_id, doc_no)
    )
  `);
  await db.query(`
    CREATE TABLE IF NOT EXISTS ap_credit_memo_items (
      id TEXT PRIMARY KEY, org_id TEXT NOT NULL, memo_id TEXT NOT NULL,
      product_id TEXT, item_code TEXT, item_name TEXT NOT NULL, description TEXT,
      quantity NUMERIC(12,3) DEFAULT 1, unit_price NUMERIC(12,2) DEFAULT 0,
      discount NUMERIC(5,2) DEFAULT 0, tax_rate NUMERIC(5,2) DEFAULT 18,
      tax_amount NUMERIC(12,2) DEFAULT 0, line_total NUMERIC(12,2) DEFAULT 0,
      sort_order INTEGER DEFAULT 0, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await db.query(`
    CREATE TABLE IF NOT EXISTS ap_reserve_invoices (
      id TEXT PRIMARY KEY, org_id TEXT NOT NULL, doc_no TEXT NOT NULL,
      vendor_id TEXT, vendor_name TEXT NOT NULL, vendor_gstin TEXT,
      vendor_ref_no TEXT, po_ref TEXT, gr_ref TEXT,
      invoice_date DATE NOT NULL, posting_date DATE, due_date DATE,
      currency TEXT DEFAULT 'INR', department TEXT, cost_center TEXT,
      project TEXT, payment_terms TEXT, description TEXT,
      subtotal NUMERIC(12,2) DEFAULT 0, discount_amount NUMERIC(12,2) DEFAULT 0,
      tax_amount NUMERIC(12,2) DEFAULT 0, total_amount NUMERIC(12,2) DEFAULT 0,
      converted_to_id TEXT,
      status TEXT DEFAULT 'draft'
        CHECK (status IN ('draft','submitted','approved','reserved','converted','closed','cancelled')),
      notes TEXT, approved_by TEXT, approved_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      deleted_at TIMESTAMP, created_by TEXT, UNIQUE (org_id, doc_no)
    )
  `);
  await db.query(`
    CREATE TABLE IF NOT EXISTS ap_reserve_invoice_items (
      id TEXT PRIMARY KEY, org_id TEXT NOT NULL, reserve_id TEXT NOT NULL,
      product_id TEXT, item_code TEXT, item_name TEXT NOT NULL, description TEXT,
      quantity NUMERIC(12,3) DEFAULT 1, unit_price NUMERIC(12,2) DEFAULT 0,
      discount NUMERIC(5,2) DEFAULT 0, tax_rate NUMERIC(5,2) DEFAULT 18,
      tax_amount NUMERIC(12,2) DEFAULT 0, total_amount NUMERIC(12,2) DEFAULT 0,
      sort_order INTEGER DEFAULT 0, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await db.query(`
    CREATE TABLE IF NOT EXISTS ap_activity_logs (
      id TEXT PRIMARY KEY, org_id TEXT NOT NULL, doc_type TEXT NOT NULL,
      doc_id TEXT NOT NULL, action TEXT NOT NULL, old_status TEXT, new_status TEXT,
      note TEXT, created_by TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await db.query(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY, org_id TEXT NOT NULL, user_id TEXT NOT NULL,
      action TEXT NOT NULL CHECK (action IN ('CREATE','UPDATE','DELETE')),
      entity_type TEXT NOT NULL, entity_id TEXT NOT NULL,
      old_values JSONB, new_values JSONB, ip_address TEXT, user_agent TEXT,
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (org_id) REFERENCES organizations(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);
  await db.query(`
    CREATE TABLE IF NOT EXISTS recurring_invoices (
      id TEXT PRIMARY KEY, org_id TEXT NOT NULL, name TEXT NOT NULL,
      customer_id TEXT, customer_name TEXT,
      frequency TEXT NOT NULL CHECK (frequency IN ('daily','weekly','bimonthly','monthly','quarterly','biannual','yearly')),
      amount NUMERIC(12,2) DEFAULT 0, currency TEXT DEFAULT 'INR',
      next_run DATE, auto_send BOOLEAN DEFAULT FALSE,
      status TEXT DEFAULT 'active' CHECK (status IN ('active','paused','draft')),
      template_data JSONB DEFAULT '{}', created_by TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, deleted_at TIMESTAMP
    )
  `);
  await db.query(`
    CREATE TABLE IF NOT EXISTS purchase_templates (
      id TEXT PRIMARY KEY, org_id TEXT NOT NULL, name TEXT NOT NULL,
      vendor_id TEXT, vendor_name TEXT,
      frequency TEXT NOT NULL CHECK (frequency IN ('daily','weekly','bimonthly','monthly','quarterly','biannual','yearly')),
      amount NUMERIC(12,2) DEFAULT 0, currency TEXT DEFAULT 'INR',
      next_run DATE, status TEXT DEFAULT 'active' CHECK (status IN ('active','paused','draft')),
      template_data JSONB DEFAULT '{}', created_by TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, deleted_at TIMESTAMP
    )
  `);
  // Indexes
  const idxs = [
    `CREATE INDEX IF NOT EXISTS idx_expenses_org   ON expenses(org_id)`,
    `CREATE INDEX IF NOT EXISTS idx_ap_dp_org      ON ap_down_payments(org_id)`,
    `CREATE INDEX IF NOT EXISTS idx_ap_inv_org     ON ap_invoices(org_id)`,
    `CREATE INDEX IF NOT EXISTS idx_ap_ii_inv      ON ap_invoice_items(invoice_id)`,
    `CREATE INDEX IF NOT EXISTS idx_ap_cm_org      ON ap_credit_memos(org_id)`,
    `CREATE INDEX IF NOT EXISTS idx_ap_cmi_memo    ON ap_credit_memo_items(memo_id)`,
    `CREATE INDEX IF NOT EXISTS idx_ap_ri_org      ON ap_reserve_invoices(org_id)`,
    `CREATE INDEX IF NOT EXISTS idx_ap_rii_res     ON ap_reserve_invoice_items(reserve_id)`,
    `CREATE INDEX IF NOT EXISTS idx_ap_log_doc     ON ap_activity_logs(doc_type, doc_id)`,
    `CREATE INDEX IF NOT EXISTS idx_audit_org      ON audit_logs(org_id)`,
    `CREATE INDEX IF NOT EXISTS idx_rec_inv_org    ON recurring_invoices(org_id)`,
    `CREATE INDEX IF NOT EXISTS idx_pur_tpl_org    ON purchase_templates(org_id)`,
  ];
  for (const i of idxs) await db.query(i);
};
