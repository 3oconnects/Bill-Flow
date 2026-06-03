// backend/routes/customers.js
const express = require('express');
const router = express.Router();
const { v4: uuid } = require('uuid');
const { stmts, db } = require('../db');
const { requireAuth, requireAdmin } = require('../auth');
const { sendSuccess, sendError } = require('../utils/response');
const { validate } = require('../middleware/validate');
const { customerSchemas } = require('../validators');

router.get('/', requireAuth, async (req, res) => {
  try {
    const customers = await stmts.getCustomers.all(req.orgId);
    sendSuccess(res, customers);
  } catch (err) {
    console.error('Get customers error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

router.get('/:id', requireAuth, async (req, res) => {
  try {
    const cust = await stmts.getCustomer.get(req.params.id, req.orgId);
    if (!cust) return sendError(res, 'Customer not found', 'NOT_FOUND', 404);
    sendSuccess(res, cust);
  } catch (err) {
    console.error('Get customer error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

// Customer detail — customer + all related invoices, payments, warranty claims
router.get('/:id/detail', requireAuth, async (req, res) => {
  try {
    const cust = await stmts.getCustomer.get(req.params.id, req.orgId);
    if (!cust) return sendError(res, 'Customer not found', 'NOT_FOUND', 404);

    const [invoices, payments, warranty_claims] = await Promise.all([
      db.query(
        `SELECT id, number, date, due_date, status, total, subtotal, tax, currency, shipment_status
         FROM invoices
         WHERE customer_id = $1 AND org_id = $2 AND deleted_at IS NULL
         ORDER BY date DESC`,
        [req.params.id, req.orgId]
      ).then(r => r.rows),

      db.query(
        `SELECT p.id, p.amount, p.date, p.method, p.reference, i.number AS invoice_number
         FROM payments p
         LEFT JOIN invoices i ON p.invoice_id = i.id
         WHERE i.customer_id = $1 AND p.org_id = $2 AND p.deleted_at IS NULL
         ORDER BY p.date DESC`,
        [req.params.id, req.orgId]
      ).then(r => r.rows),

      db.query(
        `SELECT id, invoice_number, product_name, model_number, status, issue_description, created_at
         FROM warranty_claims
         WHERE customer_id = $1 AND org_id = $2 AND deleted_at IS NULL
         ORDER BY created_at DESC`,
        [req.params.id, req.orgId]
      ).then(r => r.rows),
    ]);

    sendSuccess(res, { customer: cust, invoices, payments, warranty_claims });
  } catch (err) {
    console.error('Get customer detail error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

router.post('/', requireAuth, validate(customerSchemas.create), async (req, res) => {
  try {
    const { name, email, phone, address, city, state, country, pincode, gstin, pan, currency, credit_limit, notes } = req.body;
    const id = uuid();
    await stmts.insertCustomer.run(id, req.orgId, name, email||'', phone||'', address||'', city||'', state||'', country||'India', pincode||'', gstin||'', pan||'', currency||'INR', credit_limit||0, notes||'', req.user.id);
    sendSuccess(res, { id });
  } catch (err) {
    console.error('Create customer error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

router.put('/:id', requireAuth, validate(customerSchemas.create), async (req, res) => {
  try {
    const { name, email, phone, address, city, state, country, pincode, gstin, pan, currency, credit_limit, notes } = req.body;
    await stmts.updateCustomer.run(name, email||'', phone||'', address||'', city||'', state||'', country||'India', pincode||'', gstin||'', pan||'', currency||'INR', credit_limit||0, notes||'', req.params.id, req.orgId);
    sendSuccess(res, null);
  } catch (err) {
    console.error('Update customer error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    await stmts.deleteCustomer.run(req.params.id, req.orgId);
    sendSuccess(res, null);
  } catch (err) {
    console.error('Delete customer error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

module.exports = router;
