// backend/db/statements/auth.js
const db = require('../conn');

module.exports = {
  insertOrg: db.prepare(`INSERT INTO organizations (id, name, email, gstin, state, currency, inv_prefix, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`),
  getOrg: db.prepare(`SELECT id, name, email, phone, address, city, state, country, pincode, gstin, pan, logo_url, currency, inv_prefix, next_inv_no, default_notes, default_terms, created_at, updated_at FROM organizations WHERE id = ? AND deleted_at IS NULL`),
  updateOrg: db.prepare(`UPDATE organizations SET name=?, email=?, phone=?, address=?, city=?, state=?, pincode=?, gstin=?, pan=?, currency=?, inv_prefix=?, next_inv_no=?, default_notes=?, default_terms=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`),
  setOrgCreator: db.prepare(`UPDATE organizations SET created_by = ? WHERE id = ?`),

  insertUser: db.prepare(`INSERT INTO users (id, org_id, name, email, password_hash, role, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)`),
  getUserByEmail: db.prepare(`SELECT id, org_id, name, email, password_hash, role, is_active, last_login, created_at FROM users WHERE email = ? AND deleted_at IS NULL`),
  getUserById: db.prepare(`SELECT id, org_id, name, email, role, is_active, last_login, created_at FROM users WHERE id = ? AND deleted_at IS NULL`),
  updateLastLogin: db.prepare(`UPDATE users SET last_login = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?`),
  getOrgUsers: db.prepare(`SELECT id, name, email, role, is_active, last_login, created_at FROM users WHERE org_id = ? AND deleted_at IS NULL ORDER BY name`),
  updateUser: db.prepare(`UPDATE users SET name=?, email=?, role=?, updated_at=CURRENT_TIMESTAMP WHERE id=? AND org_id=?`),
  deleteUser: db.prepare(`UPDATE users SET deleted_at=CURRENT_TIMESTAMP WHERE id=? AND org_id=? AND role != 'owner'`),
  updatePassword: db.prepare(`UPDATE users SET password_hash=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`),

  insertSession: db.prepare(`INSERT INTO sessions (token, user_id, org_id, expires_at) VALUES (?, ?, ?, ?)`),
  getSession: db.prepare(`SELECT token, user_id, org_id, expires_at, created_at FROM sessions WHERE token = ? AND expires_at > CURRENT_TIMESTAMP`),
  deleteSession: db.prepare(`DELETE FROM sessions WHERE token = ?`),
  cleanSessions: db.prepare(`DELETE FROM sessions WHERE expires_at <= CURRENT_TIMESTAMP`),
};
