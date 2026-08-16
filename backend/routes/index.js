// backend/routes/index.js
'use strict';
const express = require('express');
const router  = express.Router();
const { db }  = require('../db');

// Health checks (no auth)
router.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), ts: new Date().toISOString() });
});
router.get('/health/db', async (req, res) => {
  try {
    await db.query('SELECT 1');
    res.json({ status: 'ok', db: 'connected', ts: new Date().toISOString() });
  } catch (e) {
    res.status(503).json({ status: 'error', db: e.message });
  }
});

if (process.env.NODE_ENV !== 'production') {
  router.use((req, res, next) => {
    console.log('[API] ' + req.method + ' ' + req.url);
    next();
  });
}

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
const goodsReceiptsRoutes = require('./goodsReceipts');
const apRoutes           = require('./ap');
const recurringRoutes    = require('./recurring');
const quotationRoutes      = require('./quotations');
const creditNoteRoutes     = require('./creditNotes');
const gstRoutes            = require('./gst');
const bankingRoutes        = require('./banking');
const razorpayRoutes       = require('./razorpay');
const vendorPaymentRoutes  = require('./vendorPayments');
const billingRoutes        = require('./billing');
const purchaseQuotationsRoutes = require('./purchaseQuotations');
const purchaseOrdersRoutes     = require('./purchaseOrders');
const blanketAgreementsRoutes  = require('./blanketAgreements');
const purchaseRequestsRoutes   = require('./purchaseRequests');

// Core API endpoints
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
router.use('/goods-receipts',  goodsReceiptsRoutes);
router.use('/ap',              apRoutes);
router.use('/recurring',       recurringRoutes);
router.use('/quotations',      quotationRoutes);
router.use('/credit-notes',    creditNoteRoutes);
router.use('/gst',             gstRoutes);
router.use('/banking',         bankingRoutes);
router.use('/razorpay',        razorpayRoutes);
router.use('/vendor-payments', vendorPaymentRoutes);
router.use('/billing',         billingRoutes);
router.use('/purchase-quotations', purchaseQuotationsRoutes);
router.use('/purchase-orders',     purchaseOrdersRoutes);
router.use('/blanket-agreements',  blanketAgreementsRoutes);
router.use('/purchase-requests',   purchaseRequestsRoutes);

module.exports = router;
