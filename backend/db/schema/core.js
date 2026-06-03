// schema/core.js — Organizations, Users, Sessions
const db = require('../conn');
module.exports = async function schemaCoreInit() {
  await db.query(`
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN NEW.updated_at = CURRENT_TIMESTAMP; RETURN NEW; END;
    $$ language 'plpgsql';
  `);
  await db.query(`
    CREATE TABLE IF NOT EXISTS organizations (
      id            TEXT PRIMARY KEY,
      name          TEXT NOT NULL,
      email         TEXT, phone TEXT, address TEXT, city TEXT,
      state         TEXT DEFAULT 'Tamil Nadu',
      country       TEXT DEFAULT 'India',
      pincode       TEXT, gstin TEXT, pan TEXT, logo_url TEXT,
      currency      TEXT DEFAULT 'INR',
      inv_prefix    TEXT DEFAULT 'INV-',
      next_inv_no   INTEGER DEFAULT 1,
      default_notes TEXT DEFAULT 'Thank you for your business.',
      default_terms TEXT DEFAULT 'Payment due within 30 days.',
      created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      deleted_at    TIMESTAMP, created_by TEXT
    )
  `);
  await db.query(`
    CREATE TABLE IF NOT EXISTS users (
      id            TEXT PRIMARY KEY, org_id TEXT NOT NULL, name TEXT NOT NULL,
      email         TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL,
      role          TEXT NOT NULL DEFAULT 'member', is_active BOOLEAN DEFAULT TRUE,
      last_login    TIMESTAMP,
      created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      deleted_at    TIMESTAMP, created_by TEXT, UNIQUE (org_id, id)
    )
  `);
  await db.query(`
    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY, user_id TEXT NOT NULL, org_id TEXT NOT NULL,
      expires_at TIMESTAMP NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
};
