require('dotenv').config({ path: '.env' });
const { Pool } = require('pg');
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
    // Get a valid org_id and user_id
    const user = (await pool.query('SELECT org_id, id FROM users LIMIT 1')).rows[0];
    if (!user) throw new Error('No user found');
    
    // Simulate insertVendor
    const sql = `INSERT INTO vendors (id, org_id, vendor_id, name, company_name, contact_person, email, phone, address, street, city, state, pincode, country, gstin, bank_account, ifsc, bank_name, bank_branch, status, notes, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)`;
    const values = [
      'test-id-123', user.org_id, '', 'Test Vendor', '', '',
      'test@example.com', '', '', '', '', '',
      '', 'India', '', '', '',
      '', '', 'active', '', user.id
    ];
    await pool.query(sql, values);
    console.log('Insert successful');
  } catch (err) {
    console.error('Insert Error:', err);
  } finally {
    pool.end();
  }
}
run();
