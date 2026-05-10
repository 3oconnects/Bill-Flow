// backend/routes/organization.js
const express = require('express');
const router = express.Router();
const { v4: uuid } = require('uuid');
const { stmts } = require('../db');
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

// Roles & Permissions (Mock logic from server.js)
const orgRolesCache = {};
function getOrgRoles(orgId) {
  if (!orgRolesCache[orgId]) {
    orgRolesCache[orgId] = [
      { id:'role_owner', name:'Owner', description:'Full system access', isSystem:true, color:'#7c3aed',
        permissions:{ dashboard:['view'], products:['view','add','edit','delete'], invoices:['view','create','edit','delete'], vendors:['view','add','edit','delete'], customers:['view','add','edit','delete'], expenses:['view','add','edit','delete'], reports:['view','export'], settings:['view','manage_roles','system_config'] }, createdAt:new Date().toISOString().slice(0,10) },
      { id:'role_admin', name:'Admin', description:'Full access except system config', isSystem:true, color:'#2563eb',
        permissions:{ dashboard:['view'], products:['view','add','edit','delete'], invoices:['view','create','edit','delete'], vendors:['view','add','edit','delete'], customers:['view','add','edit','delete'], expenses:['view','add','edit','delete'], reports:['view','export'], settings:['view','manage_roles'] }, createdAt:new Date().toISOString().slice(0,10) },
      { id:'role_staff', name:'Staff', description:'View and create only', isSystem:true, color:'#059669',
        permissions:{ dashboard:['view'], products:['view','add'], invoices:['view','create'], vendors:['view'], customers:['view','add'], expenses:['view','add'], reports:['view'], settings:[] }, createdAt:new Date().toISOString().slice(0,10) },
    ];
  }
  return orgRolesCache[orgId];
}

router.get('/roles', requireAuth, (req, res) => {
  sendSuccess(res, getOrgRoles(req.orgId));
});

router.post('/roles', requireAuth, requireAdmin, (req, res) => {
  const { name, description, permissions, color } = req.body;
  if (!name) return sendError(res, 'Role name is required', 'VALIDATION_ERROR', 400);
  const roles = getOrgRoles(req.orgId);
  if (roles.find(r => r.name.toLowerCase() === name.toLowerCase()))
    return sendError(res, 'A role with this name already exists', 'CONFLICT', 409);
  const newRole = { id:'role_'+uuid(), name, description:description||'', isSystem:false, color:color||'#2563eb', permissions:permissions||{}, createdAt:new Date().toISOString().slice(0,10) };
  roles.push(newRole);
  sendSuccess(res, newRole);
});

router.put('/roles/:id', requireAuth, requireAdmin, (req, res) => {
  const roles = getOrgRoles(req.orgId);
  const idx = roles.findIndex(r => r.id === req.params.id);
  if (idx < 0) return sendError(res, 'Role not found', 'NOT_FOUND', 404);
  const role = roles[idx];
  const { name, description, permissions, color } = req.body;
  roles[idx] = { ...role, name:role.isSystem?role.name:(name||role.name), description:description??role.description, permissions:permissions||role.permissions, color:color||role.color };
  sendSuccess(res, roles[idx]);
});

router.delete('/roles/:id', requireAuth, requireAdmin, (req, res) => {
  const roles = getOrgRoles(req.orgId);
  const role = roles.find(r => r.id === req.params.id);
  if (!role) return sendError(res, 'Role not found', 'NOT_FOUND', 404);
  if (role.isSystem) return sendError(res, 'System roles cannot be deleted', 'FORBIDDEN', 403);
  const idx = roles.findIndex(r => r.id === req.params.id);
  roles.splice(idx, 1);
  sendSuccess(res, null);
});

module.exports = router;
