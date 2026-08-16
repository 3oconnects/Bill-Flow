// backend/db/conn.js
'use strict';
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const { Pool } = require('pg');

const pool = new Pool({
  host:                    process.env.DB_HOST,
  port:                    parseInt(process.env.DB_PORT || '5432'),
  database:                process.env.DB_NAME,
  user:                    process.env.DB_USER,
  password:                process.env.DB_PASSWORD,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  max:                     parseInt(process.env.DB_POOL_MAX || '10'),
  // Keep a couple of connections warm so requests reuse them instead of paying
  // the (slow, cross-region) Supabase pooler handshake on every call.
  min:                     parseInt(process.env.DB_POOL_MIN || '2'),
  idleTimeoutMillis:       parseInt(process.env.DB_IDLE_TIMEOUT || '60000'),
  // The pooler handshake to ap-southeast-1 can take >5s; give it room before
  // pg kills the attempt and surfaces it as a 500.
  connectionTimeoutMillis: parseInt(process.env.DB_CONN_TIMEOUT || '15000'),
  // Do NOT exit on idle — tearing down idle connections forces a fresh slow
  // handshake on the next request, which is what was causing intermittent 500s.
  allowExitOnIdle:         false,
  keepAlive:               true,
  keepAliveInitialDelayMillis: 5000,
});

pool.on('error', function(err) {
  // Idle client errors are non-fatal; the pool will create a new client.
  console.error('Unexpected error on idle DB client:', err.message);
});

// Transient errors worth retrying (slow/flaky pooler handshake, dropped conn).
function isTransient(err) {
  if (!err) return false;
  var code = err.code;
  var msg  = (err.message || '').toLowerCase();
  return (
    code === 'ECONNRESET' || code === 'ETIMEDOUT' || code === 'ECONNREFUSED' ||
    code === 'EPIPE' || code === '57P01' || code === '08006' || code === '08003' ||
    msg.indexOf('connection terminated') !== -1 ||
    msg.indexOf('connection timeout') !== -1 ||
    msg.indexOf('timeout exceeded') !== -1
  );
}

// Query with a small retry/backoff so a single slow handshake doesn't fail the
// whole request. Reused connections are fast, so retries almost always succeed.
function queryWithRetry(text, params, attempt) {
  attempt = attempt || 0;
  return pool.query(text, params).catch(function(err) {
    if (isTransient(err) && attempt < 3) {
      var delay = 250 * Math.pow(2, attempt); // 250ms, 500ms, 1000ms
      return new Promise(function(resolve) { setTimeout(resolve, delay); })
        .then(function() { return queryWithRetry(text, params, attempt + 1); });
    }
    throw err;
  });
}

var db = {
  query:   function(text, params) { return queryWithRetry(text, params, 0); },
  connect: function() { return pool.connect(); },
  pool:    pool,
  prepare: function(sql) {
    var count = 0;
    var pgSql = sql.replace(/\?/g, function() { return '$' + (++count); });
    return {
      run: function() {
        var params = Array.prototype.slice.call(arguments);
        return queryWithRetry(pgSql, params, 0).then(function(r) {
          return { changes: r.rowCount, lastInsertRowid: (r.rows[0] && r.rows[0].id) || null };
        });
      },
      get: function() {
        var params = Array.prototype.slice.call(arguments);
        return queryWithRetry(pgSql, params, 0).then(function(r) { return r.rows[0]; });
      },
      all: function() {
        var params = Array.prototype.slice.call(arguments);
        return queryWithRetry(pgSql, params, 0).then(function(r) { return r.rows; });
      },
    };
  },

  /**
   * Set the RLS org context for the current connection/transaction.
   * Must be called inside a transaction (BEGIN ... COMMIT) for SET LOCAL to work.
   * Usage:
   *   const client = await db.connect();
   *   try {
   *     await client.query('BEGIN');
   *     await db.setOrgContext(client, orgId);
   *     // ... queries are now RLS-scoped to orgId ...
   *     await client.query('COMMIT');
   *   } finally { client.release(); }
   */
  setOrgContext: async function(client, orgId) {
    if (!orgId) return;
    // SET LOCAL is transaction-scoped and resets automatically on COMMIT/ROLLBACK
    await client.query("SET LOCAL app.current_org_id = '" + orgId.replace(/'/g, "''") + "'");
  },

  /**
   * Run a callback within a transaction that has org context set for RLS.
   * Simplifies the common pattern of connect → BEGIN → SET LOCAL → work → COMMIT.
   * @param {string} orgId - The organization ID for RLS
   * @param {function} fn - async (client) => result
   * @returns {*} The return value of fn
   */
  withOrgContext: async function(orgId, fn) {
    var client = await pool.connect();
    try {
      await client.query('BEGIN');
      if (orgId) {
        await client.query("SET LOCAL app.current_org_id = '" + orgId.replace(/'/g, "''") + "'");
      }
      var result = await fn(client);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK').catch(function() {});
      throw err;
    } finally {
      client.release();
    }
  },
};

module.exports = db;
