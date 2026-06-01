-- Stock movement audit log
CREATE TABLE IF NOT EXISTS stock_movements (
  id           TEXT PRIMARY KEY,
  org_id       TEXT NOT NULL,
  product_id   TEXT NOT NULL,
  type         TEXT NOT NULL DEFAULT 'adjustment', -- adjustment | sale | purchase | return
  delta        NUMERIC(12,3) NOT NULL,
  qty_before   NUMERIC(12,3) NOT NULL DEFAULT 0,
  qty_after    NUMERIC(12,3) NOT NULL DEFAULT 0,
  reason       TEXT,
  note         TEXT,
  reference_id TEXT,   -- invoice_id or po_id if triggered by a transaction
  created_by   TEXT,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON stock_movements(org_id, product_id);

-- Product categories
CREATE TABLE IF NOT EXISTS product_categories (
  id         TEXT PRIMARY KEY,
  org_id     TEXT NOT NULL,
  name       TEXT NOT NULL,
  color      TEXT DEFAULT '#6366f1',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(org_id, name)
);
CREATE INDEX IF NOT EXISTS idx_product_categories_org ON product_categories(org_id);

-- Price lists (retail / wholesale / distributor)
CREATE TABLE IF NOT EXISTS price_lists (
  id          TEXT PRIMARY KEY,
  org_id      TEXT NOT NULL,
  product_id  TEXT NOT NULL,
  label       TEXT NOT NULL,  -- e.g. Retail, Wholesale, Distributor
  price       NUMERIC(12,2) NOT NULL DEFAULT 0,
  min_qty     NUMERIC(12,3) DEFAULT 1,
  currency    TEXT DEFAULT 'INR',
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_price_lists_product ON price_lists(org_id, product_id);
