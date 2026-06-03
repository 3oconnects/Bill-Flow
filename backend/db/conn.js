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
  max:                     parseInt(process.env.DB_POOL_MAX || '25'),
  idleTimeoutMillis:       30000,
  connectionTimeoutMillis: 5000,
  allowExitOnIdle:         true,
  keepAlive:               true,
});

pool.on('error', function(err) {
  console.error('Unexpected error on idle DB client', err);
});

var db = {
  query:   function(text, params) { return pool.query(text, params); },
  connect: function() { return pool.connect(); },
  prepare: function(sql) {
    var count = 0;
    var pgSql = sql.replace(/\?/g, function() { return '$' + (++count); });
    return {
      run: function() {
        var params = Array.prototype.slice.call(arguments);
        return pool.query(pgSql, params).then(function(r) {
          return { changes: r.rowCount, lastInsertRowid: (r.rows[0] && r.rows[0].id) || null };
        });
      },
      get: function() {
        var params = Array.prototype.slice.call(arguments);
        return pool.query(pgSql, params).then(function(r) { return r.rows[0]; });
      },
      all: function() {
        var params = Array.prototype.slice.call(arguments);
        return pool.query(pgSql, params).then(function(r) { return r.rows; });
      },
    };
  },
};

module.exports = db;
