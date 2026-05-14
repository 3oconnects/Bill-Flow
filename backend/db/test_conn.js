// backend/db/test_conn.js
require('dotenv').config();
const { Pool } = require('pg');

async function test() {
  console.log('Testing connection to Supabase...');
  const pool = new Pool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 30000,
  });

  try {
    const start = Date.now();
    const res = await pool.query('SELECT NOW()');
    console.log('✅ Connection successful!');
    console.log('DB Time:', res.rows[0].now);
    console.log('Latency:', Date.now() - start, 'ms');
  } catch (err) {
    console.error('❌ Connection failed!');
    console.error(err);
  } finally {
    await pool.end();
  }
}

test();
