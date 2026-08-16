// backend/routes/organization.js
const express = require('express');
const router = express.Router();
const { v4: uuid } = require('uuid');
const { stmts, db } = require('../db');
const { requireAuth, requireAdmin, requireOwner, hashPassword } = require('../auth');
const { sendSuccess, sendError } = require('../utils/response');

// Organization
router.get('/', requireAuth, async (req, res) => {
  const org = await stmts.getOrg.get(req.orgId);
  sendSuccess(res, org);
});

router.put('/', requireAuth, requireAdmin, async (req, res) => {
  const { name, email, phone, address, city, state, pincode, gstin, pan, currency, inv_prefix, next_inv_no, default_notes, default_terms } = req.body;
  await stmts.updateOrg.run(name, email, phone, address, city, state, pincode, gstin, pan, currency, inv_prefix, next_inv_no, default_notes, default_terms, req.orgId);
  sendSuccess(res, null);
});

// Team Management
router.get('/team', requireAuth, requireAdmin, async (req, res) => {
  const users = await stmts.getOrgUsers.all(req.orgId);
  sendSuccess(res, users);
});

router.post('/team', requireAuth, requireOwner, async (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password) return sendError(res, 'All fields required', 'VALIDATION_ERROR', 400);
  const existingUser = await stmts.getUserByEmail.get(email);
  if (existingUser) return sendError(res, 'Email already registered', 'CONFLICT', 409);
  const validRoles = ['admin', 'staff', 'member'];
  const assignedRole = validRoles.includes(role) ? role : 'member';
  const userId = uuid();
  await stmts.insertUser.run(userId, req.orgId, name, email, hashPassword(password), assignedRole, req.user.id);
  sendSuccess(res, { id: userId });
});

router.put('/team/:id', requireAuth, requireOwner, async (req, res) => {
  const { name, email, role } = req.body;
  await stmts.updateUser.run(name, email, role, req.params.id, req.orgId);
  sendSuccess(res, null);
});

router.delete('/team/:id', requireAuth, requireOwner, async (req, res) => {
  if (req.params.id === req.user.id) return sendError(res, 'Cannot delete yourself', 'VALIDATION_ERROR', 400);
  await stmts.deleteUser.run(req.params.id, req.orgId);
  sendSuccess(res, null);
});

// ── Roles & Permissions (Database-backed) ────────────────────────────────────

// Default system roles — seeded if org has none in the DB
const SYSTEM_ROLES = [
  { name: 'Owner', description: 'Full system access', is_system: true, color: '#7c3aed',
    permissions: { dashboard:['view'], products:['view','add','edit','delete'], invoices:['view','create','edit','delete'], vendors:['view','add','edit','delete'], customers:['view','add','edit','delete'], expenses:['view','add','edit','delete'], reports:['view','export'], settings:['view','manage_roles','system_config'] } },
  { name: 'Admin', description: 'Full access except system config', is_system: true, color: '#2563eb',
    permissions: { dashboard:['view'], products:['view','add','edit','delete'], invoices:['view','create','edit','delete'], vendors:['view','add','edit','delete'], customers:['view','add','edit','delete'], expenses:['view','add','edit','delete'], reports:['view','export'], settings:['view','manage_roles'] } },
  { name: 'Staff', description: 'View and create only', is_system: true, color: '#059669',
    permissions: { dashboard:['view'], products:['view','add'], invoices:['view','create'], vendors:['view'], customers:['view','add'], expenses:['view','add'], reports:['view'], settings:[] } },
];

async function ensureSystemRoles(orgId) {
  const { rows } = await db.query(
    `SELECT COUNT(*)::int AS c FROM org_roles WHERE org_id = $1 AND deleted_at IS NULL`, [orgId]
  );
  if (rows[0].c > 0) return; // Already seeded

  for (const role of SYSTEM_ROLES) {
    await db.query(
      `INSERT INTO org_roles (id, org_id, name, description, is_system, color, permissions, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       ON CONFLICT (org_id, name) DO NOTHING`,
      [uuid(), orgId, role.name, role.description, role.is_system, role.color, JSON.stringify(role.permissions)]
    );
  }
}

router.get('/roles', requireAuth, async (req, res) => {
  try {
    await ensureSystemRoles(req.orgId);
    const { rows } = await db.query(
      `SELECT id, org_id, name, description, is_system AS "isSystem", color, permissions,
              created_at AS "createdAt"
         FROM org_roles
        WHERE org_id = $1 AND deleted_at IS NULL
        ORDER BY is_system DESC, name`,
      [req.orgId]
    );
    sendSuccess(res, rows);
  } catch (err) {
    console.error('Get roles error:', err);
    sendError(res, 'Failed to load roles', 'INTERNAL_ERROR', 500);
  }
});

router.post('/roles', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { name, description, permissions, color } = req.body;
    if (!name) return sendError(res, 'Role name is required', 'VALIDATION_ERROR', 400);

    // Check for duplicates
    const { rows: existing } = await db.query(
      `SELECT id FROM org_roles WHERE org_id = $1 AND LOWER(name) = LOWER($2) AND deleted_at IS NULL`,
      [req.orgId, name]
    );
    if (existing.length > 0) {
      return sendError(res, 'A role with this name already exists', 'CONFLICT', 409);
    }

    const id = 'role_' + uuid();
    await db.query(
      `INSERT INTO org_roles (id, org_id, name, description, is_system, color, permissions, created_at)
       VALUES ($1, $2, $3, $4, FALSE, $5, $6, NOW())`,
      [id, req.orgId, name, description || '', color || '#2563eb', JSON.stringify(permissions || {})]
    );
    const { rows } = await db.query(`SELECT * FROM org_roles WHERE id = $1`, [id]);
    sendSuccess(res, rows[0]);
  } catch (err) {
    console.error('Create role error:', err);
    sendError(res, 'Failed to create role', 'INTERNAL_ERROR', 500);
  }
});

router.put('/roles/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT * FROM org_roles WHERE id = $1 AND org_id = $2 AND deleted_at IS NULL`, [req.params.id, req.orgId]
    );
    if (!rows.length) return sendError(res, 'Role not found', 'NOT_FOUND', 404);
    const role = rows[0];

    const { name, description, permissions, color } = req.body;
    await db.query(
      `UPDATE org_roles SET
         name = $1, description = $2, permissions = $3, color = $4, updated_at = NOW()
       WHERE id = $5 AND org_id = $6`,
      [
        role.is_system ? role.name : (name || role.name),
        description ?? role.description,
        JSON.stringify(permissions || role.permissions),
        color || role.color,
        req.params.id, req.orgId
      ]
    );
    const { rows: updated } = await db.query(`SELECT * FROM org_roles WHERE id = $1`, [req.params.id]);
    sendSuccess(res, updated[0]);
  } catch (err) {
    console.error('Update role error:', err);
    sendError(res, 'Failed to update role', 'INTERNAL_ERROR', 500);
  }
});

router.delete('/roles/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT * FROM org_roles WHERE id = $1 AND org_id = $2 AND deleted_at IS NULL`, [req.params.id, req.orgId]
    );
    if (!rows.length) return sendError(res, 'Role not found', 'NOT_FOUND', 404);
    if (rows[0].is_system) return sendError(res, 'System roles cannot be deleted', 'FORBIDDEN', 403);

    await db.query(`UPDATE org_roles SET deleted_at = NOW() WHERE id = $1 AND org_id = $2`, [req.params.id, req.orgId]);
    sendSuccess(res, null);
  } catch (err) {
    console.error('Delete role error:', err);
    sendError(res, 'Failed to delete role', 'INTERNAL_ERROR', 500);
  }
});

module.exports = router;

