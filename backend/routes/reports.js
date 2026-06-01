// backend/routes/reports.js
const express = require('express');
const router = express.Router();
const { stmts } = require('../db');
const { requireAuth } = require('../auth');
const { sendSuccess, sendError } = require('../utils/response');

router.get('/summary', requireAuth, async (req, res) => {
  try {
    const summary = {
      totalRevenue: 0, totalExpenses: 0, outstanding: 0, overdue: 0,
      invoiceCount: 0, customerCount: 0, monthlyRevenue: [], monthlyExpenses: [],
      invoicesByStatus: [], topCustomers: [], expenseByCategory: []
    };

    // Parallel fetch for ALL metrics for maximum speed
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
      stmts.getMonthlyExpenses.all(req.orgId)
    ]);

    summary.totalRevenue = rev?.total || 0;
    summary.totalExpenses = exp?.total || 0;
    summary.outstanding = out?.total || 0;
    summary.invoiceCount = count?.count || 0;
    summary.customerCount = cust?.count || 0;
    summary.invoicesByStatus = status;
    summary.topCustomers = topCust;
    summary.expenseByCategory = expCat;
    summary.monthlyRevenue = monRev;
    summary.monthlyExpenses = monExp;

    sendSuccess(res, summary);
  } catch (err) {
    console.error('Get report summary error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

router.get('/chart', requireAuth, async (req, res) => {
  console.log('API: GET /api/reports/chart hit', req.query);
  try {
    const { mode } = req.query;
    let data = [];
    if (mode === 'day') data = await stmts.getDailyChartData.all(req.orgId, req.orgId, req.orgId, req.orgId);
    else if (mode === 'year') data = await stmts.getYearlyChartData.all(req.orgId, req.orgId, req.orgId, req.orgId);
    else data = await stmts.getMonthlyChartData.all(req.orgId, req.orgId, req.orgId, req.orgId);

    sendSuccess(res, { points: data });
  } catch (err) {
    console.error('Get chart data error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

module.exports = router;

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

// A/P Aging
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
