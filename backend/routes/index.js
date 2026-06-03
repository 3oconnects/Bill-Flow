// backend/routes/index.js
const express = require('express');
const router = express.Router();

router.use((req, res, next) => {
  console.log('[API] ' + req.method + ' ' + req.url);
  next();
});

const authRoutes         = require('./auth');
const orgRoutes          = require('./organization');
const customerRoutes     = require('./customers');
const vendorRoutes       = require('./vendors');
const invoiceRoutes      = require('./invoices');
const paymentRoutes      = require('./payments');
const expenseRoutes      = require('./expenses');
const productRoutes      = require('./products');
const reportRoutes       = require('./reports');
const warrantyRoutes     = require('./warranty');
const goodsReturnsRoutes = require('./goodsReturns');
const apRoutes           = require('./ap');
const recurringRoutes    = require('./recurring');
const quotationRoutes    = require('./quotations');
const creditNoteRoutes   = require('./creditNotes');

router.use('/auth',            authRoutes);
router.use('/org',             orgRoutes);
router.use('/team',            orgRoutes);
router.use('/customers',       customerRoutes);
router.use('/vendors',         vendorRoutes);
router.use('/invoices',        invoiceRoutes);
router.use('/payments',        paymentRoutes);
router.use('/expenses',        expenseRoutes);
router.use('/products',        productRoutes);
router.use('/reports',         reportRoutes);
router.use('/warranty-claims', warrantyRoutes);
router.use('/goods-returns',   goodsReturnsRoutes);
router.use('/ap',             apRoutes);
router.use('/recurring',      recurringRoutes);
router.use('/quotations',     quotationRoutes);
router.use('/credit-notes',   creditNoteRoutes);

module.exports = router;
