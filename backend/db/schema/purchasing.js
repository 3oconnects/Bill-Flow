// schema/purchasing.js — Vendors, Products, Goods Returns
const db = require('../conn');
module.exports = async function schemaPurchasingInit() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS vendors (
      id TEXT PRIMARY KEY, org_id TEXT NOT NULL, name TEXT NOT NULL,
      email TEXT, phone TEXT, address TEXT, gstin TEXT, pan TEXT,
      bank_account TEXT, ifsc TEXT, notes TEXT, vendor_id TEXT,
      company_name TEXT, contact_person TEXT, street TEXT, city TEXT,
      state TEXT, pincode TEXT, country TEXT DEFAULT 'India',
      bank_name TEXT, bank_branch TEXT,
      status TEXT DEFAULT 'active' CHECK (status IN ('active','inactive','blocked')),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      deleted_at TIMESTAMP, created_by TEXT, UNIQUE (org_id, id)
    )
  `);
  await db.query(`
    CREATE TABLE IF NOT EXISTS vendor_documents (
      id TEXT PRIMARY KEY, org_id TEXT NOT NULL, vendor_id TEXT NOT NULL,
      name TEXT NOT NULL, doc_type TEXT DEFAULT 'other',
      file_url TEXT, storage_key TEXT, file_name TEXT, file_size INTEGER,
      mime_type TEXT, notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, deleted_at TIMESTAMP
    )
  `);
  await db.query(`
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY, org_id TEXT NOT NULL, unique_id TEXT, name TEXT NOT NULL,
      sku TEXT, hsn_code TEXT, description TEXT, category TEXT DEFAULT 'general',
      unit TEXT DEFAULT 'pcs', unit_price NUMERIC(12,2) DEFAULT 0,
      purchase_price NUMERIC(12,2) DEFAULT 0, tax_rate NUMERIC(5,2) DEFAULT 18,
      stock_qty NUMERIC(12,3) DEFAULT 0, low_stock_alert NUMERIC(12,3) DEFAULT 5,
      image_url TEXT, brand TEXT, model_number TEXT,
      warranty_type TEXT DEFAULT 'none', warranty_duration INTEGER DEFAULT 0,
      warranty_unit TEXT DEFAULT 'months', warranty_terms TEXT,
      guarantee_type TEXT DEFAULT 'none', guarantee_duration INTEGER DEFAULT 0,
      guarantee_unit TEXT DEFAULT 'days', guarantee_terms TEXT,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      deleted_at TIMESTAMP, created_by TEXT, UNIQUE (org_id, id)
    )
  `);
  await db.query(`
    CREATE TABLE IF NOT EXISTS product_vendors (
      id TEXT PRIMARY KEY, org_id TEXT NOT NULL, product_id TEXT NOT NULL,
      vendor_id TEXT NOT NULL, supply_price NUMERIC(12,2) DEFAULT 0,
      is_primary BOOLEAN DEFAULT FALSE, notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      deleted_at TIMESTAMP, created_by TEXT
    )
  `);
  await db.query(`
    CREATE TABLE IF NOT EXISTS goods_returns (
      id TEXT PRIMARY KEY, org_id TEXT NOT NULL, return_no TEXT NOT NULL,
      vendor_id TEXT, vendor_name TEXT NOT NULL, vendor_gstin TEXT,
      base_receipt_no TEXT, return_date DATE NOT NULL,
      warehouse TEXT DEFAULT 'Main Warehouse',
      status TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft','submitted','approved','returned','closed','cancelled')),
      transport_carrier TEXT, transport_doc_no TEXT, transport_remarks TEXT,
      subtotal NUMERIC(12,2) DEFAULT 0, tax_amount NUMERIC(12,2) DEFAULT 0,
      total_amount NUMERIC(12,2) DEFAULT 0, credit_note_no TEXT,
      credit_note_date DATE, ap_adjusted BOOLEAN DEFAULT FALSE,
      stock_adjusted BOOLEAN DEFAULT FALSE, remarks TEXT,
      approved_by TEXT, approved_at TIMESTAMP, returned_at TIMESTAMP, closed_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      deleted_at TIMESTAMP, created_by TEXT, UNIQUE (org_id, return_no)
    )
  `);
  await db.query(`
    CREATE TABLE IF NOT EXISTS goods_return_items (
      id TEXT PRIMARY KEY, org_id TEXT NOT NULL, return_id TEXT NOT NULL,
      product_id TEXT, item_code TEXT, item_name TEXT NOT NULL, batch_no TEXT,
      qty_returned NUMERIC(12,3) NOT NULL DEFAULT 1, unit_price NUMERIC(12,2) DEFAULT 0,
      tax_rate NUMERIC(5,2) DEFAULT 18, tax_amount NUMERIC(12,2) DEFAULT 0,
      return_amount NUMERIC(12,2) DEFAULT 0,
      reason TEXT DEFAULT 'Damaged in Transit', sort_order INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await db.query(`
    CREATE TABLE IF NOT EXISTS goods_return_logs (
      id TEXT PRIMARY KEY, org_id TEXT NOT NULL, return_id TEXT NOT NULL,
      action TEXT NOT NULL, old_status TEXT, new_status TEXT, note TEXT,
      created_by TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // --- Purchase Quotations & Orders ---
  await db.query(`
    CREATE TABLE IF NOT EXISTS blanket_agreements (
      id TEXT PRIMARY KEY, org_id TEXT NOT NULL, agreement_number TEXT NOT NULL,
      vendor_id TEXT, vendor_name TEXT NOT NULL,
      status TEXT DEFAULT 'active'
        CHECK (status IN ('active','expired','cancelled')),
      start_date DATE, end_date DATE,
      total_value NUMERIC(12,2) DEFAULT 0,
      terms TEXT, items JSONB DEFAULT '[]',
      created_by TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      deleted_at TIMESTAMP, UNIQUE (org_id, agreement_number)
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS purchase_requests (
      id TEXT PRIMARY KEY, org_id TEXT NOT NULL, request_number TEXT NOT NULL,
      department TEXT, requested_by_name TEXT,
      status TEXT DEFAULT 'draft'
        CHECK (status IN ('draft','pending_approval','approved','rejected','converted')),
      required_date DATE,
      items JSONB DEFAULT '[]', notes TEXT,
      converted_to_po TEXT,
      created_by TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      deleted_at TIMESTAMP, UNIQUE (org_id, request_number)
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS purchase_quotations (
      id TEXT PRIMARY KEY, org_id TEXT NOT NULL, number TEXT NOT NULL,
      vendor_id TEXT, vendor_name TEXT NOT NULL,
      vendor_email TEXT, vendor_phone TEXT,
      status TEXT DEFAULT 'draft'
        CHECK (status IN ('draft','sent','received','awarded','rejected','converted')),
      subtotal NUMERIC(12,2) DEFAULT 0, discount_pct NUMERIC(5,2) DEFAULT 0,
      discount_amount NUMERIC(12,2) DEFAULT 0, tax NUMERIC(12,2) DEFAULT 0,
      total NUMERIC(12,2) DEFAULT 0, currency TEXT DEFAULT 'INR',
      valid_until DATE, notes TEXT, terms TEXT,
      converted_to TEXT, items JSONB DEFAULT '[]', created_by TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      deleted_at TIMESTAMP, UNIQUE (org_id, number)
    )
  `);
  
  await db.query(`
    CREATE TABLE IF NOT EXISTS purchase_orders (
      id TEXT PRIMARY KEY, org_id TEXT NOT NULL, po_number TEXT NOT NULL,
      vendor_id TEXT, vendor_name TEXT NOT NULL,
      quotation_ref TEXT,
      status TEXT DEFAULT 'draft'
        CHECK (status IN ('draft','issued','partially_received','fulfilled','cancelled')),
      expected_delivery_date DATE,
      subtotal NUMERIC(12,2) DEFAULT 0, discount_pct NUMERIC(5,2) DEFAULT 0,
      discount_amount NUMERIC(12,2) DEFAULT 0, tax NUMERIC(12,2) DEFAULT 0,
      total NUMERIC(12,2) DEFAULT 0, currency TEXT DEFAULT 'INR',
      notes TEXT, terms TEXT,
      items JSONB DEFAULT '[]', created_by TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      deleted_at TIMESTAMP, UNIQUE (org_id, po_number)
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS goods_receipt_pos (
      id TEXT PRIMARY KEY, org_id TEXT NOT NULL, receipt_number TEXT NOT NULL,
      vendor_id TEXT, vendor_name TEXT NOT NULL, base_po_no TEXT,
      posting_date DATE, document_date DATE, status TEXT DEFAULT 'open',
      remarks TEXT, items JSONB DEFAULT '[]',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      deleted_at TIMESTAMP, created_by TEXT, UNIQUE (org_id, receipt_number)
    )
  `);

  // Indexes
  const idxs = [
    `CREATE INDEX IF NOT EXISTS idx_vendors_org   ON vendors(org_id)`,
    `CREATE INDEX IF NOT EXISTS idx_products_org  ON products(org_id)`,
    `CREATE INDEX IF NOT EXISTS idx_prreq_org      ON purchase_requests(org_id)`,
    `CREATE INDEX IF NOT EXISTS idx_grpo_org       ON goods_receipt_pos(org_id)`,
    `CREATE INDEX IF NOT EXISTS idx_grpo_vend      ON goods_receipt_pos(org_id, vendor_id)`,
    `CREATE INDEX IF NOT EXISTS idx_pv_product    ON product_vendors(org_id, product_id)`,
    `CREATE INDEX IF NOT EXISTS idx_pv_vendor     ON product_vendors(org_id, vendor_id)`,
    `CREATE INDEX IF NOT EXISTS idx_greturns_org  ON goods_returns(org_id)`,
    `CREATE INDEX IF NOT EXISTS idx_greturns_vend ON goods_returns(org_id, vendor_id)`,
    `CREATE INDEX IF NOT EXISTS idx_gritems_ret   ON goods_return_items(return_id)`,
    `CREATE INDEX IF NOT EXISTS idx_grlogs_ret    ON goods_return_logs(return_id)`,
    `CREATE INDEX IF NOT EXISTS idx_vdocs_vendor  ON vendor_documents(org_id, vendor_id)`,
  ];
  for (const i of idxs) await db.query(i);
};
