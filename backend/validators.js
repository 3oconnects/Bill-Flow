/**
 * Input Validation Schemas using Zod
 * Ensures type safety and consistent error handling across API routes
 */

const { z } = require('zod');

// ============================================
// AUTH SCHEMAS
// ============================================

const authSchemas = {
  register: z.object({
    orgName: z.string().min(2).max(255).trim(),
    ownerName: z.string().min(2).max(255).trim(),
    email: z.string().email().toLowerCase(),
    password: z.string().min(8).max(128),
  }),

  login: z.object({
    email: z.string().email().toLowerCase(),
    password: z.string().min(1),
  }),

  changePassword: z.object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8).max(128),
    confirmPassword: z.string().min(8).max(128),
  }).refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  }),
};

// ============================================
// ORGANIZATION SCHEMAS
// ============================================

const orgSchemas = {
  update: z.object({
    name: z.string().min(2).max(255).trim().optional(),
    email: z.string().email().toLowerCase().optional(),
    phone: z.string().regex(/^[0-9\s\-\+\(\)]{0,20}$/).optional(),
    address: z.string().max(500).optional(),
    city: z.string().max(100).optional(),
    state: z.string().max(100).optional(),
    country: z.string().max(100).optional(),
    pincode: z.string().regex(/^[0-9\-]{0,20}$/).optional(),
    gstin: z.string().regex(/^[A-Z0-9]{15}$/).optional(),
    pan: z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/).optional(),
    currency: z.enum(['INR', 'USD', 'EUR', 'GBP', 'JPY']).optional(),
    invPrefix: z.string().max(20).optional(),
    defaultNotes: z.string().max(1000).optional(),
    defaultTerms: z.string().max(1000).optional(),
  }),
};

// ============================================
// CUSTOMER SCHEMAS
// ============================================

const customerSchemas = {
  create: z.object({
    name: z.string().min(2).max(255).trim(),
    email: z.string().email().toLowerCase().optional(),
    phone: z.string().regex(/^[0-9\s\-\+\(\)]{0,20}$/).optional(),
    address: z.string().max(500).optional(),
    city: z.string().max(100).optional(),
    state: z.string().max(100).optional(),
    country: z.string().max(100).optional(),
    pincode: z.string().regex(/^[0-9\-]{0,20}$/).optional(),
    gstin: z.string().regex(/^[A-Z0-9]{15}$/).optional(),
    pan: z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/).optional(),
    currency: z.enum(['INR', 'USD', 'EUR', 'GBP', 'JPY']).default('INR'),
    creditLimit: z.number().min(0).optional(),
    notes: z.string().max(1000).optional(),
  }),

  update: z.object({
    name: z.string().min(2).max(255).trim().optional(),
    email: z.string().email().toLowerCase().optional(),
    phone: z.string().regex(/^[0-9\s\-\+\(\)]{0,20}$/).optional(),
    address: z.string().max(500).optional(),
    city: z.string().max(100).optional(),
    state: z.string().max(100).optional(),
    country: z.string().max(100).optional(),
    pincode: z.string().regex(/^[0-9\-]{0,20}$/).optional(),
    gstin: z.string().regex(/^[A-Z0-9]{15}$/).optional(),
    pan: z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/).optional(),
    currency: z.enum(['INR', 'USD', 'EUR', 'GBP', 'JPY']).optional(),
    creditLimit: z.number().min(0).optional(),
    notes: z.string().max(1000).optional(),
  }),
};

// ============================================
// VENDOR SCHEMAS
// ============================================

const vendorSchemas = {
  create: z.object({
    name: z.string().min(2).max(255).trim(),
    email: z.string().email().toLowerCase().optional(),
    phone: z.string().regex(/^[0-9\s\-\+\(\)]{0,20}$/).optional(),
    address: z.string().max(500).optional(),
    city: z.string().max(100).optional(),
    state: z.string().max(100).optional(),
    country: z.string().max(100).optional(),
    pincode: z.string().regex(/^[0-9\-]{0,20}$/).optional(),
    gstin: z.string().regex(/^[A-Z0-9]{15}$/).optional(),
    pan: z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/).optional(),
    bankAccount: z.string().max(50).optional(),
    ifsc: z.string().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/).optional(),
    currency: z.enum(['INR', 'USD', 'EUR', 'GBP', 'JPY']).default('INR'),
    notes: z.string().max(1000).optional(),
  }),

  update: z.object({
    name: z.string().min(2).max(255).trim().optional(),
    email: z.string().email().toLowerCase().optional(),
    phone: z.string().regex(/^[0-9\s\-\+\(\)]{0,20}$/).optional(),
    address: z.string().max(500).optional(),
    city: z.string().max(100).optional(),
    state: z.string().max(100).optional(),
    country: z.string().max(100).optional(),
    pincode: z.string().regex(/^[0-9\-]{0,20}$/).optional(),
    gstin: z.string().regex(/^[A-Z0-9]{15}$/).optional(),
    pan: z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/).optional(),
    bankAccount: z.string().max(50).optional(),
    ifsc: z.string().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/).optional(),
    currency: z.enum(['INR', 'USD', 'EUR', 'GBP', 'JPY']).optional(),
    notes: z.string().max(1000).optional(),
  }),
};

// ============================================
// INVOICE SCHEMAS
// ============================================

const invoiceSchemas = {
  create: z.object({
    customerId: z.string().uuid(),
    customerName: z.string().min(1).max(255).optional(),
    date: z.string().datetime().optional(),
    dueDate: z.string().datetime().optional(),
    currency: z.enum(['INR', 'USD', 'EUR', 'GBP', 'JPY']).default('INR'),
    placeOfSupply: z.string().max(100).optional(),
    discountPct: z.number().min(0).max(100).default(0),
    notes: z.string().max(1000).optional(),
    terms: z.string().max(1000).optional(),
    items: z.array(z.object({
      description: z.string().min(1).max(500),
      hsnCode: z.string().max(20).optional(),
      productId: z.string().uuid().optional(),
      sku: z.string().max(100).optional(),
      quantity: z.number().min(0.01),
      unitPrice: z.number().min(0),
      taxRate: z.enum(['0', '5', '12', '18', '28']).default('18'),
    })).min(1),
  }),

  update: z.object({
    customerId: z.string().uuid().optional(),
    date: z.string().datetime().optional(),
    dueDate: z.string().datetime().optional(),
    currency: z.enum(['INR', 'USD', 'EUR', 'GBP', 'JPY']).optional(),
    placeOfSupply: z.string().max(100).optional(),
    discountPct: z.number().min(0).max(100).optional(),
    notes: z.string().max(1000).optional(),
    terms: z.string().max(1000).optional(),
    items: z.array(z.object({
      id: z.string().uuid().optional(),
      description: z.string().min(1).max(500),
      hsnCode: z.string().max(20).optional(),
      productId: z.string().uuid().optional(),
      sku: z.string().max(100).optional(),
      quantity: z.number().min(0.01),
      unitPrice: z.number().min(0),
      taxRate: z.enum(['0', '5', '12', '18', '28']),
    })).optional(),
  }),

  updateStatus: z.object({
    status: z.enum(['draft', 'sent', 'paid', 'overdue', 'cancelled']),
  }),
};

// ============================================
// PAYMENT SCHEMAS
// ============================================

const paymentSchemas = {
  create: z.object({
    invoiceId: z.string().uuid(),
    amount: z.number().min(0.01),
    date: z.string().datetime(),
    currency: z.enum(['INR', 'USD', 'EUR', 'GBP', 'JPY']),
    method: z.enum(['upi', 'neft', 'rtgs', 'imps', 'cash', 'card', 'cheque', 'wallet']),
    reference: z.string().max(100).optional(),
    notes: z.string().max(500).optional(),
  }),
};

// ============================================
// EXPENSE SCHEMAS
// ============================================

const expenseSchemas = {
  create: z.object({
    category: z.enum([
      'office-rent', 'utilities', 'office-supplies', 'travel', 'meals',
      'vehicle', 'maintenance', 'insurance', 'marketing', 'software',
      'professional-fees', 'depreciation', 'interest', 'other'
    ]),
    amount: z.number().min(0.01),
    date: z.string().datetime(),
    vendorId: z.string().uuid().optional(),
    gstnRate: z.enum(['0', '5', '12', '18', '28']).default('18'),
    reference: z.string().max(100).optional(),
    notes: z.string().max(500).optional(),
  }),

  update: z.object({
    category: z.enum([
      'office-rent', 'utilities', 'office-supplies', 'travel', 'meals',
      'vehicle', 'maintenance', 'insurance', 'marketing', 'software',
      'professional-fees', 'depreciation', 'interest', 'other'
    ]).optional(),
    amount: z.number().min(0.01).optional(),
    date: z.string().datetime().optional(),
    vendorId: z.string().uuid().optional(),
    gstRate: z.enum(['0', '5', '12', '18', '28']).optional(),
    reference: z.string().max(100).optional(),
    notes: z.string().max(500).optional(),
  }),
};

// ============================================
// TEAM SCHEMAS
// ============================================

const teamSchemas = {
  addMember: z.object({
    name: z.string().min(2).max(255).trim(),
    email: z.string().email().toLowerCase(),
    role: z.enum(['admin', 'staff', 'member']).default('member'),
  }),

  updateMember: z.object({
    name: z.string().min(2).max(255).trim().optional(),
    email: z.string().email().toLowerCase().optional(),
    role: z.enum(['admin', 'staff', 'member']).optional(),
  }),
};

// ============================================
// VALIDATION MIDDLEWARE
// ============================================

/**
 * Create validation middleware for a schema
 * @param {z.ZodSchema} schema - Zod schema
 * @returns {Function} Express middleware
 */
function validate(schema) {
  return (req, res, next) => {
    try {
      const validated = schema.parse(req.body);
      req.validated = validated;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors = {};
        error.errors.forEach((err) => {
          const path = err.path.join('.');
          fieldErrors[path] = err.message;
        });
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: fieldErrors,
        });
      }
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  };
}

// ============================================
// EXPORTS
// ============================================

module.exports = {
  // Schemas
  authSchemas,
  orgSchemas,
  customerSchemas,
  vendorSchemas,
  invoiceSchemas,
  paymentSchemas,
  expenseSchemas,
  teamSchemas,

  // Middleware factory
  validate,
};
