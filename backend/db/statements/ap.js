// backend/db/statements/ap.js
const db = require('../conn');
const q = (sql) => ({
  all: (...p) => db.query(sql, p).then(r => r.rows),
  get: (...p) => db.query(sql, p).then(r => r.rows[0] || null),
  run: (...p) => db.query(sql, p),
});

const insertAPLog = q(`
  INSERT INTO ap_activity_logs (id, org_id, doc_type, doc_id, action, old_status, new_status, note, created_by)
  VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
`);

const getAPLogs = q(`
  SELECT l.*, u.name AS actor_name
  FROM ap_activity_logs l
  LEFT JOIN users u ON u.id = l.created_by
  WHERE l.doc_type=$1 AND l.doc_id=$2
  ORDER BY l.created_at ASC
`);

module.exports = {
  insertAPLog, getAPLogs,
  ...require('./apDownPayments'),
  ...require('./apInvoices'),
  ...require('./apCreditMemos'),
  ...require('./apReserveInvoices'),
};
