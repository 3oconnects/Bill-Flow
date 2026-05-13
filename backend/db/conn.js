// backend/db/conn.js
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 30000,
  keepAlive: true,
});

console.log(`🔌 DB: Connecting to ${process.env.DB_HOST}:${process.env.DB_PORT} as ${process.env.DB_USER}...`);

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

// Helper to handle queries with parameters using the pool
const db = {
  query: (text, params) => pool.query(text, params),
  // For better-sqlite3 compatibility (async versions)
  prepare: (sql) => {
    // Replace ? with $1, $2, etc.
    let count = 0;
    const pgSql = sql.replace(/\?/g, () => `$${++count}`);
    return {
      run: async (...params) => {
        const res = await pool.query(pgSql, params);
        return {
          changes: res.rowCount,
          lastInsertRowid: res.rows[0]?.id || null // Mocking lastInsertRowid for PG
        };
      },
      get: async (...args) => {
        const res = await pool.query(pgSql, args);
        return res.rows[0];
      },
      all: async (...args) => {
        const res = await pool.query(pgSql, args);
        return res.rows;
      }
    };
  }
};

module.exports = db;
