require('dotenv').config({ path: '.env' });
const { Pool } = require('pg');
const { v4: uuid } = require('uuid');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});

async function run() {
  try {
    const user = (await pool.query('SELECT org_id, id FROM users LIMIT 1')).rows[0];
    const id = uuid();

    const insertVendorStr = `INSERT INTO vendors (id, org_id, vendor_id, name, company_name, contact_person, email, phone, address, street, city, state, pincode, country, gstin, bank_account, ifsc, bank_name, bank_branch, status, notes, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)`;
    
    // Exact same parameters passed to run() in backend/routes/vendors.js
    const values = [
      id, user.org_id, '', 'Test Name', '', '',
      '', '', '', '', '', '',
      '', 'India', '', '', '',
      '', '', 'active', '', user.id
    ];
    await pool.query(insertVendorStr, values);
    console.log('Insert successful');
  } catch (err) {
    console.error('Insert Error:', err);
  } finally {
    pool.end();
  }
}
run();
