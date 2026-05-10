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
