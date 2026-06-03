// backend/validators.js
// Zod validation schemas for all API routes
'use strict';
const { z } = require('zod');

const authSchemas = {
  register: z.object({
    orgName:  z.string().min(2).max(255).trim(),
    name:     z.string().min(2).max(255).trim(),
    email:    z.string().email().toLowerCase(),
    password: z.string().min(8).max(128),
  }),
  login: z.object({
    email:    z.string().email().toLowerCase(),
    password: z.string().min(1),
  }),
  changePassword: z.object({
    currentPassword: z.string().min(1),
    newPassword:     z.string().min(8).max(128),
    confirmPassword: z.string().min(8).max(128),
  }).refine(function(d){ return d.newPassword === d.confirmPassword; }, {
    message: "Passwords don't match", path: ['confirmPassword'],
  }),
};

const orgSchemas = {
  update: z.object({
    name:         z.string().min(2).max(255).trim().optional(),
    email:        z.string().email().toLowerCase().optional(),
    phone:        z.string().regex(/^[0-9\s\-\+\(\)]{0,20}$/).optional(),
    address:      z.string().max(500).optional(),
    city:         z.string().max(100).optional(),
    state:        z.string().max(100).optional(),
    country:      z.string().max(100).optional(),
    pincode:      z.string().regex(/^[0-9\-]{0,20}$/).optional(),
    gstin:        z.string().regex(/^[A-Z0-9]{15}$/).optional().or(z.literal('')),
    pan:          z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/).optional().or(z.literal('')),
    currency:     z.enum(['INR','USD','EUR','GBP','JPY']).optional(),
    inv_prefix:   z.string().max(20).optional(),
    default_notes: z.string().max(1000).optional(),
    default_terms: z.string().max(1000).optional(),
  }),
};

const customerSchemas = {
  create: z.object({
    name:         z.string().min(1).max(255).trim(),
    email:        z.string().email().optional().or(z.literal('')),
    phone:        z.string().max(20).optional(),
    address:      z.string().max(500).optional(),
    city:         z.string().max(100).optional(),
    state:        z.string().max(100).optional(),
    country:      z.string().max(100).optional(),
    pincode:      z.string().max(10).optional(),
    gstin:        z.string().max(15).optional(),
    pan:          z.string().max(10).optional(),
    currency:     z.string().max(3).optional(),
    credit_limit: z.number().nonnegative().optional(),
    notes:        z.string().max(1000).optional(),
  }),
};

const vendorSchemas = {
  create: z.object({
    vendor_name:   z.string().min(1).max(255).trim(),
    email:         z.string().email().optional().or(z.literal('')),
    phone:         z.string().max(20).optional(),
    address:       z.string().max(500).optional(),
    city:          z.string().max(100).optional(),
    state:         z.string().max(100).optional(),
    country:       z.string().max(100).optional(),
    pincode:       z.string().max(10).optional(),
    gstin:         z.string().max(15).optional(),
    pan:           z.string().max(10).optional(),
    payment_terms: z.string().max(100).optional(),
    notes:         z.string().max(1000).optional(),
  }),
};

const invoiceItemSchema = z.object({
  description: z.string().min(1).max(500),
  product_id:  z.string().uuid().optional().nullable(),
  hsn_code:    z.string().max(10).optional(),
  sku:         z.string().max(50).optional(),
  quantity:    z.number().positive(),
  unit_price:  z.number().nonnegative(),
  tax_rate:    z.number().nonnegative().max(100).optional(),
  tax_amount:  z.number().nonnegative().optional(),
  amount:      z.number().nonnegative(),
});

const invoiceSchemas = {
  create: z.object({
    number:          z.string().min(1).max(50),
    customer_name:   z.string().min(1).max(255),
    customer_id:     z.string().uuid().optional().nullable(),
    customer_email:  z.string().email().optional().or(z.literal('')),
    customer_phone:  z.string().max(20).optional(),
    date:            z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    due_date:        z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
    currency:        z.string().length(3).optional(),
    place_of_supply: z.string().max(50).optional(),
    status:          z.enum(['draft','sent','paid','overdue','cancelled']).optional(),
    items:           z.array(invoiceItemSchema).min(1),
    subtotal:        z.number().nonnegative(),
    discount_pct:    z.number().nonnegative().max(100).optional(),
    discount_amount: z.number().nonnegative().optional(),
    tax:             z.number().nonnegative().optional(),
    total:           z.number().nonnegative(),
    notes:           z.string().max(2000).optional(),
    terms:           z.string().max(2000).optional(),
  }),
};

const paymentSchemas = {
  create: z.object({
    amount:      z.number().positive(),
    date:        z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    customer_id: z.string().uuid().optional().nullable(),
    invoice_id:  z.string().uuid().optional().nullable(),
    method:      z.enum(['cash','bank_transfer','cheque','upi','razorpay','other']).optional(),
    currency:    z.string().length(3).optional(),
    reference:   z.string().max(200).optional(),
    notes:       z.string().max(1000).optional(),
    allocation_details: z.record(z.object({
      amount: z.number().positive(),
      notes:  z.string().optional(),
    })).optional(),
  }),
};

const expenseSchemas = {
  create: z.object({
    date:        z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    amount:      z.number().positive(),
    category:    z.string().min(1).max(100),
    description: z.string().max(500).optional(),
    vendor_id:   z.string().uuid().optional().nullable(),
    gst_rate:    z.number().nonnegative().max(100).optional(),
    reference:   z.string().max(200).optional(),
  }),
};

const teamSchemas = {
  invite: z.object({
    name:  z.string().min(2).max(255).trim(),
    email: z.string().email().toLowerCase(),
    role:  z.enum(['admin','user','viewer']),
  }),
  updateRole: z.object({
    role: z.enum(['admin','user','viewer']),
  }),
};

module.exports = {
  authSchemas,
  orgSchemas,
  customerSchemas,
  vendorSchemas,
  invoiceSchemas,
  paymentSchemas,
  expenseSchemas,
  teamSchemas,
};
