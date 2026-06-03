// backend/routes/gst.js
const express = require('express');
const router  = express.Router();
const { db }  = require('../db');
const { requireAuth } = require('../auth');
const { sendSuccess, sendError } = require('../utils/response');
const GSTCalculationService = require('../services/gstCalculationService');

// ── GSTR-1 ────────────────────────────────────────────────────────────────────
router.get('/gstr1', requireAuth, async (req, res) => {
  try {
    const month = parseInt(req.query.month) || new Date().getMonth() + 1;
    const year  = parseInt(req.query.year)  || new Date().getFullYear();
    const data  = await GSTCalculationService.generateGSTR1(req.orgId, month, year);
    sendSuccess(res, data);
  } catch (err) {
    console.error('GSTR-1 error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

// ── GSTR-3B ───────────────────────────────────────────────────────────────────
router.get('/gstr3b', requireAuth, async (req, res) => {
  try {
    const month = parseInt(req.query.month) || new Date().getMonth() + 1;
    const year  = parseInt(req.query.year)  || new Date().getFullYear();
    const data  = await GSTCalculationService.generateGSTR3B(req.orgId, month, year);
    sendSuccess(res, data);
  } catch (err) {
    console.error('GSTR-3B error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

// ── ITC Ledger ────────────────────────────────────────────────────────────────
router.get('/itc', requireAuth, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT itc.*, ap.vendor_name, ap.invoice_number, ap.invoice_date
         FROM itc_ledger itc
         LEFT JOIN ap_invoices ap ON itc.ap_invoice_id = ap.id
        WHERE itc.org_id = $1
        ORDER BY itc.created_at DESC`,
      [req.orgId]
    );
    sendSuccess(res, rows);
  } catch (err) {
    console.error('ITC ledger error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

// ── Claim ITC ─────────────────────────────────────────────────────────────────
router.post('/itc/:apInvoiceId/claim', requireAuth, async (req, res) => {
  try {
    const result = await GSTCalculationService.trackInputTaxCredit(
      req.orgId, req.params.apInvoiceId
    );
    if (!result) return sendError(res, 'AP invoice not found', 'NOT_FOUND', 404);
    sendSuccess(res, result);
  } catch (err) {
    console.error('Claim ITC error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

// ── GST summary for dashboard ─────────────────────────────────────────────────
router.get('/summary', requireAuth, async (req, res) => {
  try {
    const year = parseInt(req.query.year) || new Date().getFullYear();
    const { rows } = await db.query(
      `SELECT
         EXTRACT(MONTH FROM COALESCE(i.date, i.created_at))::INT AS month,
         COALESCE(SUM(i.cgst), 0)  AS cgst_collected,
         COALESCE(SUM(i.sgst), 0)  AS sgst_collected,
         COALESCE(SUM(i.igst), 0)  AS igst_collected,
         COALESCE(SUM(i.cgst + i.sgst + i.igst), 0) AS total_gst_collected
         FROM invoices i
        WHERE i.org_id = $1
          AND EXTRACT(YEAR FROM COALESCE(i.date, i.created_at)) = $2
          AND i.deleted_at IS NULL
          AND i.status NOT IN ('draft','cancelled')
        GROUP BY 1
        ORDER BY 1`,
      [req.orgId, year]
    );
    sendSuccess(res, rows);
  } catch (err) {
    console.error('GST summary error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

module.exports = router;
