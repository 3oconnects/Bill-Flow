// schema/inventory_ext.js
// Boot-time supplementary schema for tables/columns referenced by
// InventoryTransactionService, GSTLedger, and payment allocation flows
// but not present in the original sales/purchasing schema files.
//
// All statements are idempotent (CREATE TABLE IF NOT EXISTS / ALTER TABLE
// ADD COLUMN IF NOT EXISTS) so this runs safely on every boot.
const db = require('../conn');

module.exports = async function schemaInventoryExtInit() {
  // ── Inventory transactions (sale/return/adjustment audit trail) ─────────────
  await db.query(`
    CREATE TABLE IF NOT EXISTS inventory_transactions (
      id               TEXT PRIMARY KEY,
      org_id           TEXT NOT NULL,
      product_id       TEXT NOT NULL,
      transaction_type TEXT NOT NULL,
      reference_type   TEXT,
      reference_id     TEXT,
      quantity         NUMERIC(14,3) NOT NULL,
      unit_cost        NUMERIC(14,2) DEFAULT 0,
      total_cost       NUMERIC(14,2) DEFAULT 0,
      note             TEXT,
      created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await db.query(`CREATE INDEX IF NOT EXISTS idx_inv_tx_org_product ON inventory_transactions(org_id, product_id)`);
  await db.query(`CREATE INDEX IF NOT EXISTS idx_inv_tx_reference   ON inventory_transactions(reference_type, reference_id)`);

  // ── Inventory alerts (low-stock triggers) ───────────────────────────────────
  await db.query(`
    CREATE TABLE IF NOT EXISTS inventory_alerts (
      id            TEXT PRIMARY KEY,
      org_id        TEXT NOT NULL,
      product_id    TEXT NOT NULL,
      alert_type    TEXT NOT NULL DEFAULT 'low_stock',
      current_stock NUMERIC(14,3),
      threshold     NUMERIC(14,3),
      triggered_by  TEXT,
      status        TEXT NOT NULL DEFAULT 'active',
      created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await db.query(`CREATE INDEX IF NOT EXISTS idx_inv_alerts_org_status ON inventory_alerts(org_id, status)`);

  // ── GST ledger (per-invoice GST posting) ───────────────────────────────────
  await db.query(`
    CREATE TABLE IF NOT EXISTS gst_ledger (
      id               TEXT PRIMARY KEY,
      org_id           TEXT NOT NULL,
      invoice_id       TEXT,
      transaction_type TEXT NOT NULL,
      cgst_amount      NUMERIC(14,2) DEFAULT 0,
      sgst_amount      NUMERIC(14,2) DEFAULT 0,
      igst_amount      NUMERIC(14,2) DEFAULT 0,
      month            INTEGER,
      year             INTEGER,
      created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await db.query(`CREATE INDEX IF NOT EXISTS idx_gst_ledger_org_period ON gst_ledger(org_id, year, month)`);

  // ── Vendor payments ─────────────────────────────────────────────────────────
  await db.query(`
    CREATE TABLE IF NOT EXISTS vendor_payments (
      id              TEXT PRIMARY KEY,
      org_id          TEXT NOT NULL,
      vendor_id       TEXT,
      vendor_name     TEXT,
      ap_invoice_id   TEXT,
      ap_invoice_no   TEXT,
      amount          NUMERIC(14,2) NOT NULL,
      date            DATE NOT NULL,
      currency        TEXT DEFAULT 'INR',
      method          TEXT DEFAULT 'bank_transfer',
      reference       TEXT,
      notes           TEXT,
      created_by      TEXT,
      created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      deleted_at      TIMESTAMP
    )
  `);
  await db.query(`CREATE INDEX IF NOT EXISTS idx_vp_org      ON vendor_payments(org_id)`);
  await db.query(`CREATE INDEX IF NOT EXISTS idx_vp_vendor   ON vendor_payments(org_id, vendor_id)`);
  await db.query(`CREATE INDEX IF NOT EXISTS idx_vp_apinv    ON vendor_payments(ap_invoice_id)`);

  // ── Recurring billing: end_date + run-history table ─────────────────────────
  await db.query(`ALTER TABLE recurring_invoices  ADD COLUMN IF NOT EXISTS end_date DATE`);
  await db.query(`ALTER TABLE recurring_invoices  ADD COLUMN IF NOT EXISTS last_run DATE`);
  await db.query(`ALTER TABLE purchase_templates  ADD COLUMN IF NOT EXISTS end_date DATE`);
  await db.query(`ALTER TABLE purchase_templates  ADD COLUMN IF NOT EXISTS last_run DATE`);

  await db.query(`
    CREATE TABLE IF NOT EXISTS recurring_runs (
      id            TEXT PRIMARY KEY,
      org_id        TEXT NOT NULL,
      template_type TEXT NOT NULL CHECK (template_type IN ('invoice','purchase')),
      template_id   TEXT NOT NULL,
      generated_id  TEXT,          -- id of the spawned invoice (if any)
      run_date      DATE NOT NULL,
      status        TEXT NOT NULL DEFAULT 'success'
                    CHECK (status IN ('success','failed','skipped')),
      error_message TEXT,
      created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await db.query(`CREATE INDEX IF NOT EXISTS idx_rec_runs_template ON recurring_runs(template_type, template_id, run_date DESC)`);
  await db.query(`CREATE INDEX IF NOT EXISTS idx_rec_runs_org      ON recurring_runs(org_id, run_date DESC)`);

  // ── Invoices: GST + state + paid-tracking columns ──────────────────────────
  const invoiceCols = [
    `ALTER TABLE invoices ADD COLUMN IF NOT EXISTS supplier_state TEXT`,
    `ALTER TABLE invoices ADD COLUMN IF NOT EXISTS buyer_state    TEXT`,
    `ALTER TABLE invoices ADD COLUMN IF NOT EXISTS cgst           NUMERIC(14,2) DEFAULT 0`,
    `ALTER TABLE invoices ADD COLUMN IF NOT EXISTS sgst           NUMERIC(14,2) DEFAULT 0`,
    `ALTER TABLE invoices ADD COLUMN IF NOT EXISTS igst           NUMERIC(14,2) DEFAULT 0`,
    `ALTER TABLE invoices ADD COLUMN IF NOT EXISTS total_tax      NUMERIC(14,2) DEFAULT 0`,
    `ALTER TABLE invoices ADD COLUMN IF NOT EXISTS gst_type       TEXT          DEFAULT 'intra'`,
    `ALTER TABLE invoices ADD COLUMN IF NOT EXISTS hsn_applicable BOOLEAN       DEFAULT TRUE`,
    `ALTER TABLE invoices ADD COLUMN IF NOT EXISTS paid_amount    NUMERIC(14,2) DEFAULT 0`,
    `ALTER TABLE invoices ADD COLUMN IF NOT EXISTS credited_amount NUMERIC(14,2) DEFAULT 0`,
    `ALTER TABLE invoices ADD COLUMN IF NOT EXISTS last_payment_date TIMESTAMP`,
  ];
  for (const sql of invoiceCols) await db.query(sql);
};
