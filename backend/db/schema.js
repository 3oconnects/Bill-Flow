// backend/db/schema.js — Schema orchestrator (thin coordinator, ≤50 lines)
// Each domain schema lives in ./schema/<domain>.js
const db = require('./conn');
const initCore       = require('./schema/core');
const initSales      = require('./schema/sales');
const initPurchasing = require('./schema/purchasing');
const initFinance    = require('./schema/finance');

async function initSchema() {
  try {
    console.log('Initializing PostgreSQL schema…');

    // Run in dependency order — core first, then domain tables
    await initCore();
    await initSales();
    await initPurchasing();
    await initFinance();

    // Updated-at triggers for mutable tables
    const triggerTables = [
      'organizations','users','customers','vendors','products','product_vendors',
      'invoices','invoice_items','payments','expenses','warranty_claims',
      'vendor_documents','goods_returns',
      'ap_down_payments','ap_invoices','ap_credit_memos','ap_reserve_invoices',
    ];
    for (const t of triggerTables) {
      await db.query(`DROP TRIGGER IF EXISTS trg_updated_at ON ${t}`);
      await db.query(
        `CREATE TRIGGER trg_updated_at BEFORE UPDATE ON ${t}
         FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()`
      );
    }

    // Composite unique indexes for FK targets
    const uniq = [
      `CREATE UNIQUE INDEX IF NOT EXISTS uq_users_org_id     ON users(org_id, id)`,
      `CREATE UNIQUE INDEX IF NOT EXISTS uq_customers_org_id ON customers(org_id, id)`,
      `CREATE UNIQUE INDEX IF NOT EXISTS uq_vendors_org_id   ON vendors(org_id, id)`,
      `CREATE UNIQUE INDEX IF NOT EXISTS uq_products_org_id  ON products(org_id, id)`,
      `CREATE UNIQUE INDEX IF NOT EXISTS uq_invoices_org_id  ON invoices(org_id, id)`,
      `CREATE UNIQUE INDEX IF NOT EXISTS uq_invoices_org_no  ON invoices(org_id, number)`,
      `CREATE UNIQUE INDEX IF NOT EXISTS uq_products_org_sku ON products(org_id, sku)`,
    ];
    for (const q of uniq) await db.query(q).catch(() => {}); // ignore if exists

    console.log('✅ PostgreSQL schema initialized successfully.');
  } catch (err) {
    console.error('Schema init error:', err);
    throw err;
  }
}

module.exports = { initSchema };
