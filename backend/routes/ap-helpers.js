// backend/routes/ap-helpers.js — Shared utilities for AP routes
const { v4: uuid } = require('uuid');
const { stmts, db } = require('../db');

const DOC_TYPES = ['down-payments', 'invoices', 'credit-memos', 'reserve-invoices'];

function calcItemTotals(items = []) {
  let subtotal = 0, tax_total = 0;
  const out = items.map(it => {
    const base      = (it.quantity || 0) * (it.unit_price || 0);
    const discAmt   = base * ((it.discount || 0) / 100);
    const taxable   = base - discAmt;
    const taxAmt    = taxable * ((it.tax_rate || 0) / 100);
    subtotal  += taxable;
    tax_total += taxAmt;
    return { ...it, tax_amount: +taxAmt.toFixed(2), line_total: +(taxable + taxAmt).toFixed(2) };
  });
  return { items: out, subtotal: +subtotal.toFixed(2), tax_amount: +tax_total.toFixed(2), total_amount: +(subtotal + tax_total).toFixed(2) };
}

async function genDocNo(orgId, prefix) {
  const year = new Date().getFullYear();
  const tableMap = { APD: 'ap_down_payments', API: 'ap_invoices', APC: 'ap_credit_memos', APR: 'ap_reserve_invoices' };
  const { rows } = await db.query(
    `SELECT COUNT(*) AS cnt FROM ${tableMap[prefix]} WHERE org_id=$1 AND EXTRACT(YEAR FROM created_at)=$2`,
    [orgId, year]
  );
  return `${prefix}-${year}-${String(parseInt(rows[0].cnt || 0) + 1).padStart(4, '0')}`;
}

function apLog(orgId, docType, docId, action, oldStatus, newStatus, note, userId) {
  return stmts.insertAPLog.run(uuid(), orgId, docType, docId, action, oldStatus || null, newStatus || null, note || null, userId);
}

function validateType(req, res, sendError) {
  if (!DOC_TYPES.includes(req.params.type)) {
    sendError(res, 'Invalid document type', 'BAD_REQUEST', 400);
    return false;
  }
  return true;
}

module.exports = { DOC_TYPES, calcItemTotals, genDocNo, apLog, validateType };
