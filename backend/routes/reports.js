// backend/routes/reports.js
'use strict';
const express = require('express');
const router  = express.Router();
const { stmts, db } = require('../db');
const { requireAuth } = require('../auth');
const { sendSuccess, sendError } = require('../utils/response');
const cache = require('../utils/cache');

// Dashboard summary (Redis cached 5 min)
router.get('/summary', requireAuth, async (req, res) => {
  try {
    const cacheKey = 'summary:' + req.orgId;
    const cached   = await cache.get(cacheKey);
    if (cached) return sendSuccess(res, cached);

    const [rev, exp, out, count, cust, status, topCust, expCat, monRev, monExp] = await Promise.all([
      stmts.getTotalRevenue.get(req.orgId),
      stmts.getTotalExpenses.get(req.orgId),
      stmts.getOutstandingAmount.get(req.orgId),
      stmts.getInvoiceCount.get(req.orgId),
      stmts.getCustomerCount.get(req.orgId),
      stmts.getInvoicesByStatus.all(req.orgId),
      stmts.getTopCustomers.all(req.orgId),
      stmts.getExpensesByCategory.all(req.orgId),
      stmts.getMonthlyRevenue.all(req.orgId),
      stmts.getMonthlyExpenses.all(req.orgId),
    ]);

    const summary = {
      totalRevenue:     (rev && rev.total)   || 0,
      totalExpenses:    (exp && exp.total)   || 0,
      outstanding:      (out && out.total)   || 0,
      invoiceCount:     (count && count.count) || 0,
      customerCount:    (cust && cust.count) || 0,
      invoicesByStatus: status         || [],
      topCustomers:     topCust        || [],
      expenseByCategory: expCat        || [],
      monthlyRevenue:   monRev         || [],
      monthlyExpenses:  monExp         || [],
    };

    await cache.set(cacheKey, summary, 300);
    sendSuccess(res, summary);
  } catch (err) {
    console.error('Get report summary error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

// Chart data
router.get('/chart', requireAuth, async (req, res) => {
  try {
    const { mode } = req.query;
    let data = [];
    if (mode === 'day')       data = await stmts.getDailyChartData.all(req.orgId, req.orgId, req.orgId, req.orgId);
    else if (mode === 'year') data = await stmts.getYearlyChartData.all(req.orgId, req.orgId, req.orgId, req.orgId);
    else                      data = await stmts.getMonthlyChartData.all(req.orgId, req.orgId, req.orgId, req.orgId);
    sendSuccess(res, { points: data });
  } catch (err) {
    console.error('Get chart data error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

// Aged Receivables
router.get('/aged-receivables', requireAuth, async (req, res) => {
  try {
    const rows = await stmts.getAgedReceivables.all(req.orgId);
    sendSuccess(res, rows);
  } catch (err) {
    console.error('Aged receivables error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

// P&L Statement
router.get('/pl-statement', requireAuth, async (req, res) => {
  try {
    const [revenue, expenses] = await Promise.all([
      stmts.getPLByMonth.all(req.orgId),
      stmts.getPLExpensesByMonth.all(req.orgId),
    ]);
    sendSuccess(res, { revenue, expenses });
  } catch (err) {
    console.error('P&L error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

// Cash Flow
router.get('/cash-flow', requireAuth, async (req, res) => {
  try {
    const [inflows, outflows] = await Promise.all([
      stmts.getCashFlowInflows.all(req.orgId),
      stmts.getCashFlowOutflows.all(req.orgId),
    ]);
    sendSuccess(res, { inflows, outflows });
  } catch (err) {
    console.error('Cash flow error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

// GST Summary
router.get('/gst-summary', requireAuth, async (req, res) => {
  try {
    const [collected, paid] = await Promise.all([
      stmts.getGSTCollected.all(req.orgId),
      stmts.getGSTPaid.all(req.orgId),
    ]);
    sendSuccess(res, { collected, paid });
  } catch (err) {
    console.error('GST summary error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

// Expense Analytics
router.get('/expense-analytics', requireAuth, async (req, res) => {
  try {
    const [topVendors, trend, byCategory] = await Promise.all([
      stmts.getTopVendorsByExpense.all(req.orgId),
      stmts.getExpenseTrend.all(req.orgId),
      stmts.getExpenseMonthVsCategory.all(req.orgId),
    ]);
    sendSuccess(res, { topVendors, trend, byCategory });
  } catch (err) {
    console.error('Expense analytics error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

// AP Aging
router.get('/ap-aging', requireAuth, async (req, res) => {
  try {
    const rows = await stmts.getAPAging.all(req.orgId);
    sendSuccess(res, rows);
  } catch (err) {
    console.error('AP aging error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

// Balance Sheet
router.get('/balance-sheet', requireAuth, async (req, res) => {
  try {
    const [assets, liabilities] = await Promise.all([
      stmts.getBalanceSheetAssets.get(req.orgId),
      stmts.getBalanceSheetLiabilities.get(req.orgId, req.orgId),
    ]);
    sendSuccess(res, { assets, liabilities });
  } catch (err) {
    console.error('Balance sheet error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

// Trial Balance
router.get('/trial-balance', requireAuth, async (req, res) => {
  try {
    const rows = await stmts.getTrialBalance.all(
      req.orgId, req.orgId, req.orgId, req.orgId, req.orgId, req.orgId
    );
    sendSuccess(res, rows);
  } catch (err) {
    console.error('Trial balance error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

// Cash Ledger
router.get('/cash-ledger', requireAuth, async (req, res) => {
  try {
    const rows = await stmts.getCashLedger.all(req.orgId, req.orgId);
    sendSuccess(res, rows);
  } catch (err) {
    console.error('Cash ledger error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

module.exports = router;
