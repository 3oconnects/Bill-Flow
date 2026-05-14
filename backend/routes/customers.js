// backend/routes/customers.js
const express = require('express');
const router = express.Router();
const { v4: uuid } = require('uuid');
const { stmts, db } = require('../db');
const { requireAuth, requireAdmin } = require('../auth');
const { sendSuccess, sendError } = require('../utils/response');

router.get('/', requireAuth, async (req, res) => {
  try {
    const customers = await stmts.getCustomers.all(req.orgId);
    sendSuccess(res, customers);
  } catch (err) {
    console.error('Get customers error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

router.get('/:id/detail', requireAuth, async (req, res) => {
  try {
    const customer = await stmts.getCustomer.get(req.params.id, req.orgId);
    if (!customer) return sendError(res, 'Customer not found', 'NOT_FOUND', 404);

    // Fetch related data
    const invoices = await stmts.getInvoices.all(req.orgId);
    const customerInvoices = invoices.filter(i => i.customer_id === req.params.id);
    
    const payments = await stmts.getPayments.all(req.orgId);
    const customerPayments = payments.filter(p => customerInvoices.some(i => i.id === p.invoice_id));

    const warrantyClaims = await stmts.getWarrantyClaimsByCustomer.all(req.orgId, req.params.id);

    sendSuccess(res, {
      customer,
      invoices: customerInvoices,
      payments: customerPayments,
      warranty_claims: warrantyClaims
    });
  } catch (err) {
    console.error('Get customer detail error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

router.post('/', requireAuth, async (req, res) => {
  try {
    const { 
      name, email, phone, address, city, state, country, pincode, gstin, pan, currency, credit_limit, notes,
      customer_id_display, contact_person, alternate_phone, company_name, business_type, 
      shipping_address_line1, shipping_address_line2, shipping_city, shipping_state, shipping_country, shipping_pincode,
      payment_terms, opening_balance, tax_preference, tags, preferred_payment_method, customer_category, status
    } = req.body;
    
    if (!name) return sendError(res, 'Name is required', 'VALIDATION_ERROR', 400);
    
    const id = uuid();
    await stmts.insertCustomer.run(
      id, req.orgId, name, email||'', phone||'', address||'', city||'', state||'', country||'India', pincode||'', gstin||'', pan||'', currency||'INR', Number(credit_limit)||0, notes||'', req.user.id,
      customer_id_display||'', contact_person||'', alternate_phone||'', company_name||'', business_type||'',
      shipping_address_line1||'', shipping_address_line2||'', shipping_city||'', shipping_state||'', shipping_country||'India', shipping_pincode||'',
      payment_terms||'', Number(opening_balance)||0, tax_preference||'taxable', tags||'', preferred_payment_method||'', customer_category||'', status||'active'
    );
    sendSuccess(res, { id });
  } catch (err) {
    console.error('Create customer error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { 
      name, email, phone, address, city, state, country, pincode, gstin, pan, currency, credit_limit, notes,
      customer_id_display, contact_person, alternate_phone, company_name, business_type, 
      shipping_address_line1, shipping_address_line2, shipping_city, shipping_state, shipping_country, shipping_pincode,
      payment_terms, opening_balance, tax_preference, tags, preferred_payment_method, customer_category, status
    } = req.body;

    if (!name) return sendError(res, 'Name is required', 'VALIDATION_ERROR', 400);

    await stmts.updateCustomer.run(
      name, email||'', phone||'', address||'', city||'', state||'', country||'India', pincode||'', gstin||'', pan||'', currency||'INR', Number(credit_limit)||0, notes||'', 
      customer_id_display||'', contact_person||'', alternate_phone||'', company_name||'', business_type||'',
      shipping_address_line1||'', shipping_address_line2||'', shipping_city||'', shipping_state||'', shipping_country||'India', shipping_pincode||'',
      payment_terms||'', Number(opening_balance)||0, tax_preference||'taxable', tags||'', preferred_payment_method||'', customer_category||'', status||'active',
      req.params.id, req.orgId
    );
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
