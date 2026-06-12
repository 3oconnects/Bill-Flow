// backend/db/schema.js — Schema orchestrator (thin coordinator, ≤50 lines)
// Each domain schema lives in ./schema/<domain>.js
const db = require('./conn');
const initCore         = require('./schema/core');
const initSales        = require('./schema/sales');
const initPurchasing   = require('./schema/purchasing');
const initFinance      = require('./schema/finance');
const initInventoryExt = require('./schema/inventory_ext');

async function initSchema() {
  try {
    console.log('Initializing PostgreSQL schema…');

    // Run in dependency order — core first, then domain tables
    await initCore();
    await initSales();
    await initPurchasing();
    await initFinance();
    await initInventoryExt(); // supplementary: inventory_transactions, gst_ledger, invoice GST cols

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

    // ── Schema-drift reconciliation (C4) ──────────────────────────────────────
    // The runtime code (services/routes) references columns/tables that live only
    // in the migration files. These idempotent statements guarantee a DB built by
    // initSchema alone matches what the code expects. All use IF NOT EXISTS, so on
    // an already-migrated production DB every statement is a harmless no-op.
    // NOTE: id columns are TEXT here to match the base schema/*.js definitions. We
    // deliberately do NOT convert TEXT<->UUID on existing tables — that is a
    // breaking migration and is intentionally out of scope.
    await reconcileSalesDrift();

    console.log('✅ PostgreSQL schema initialized successfully.');
  } catch (err) {
    console.error('Schema init error:', err);
    throw err;
  }
}

// Idempotent reconciliation of Sales/Customer schema drift (see C4 above).
async function reconcileSalesDrift() {
  const stmts = [
    // invoices — GST split, payment tracking
    `ALTER TABLE invoices ADD COLUMN IF NOT EXISTS paid_amount       NUMERIC(14,2) DEFAULT 0`,
    // H2: credit notes applied to an invoice are tracked separately from cash paid,
    // so revenue/cash are not overstated. balance_due = total - paid - credited.
    `ALTER TABLE invoices ADD COLUMN IF NOT EXISTS credited_amount   NUMERIC(14,2) DEFAULT 0`,
    `ALTER TABLE invoices ADD COLUMN IF NOT EXISTS cgst              NUMERIC(14,2) DEFAULT 0`,
    `ALTER TABLE invoices ADD COLUMN IF NOT EXISTS sgst              NUMERIC(14,2) DEFAULT 0`,
    `ALTER TABLE invoices ADD COLUMN IF NOT EXISTS igst              NUMERIC(14,2) DEFAULT 0`,
    `ALTER TABLE invoices ADD COLUMN IF NOT EXISTS total_tax         NUMERIC(14,2) DEFAULT 0`,
    `ALTER TABLE invoices ADD COLUMN IF NOT EXISTS supplier_state    TEXT`,
    `ALTER TABLE invoices ADD COLUMN IF NOT EXISTS buyer_state       TEXT`,
    `ALTER TABLE invoices ADD COLUMN IF NOT EXISTS gst_type          TEXT DEFAULT 'intra'`,
    `ALTER TABLE invoices ADD COLUMN IF NOT EXISTS hsn_applicable    BOOLEAN DEFAULT TRUE`,
    `ALTER TABLE invoices ADD COLUMN IF NOT EXISTS last_payment_date TIMESTAMP`,
    // payments — allocation engine columns
    `ALTER TABLE payments ADD COLUMN IF NOT EXISTS customer_id       TEXT`,
    `ALTER TABLE payments ADD COLUMN IF NOT EXISTS allocated_amount  NUMERIC(14,2) DEFAULT 0`,
    `ALTER TABLE payments ADD COLUMN IF NOT EXISTS unapplied_amount  NUMERIC(14,2) DEFAULT 0`,
    `ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_date      DATE`,
    `ALTER TABLE payments ADD COLUMN IF NOT EXISTS status            TEXT DEFAULT 'completed'`,
    // backfill payment_date from legacy `date` column where missing
    `UPDATE payments SET payment_date = date WHERE payment_date IS NULL AND date IS NOT NULL`,
    // customers — payment tracking
    `ALTER TABLE customers ADD COLUMN IF NOT EXISTS last_payment_date TIMESTAMP`,
    // payment_allocations — referenced by paymentAllocationService
    `CREATE TABLE IF NOT EXISTS payment_allocations (
       id TEXT PRIMARY KEY,
       payment_id TEXT NOT NULL,
       invoice_id TEXT NOT NULL,
       amount NUMERIC(14,2) NOT NULL,
       notes TEXT,
       created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
     )`,
    `CREATE INDEX IF NOT EXISTS idx_payalloc_payment ON payment_allocations(payment_id)`,
    `CREATE INDEX IF NOT EXISTS idx_payalloc_invoice ON payment_allocations(invoice_id)`,
  ];
  for (const q of stmts) {
    await db.query(q).catch((e) => console.warn('[reconcileSalesDrift]', e.message));
  }

  // Legacy payment backfill: pre-allocation-engine payments stored an invoice_id
  // directly but no payment_allocations row and allocated/unapplied = 0. Create the
  // missing allocation so they are tracked/reversible like new payments.
  await db.query(`
    INSERT INTO payment_allocations (id, payment_id, invoice_id, amount, notes, created_at)
    SELECT gen_random_uuid()::text, p.id, p.invoice_id, p.amount,
           'Backfilled from legacy direct payment', NOW()
      FROM payments p
     WHERE p.deleted_at IS NULL
       AND p.invoice_id IS NOT NULL
       AND COALESCE(p.status,'completed') <> 'reversed'
       AND NOT EXISTS (SELECT 1 FROM payment_allocations pa WHERE pa.payment_id = p.id)
       AND ROUND(COALESCE(p.allocated_amount,0)+COALESCE(p.unapplied_amount,0),2) <> ROUND(p.amount,2)
  `).catch((e) => console.warn('[reconcileSalesDrift:legacy_alloc_backfill]', e.message));

  // Repair the allocated/unapplied split to satisfy allocated + unapplied = amount.
  await db.query(`
    UPDATE payments p
       SET allocated_amount = COALESCE(s.s,0),
           unapplied_amount = GREATEST(0, p.amount - COALESCE(s.s,0)),
           updated_at = NOW()
      FROM (SELECT payment_id, SUM(amount) AS s FROM payment_allocations GROUP BY payment_id) s
     WHERE s.payment_id = p.id
       AND ROUND(COALESCE(p.allocated_amount,0)+COALESCE(p.unapplied_amount,0),2) <> ROUND(p.amount,2)
  `).catch((e) => console.warn('[reconcileSalesDrift:payment_split_alloc]', e.message));

  // Payments with no allocations are pure advances — full amount is unapplied.
  await db.query(`
    UPDATE payments
       SET unapplied_amount = amount, allocated_amount = 0, updated_at = NOW()
     WHERE deleted_at IS NULL
       AND NOT EXISTS (SELECT 1 FROM payment_allocations pa WHERE pa.payment_id = payments.id)
       AND ROUND(COALESCE(allocated_amount,0)+COALESCE(unapplied_amount,0),2) <> ROUND(amount,2)
  `).catch((e) => console.warn('[reconcileSalesDrift:payment_split_advance]', e.message));

  // Payment reconciliation: bring each invoice's paid_amount in line with the sum
  // of its payment_allocations (the authoritative record; reversed payments have
  // their allocations deleted). Only invoices that HAVE allocations are touched, so
  // legacy/manually-set paid_amounts without allocations are left intact.
  await db.query(`
    UPDATE invoices i
       SET paid_amount = a.s, updated_at = NOW()
      FROM (SELECT invoice_id, SUM(amount) AS s FROM payment_allocations GROUP BY invoice_id) a
     WHERE i.id = a.invoice_id
       AND i.paid_amount IS DISTINCT FROM a.s
  `).catch((e) => console.warn('[reconcileSalesDrift:paid_reconcile]', e.message));

  // Normalize status to 'paid' for any fully-settled invoice (paid + credited >= total).
  await db.query(`
    UPDATE invoices
       SET status = 'paid', updated_at = NOW()
     WHERE deleted_at IS NULL
       AND status NOT IN ('draft','cancelled','paid')
       AND total > 0
       AND (COALESCE(paid_amount,0) + COALESCE(credited_amount,0)) >= total
  `).catch((e) => console.warn('[reconcileSalesDrift:status_normalize]', e.message));

  // H4 backfill: correct any historical customer outstanding drift by recomputing
  // from the invoice ledger. Set-based and idempotent — only rows that are actually
  // wrong are rewritten (IS DISTINCT FROM), so repeated boots are cheap.
  await db.query(`
    UPDATE customers c
       SET outstanding = sub.bal, updated_at = NOW()
      FROM (
        SELECT c2.id,
               COALESCE(SUM(i.total - COALESCE(i.paid_amount, 0) - COALESCE(i.credited_amount, 0)), 0) AS bal
          FROM customers c2
          LEFT JOIN invoices i
            ON i.customer_id = c2.id AND i.org_id = c2.org_id
           AND i.deleted_at IS NULL AND i.status NOT IN ('draft', 'cancelled')
         GROUP BY c2.id
      ) sub
     WHERE c.id = sub.id
       AND c.outstanding IS DISTINCT FROM sub.bal
  `).catch((e) => console.warn('[reconcileSalesDrift:outstanding_backfill]', e.message));

  // invoice.status CHECK must allow 'partially_paid' (base schema omits it).
  // Guarded so it is safe to run repeatedly and on already-fixed DBs.
  await db.query(`
    DO $$
    BEGIN
      IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'invoices_status_check') THEN
        ALTER TABLE invoices DROP CONSTRAINT invoices_status_check;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_invoices_status') THEN
        ALTER TABLE invoices ADD CONSTRAINT chk_invoices_status
          CHECK (status IN ('draft','sent','paid','partially_paid','overdue','cancelled'));
      END IF;
    END $$;
  `).catch((e) => console.warn('[reconcileSalesDrift:status_check]', e.message));
}

module.exports = { initSchema };
