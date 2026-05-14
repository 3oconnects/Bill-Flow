// backend/routes/index.js
const express = require('express');
const router = express.Router();

router.use((req, res, next) => {
  console.log(`[API] ${req.method} ${req.url}`);
  next();
});

const authRoutes = require('./auth');
const orgRoutes = require('./organization');
const customerRoutes = require('./customers');
const vendorRoutes = require('./vendors');
const invoiceRoutes = require('./invoices');
const paymentRoutes = require('./payments');
const expenseRoutes = require('./expenses');
const productRoutes = require('./products');
const reportRoutes = require('./reports');
const warrantyRoutes = require('./warranty');

router.use('/auth', authRoutes);
router.use('/org', orgRoutes);
router.use('/team', orgRoutes); // Added to support /api/team
router.use('/customers', customerRoutes);
router.use('/vendors', vendorRoutes);
router.use('/invoices', invoiceRoutes);
router.use('/payments', paymentRoutes);
router.use('/expenses', expenseRoutes);
router.use('/products', productRoutes);
router.use('/reports', reportRoutes);
router.use('/warranty-claims', warrantyRoutes);

// Special case for backward compatibility of receipt search
router.get('/receipt/search', (req, res, next) => {
  // Delegate to reports router which handles /receipt/search
  req.url = '/reports/receipt/search';
  next();
});

module.exports = router;
