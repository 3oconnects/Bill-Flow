// backend/routes/ap.js — Accounts Payable: Down Payments, Invoices, Credit Memos, Reserve Invoices
const express = require('express');
const router  = express.Router();
const { v4: uuid } = require('uuid');
const { stmts, db } = require('../db');
const { requireAuth, requireAdmin } = require('../auth');
const { sendSuccess, sendError } = require('../utils/response');

// ── Helpers ────────────────────────────────────────────────────────────

const DOC_TYPES = ['down-payments', 'invoices', 'credit-memos', 'reserve-invoices'];

function calcItemTotals(items = []) {
  let subtotal = 0, tax_total = 0;
  const out = items.map(it => {
    const base     = (it.quantity || 0) * (it.unit_price || 0);
    const discAmt  = base * ((it.discount || 0) / 100);
    const taxable  = base - discAmt;
    const taxAmt   = taxable * ((it.tax_rate || 0) / 100);
    const lineTotal = taxable + taxAmt;
    subtotal  += taxable;
    tax_total += taxAmt;
    return { ...it, tax_amount: +taxAmt.toFixed(2), line_total: +lineTotal.toFixed(2) };
  });
  return { items: out, subtotal: +subtotal.toFixed(2), tax_amount: +tax_total.toFixed(2), total_amount: +(subtotal + tax_total).toFixed(2) };
}

async function genDocNo(orgId, prefix) {
  const year = new Date().getFullYear();
  const tableMap = {
    'APD': 'ap_down_payments', 'API': 'ap_invoices',
    'APC': 'ap_credit_memos',  'APR': 'ap_reserve_invoices',
  };
  const table = tableMap[prefix];
  const { rows } = await db.query(
    `SELECT COUNT(*) AS cnt FROM ${table} WHERE org_id=$1 AND EXTRACT(YEAR FROM created_at)=$2`,
    [orgId, year]
  );
  const seq = String(parseInt(rows[0].cnt || 0) + 1).padStart(4, '0');
  return `${prefix}-${year}-${seq}`;
}

function apLog(orgId, docType, docId, action, oldStatus, newStatus, note, userId) {
  return stmts.insertAPLog.run(uuid(), orgId, docType, docId, action, oldStatus || null, newStatus || null, note || null, userId);
}

function validateType(req, res) {
  if (!DOC_TYPES.includes(req.params.type)) {
    sendError(res, 'Invalid document type', 'BAD_REQUEST', 400);
    return false;
  }
  return true;
}

// ── Stats ──────────────────────────────────────────────────── GET /:type/stats
router.get('/:type/stats', requireAuth, async (req, res) => {
  if (!validateType(req, res)) return;
  try {
    const t = req.params.type;
    let stats;
    if (t === 'down-payments')    stats = await stmts.getAPDownPaymentStats.get(req.orgId);
    else if (t === 'invoices')    stats = await stmts.getAPInvoiceStats.get(req.orgId);
    else if (t === 'credit-memos') stats = await stmts.getAPCreditMemoStats.get(req.orgId);
    else                          stats = await stmts.getAPReserveInvoiceStats.get(req.orgId);
    sendSuccess(res, stats);
  } catch (err) {
    console.error('AP stats error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

// ── List ───────────────────────────────────────────────────── GET /:type
router.get('/:type', requireAuth, async (req, res) => {
  if (!validateType(req, res)) return;
  try {
    const { type } = req.params;
    const { status, vendor_id, search, from, to } = req.query;
    let rows;

    if (type === 'down-payments')    rows = await stmts.listAPDownPayments.all(req.orgId);
    else if (type === 'invoices')    rows = await stmts.listAPInvoices.all(req.orgId);
    else if (type === 'credit-memos') rows = await stmts.listAPCreditMemos.all(req.orgId);
    else                             rows = await stmts.listAPReserveInvoices.all(req.orgId);

    if (status && status !== 'all') rows = rows.filter(r => r.status === status);
    if (vendor_id) rows = rows.filter(r => r.vendor_id === vendor_id);
    if (from) rows = rows.filter(r => (r.invoice_date || r.payment_date || r.credit_date) >= from);
    if (to)   rows = rows.filter(r => (r.invoice_date || r.payment_date || r.credit_date) <= to);
    if (search) {
      const s = search.toLowerCase();
      rows = rows.filter(r =>
        r.doc_no?.toLowerCase().includes(s) ||
        r.vendor_name?.toLowerCase().includes(s) ||
        r.po_ref?.toLowerCase().includes(s) ||
        (r.vendor_inv_no || r.ref_invoice_no || r.vendor_ref_no || '').toLowerCase().includes(s)
      );
    }
    sendSuccess(res, rows);
  } catch (err) {
    console.error('AP list error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

// ── Get Single ────────────────────────────────────────────── GET /:type/:id
router.get('/:type/:id', requireAuth, async (req, res) => {
  if (!validateType(req, res)) return;
  try {
    const { type, id } = req.params;
    let doc, items = [], logs;

    if (type === 'down-payments') {
      doc = await stmts.getAPDownPayment.get(id, req.orgId);
    } else if (type === 'invoices') {
      doc = await stmts.getAPInvoice.get(id, req.orgId);
      if (doc) items = await stmts.getAPInvoiceItems.all(id);
    } else if (type === 'credit-memos') {
      doc = await stmts.getAPCreditMemo.get(id, req.orgId);
      if (doc) items = await stmts.getAPCreditMemoItems.all(id);
    } else {
      doc = await stmts.getAPReserveInvoice.get(id, req.orgId);
      if (doc) items = await stmts.getAPReserveInvoiceItems.all(id);
    }

    if (!doc) return sendError(res, 'Document not found', 'NOT_FOUND', 404);
    logs = await stmts.getAPLogs.all(type, id);
    sendSuccess(res, { ...doc, items, logs });
  } catch (err) {
    console.error('AP get error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

// ── Create ────────────────────────────────────────────────── POST /:type
router.post('/:type', requireAuth, async (req, res) => {
  if (!validateType(req, res)) return;
  try {
    const { type } = req.params;
    const id = uuid();
    const body = req.body;

    if (!body.vendor_name) return sendError(res, 'Vendor name is required', 'VALIDATION_ERROR', 400);

    if (type === 'down-payments') {
      if (!body.payment_date) return sendError(res, 'Payment date required', 'VALIDATION_ERROR', 400);
      const doc_no = await genDocNo(req.orgId, 'APD');
      const base = parseFloat(body.amount || 0);
      const taxAmt = +(base * ((body.tax_rate || 18) / 100)).toFixed(2);
      await stmts.insertAPDownPayment.run(
        id, req.orgId, doc_no,
        body.vendor_id || null, body.vendor_name, body.vendor_gstin || null, body.po_ref || null,
        body.payment_date, body.due_date || null, body.currency || 'INR', body.payment_terms || null,
        base, body.pct_amount || null, body.tax_rate || 18, taxAmt, +(base + taxAmt).toFixed(2),
        body.notes || null, req.user.id
      );
      await apLog(req.orgId, type, id, 'Created', null, 'draft', null, req.user.id);
      return sendSuccess(res, { id, doc_no }, 201);
    }

    if (type === 'invoices') {
      if (!body.invoice_date) return sendError(res, 'Invoice date required', 'VALIDATION_ERROR', 400);
      if (!body.items?.length) return sendError(res, 'At least one item required', 'VALIDATION_ERROR', 400);
      const doc_no = await genDocNo(req.orgId, 'API');
      const { items, subtotal, tax_amount, total_amount } = calcItemTotals(body.items);
      const discAmt = +(subtotal * ((body.discount_pct || 0) / 100)).toFixed(2);
      await stmts.insertAPInvoice.run(
        id, req.orgId, doc_no,
        body.vendor_id || null, body.vendor_name, body.vendor_gstin || null, body.vendor_inv_no || null,
        body.po_ref || null, body.gr_ref || null,
        body.invoice_date, body.posting_date || body.invoice_date, body.due_date || null,
        body.currency || 'INR', body.payment_terms || null,
        subtotal, body.discount_pct || 0, discAmt, tax_amount, +(total_amount - discAmt).toFixed(2),
        body.notes || null, req.user.id
      );
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        await stmts.insertAPInvoiceItem.run(
          uuid(), req.orgId, id, it.product_id || null, it.item_code || '', it.item_name,
          it.description || '', it.quantity || 1, it.unit_price || 0, it.discount || 0,
          it.tax_rate || 18, it.tax_amount, it.line_total, i
        );
      }
      await apLog(req.orgId, type, id, 'Created', null, 'draft', null, req.user.id);
      return sendSuccess(res, { id, doc_no }, 201);
    }

    if (type === 'credit-memos') {
      if (!body.credit_date) return sendError(res, 'Credit date required', 'VALIDATION_ERROR', 400);
      if (!body.items?.length) return sendError(res, 'At least one item required', 'VALIDATION_ERROR', 400);
      const doc_no = await genDocNo(req.orgId, 'APC');
      const { items, subtotal, tax_amount, total_amount } = calcItemTotals(body.items);
      const discAmt = +(subtotal * ((body.discount_pct || 0) / 100)).toFixed(2);
      await stmts.insertAPCreditMemo.run(
        id, req.orgId, doc_no,
        body.vendor_id || null, body.vendor_name, body.vendor_gstin || null,
        body.ref_invoice_id || null, body.ref_invoice_no || null,
        body.credit_date, body.posting_date || body.credit_date,
        body.currency || 'INR', body.reason || 'Return Goods',
        subtotal, discAmt, tax_amount, +(total_amount - discAmt).toFixed(2),
        body.notes || null, req.user.id
      );
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        await stmts.insertAPCreditMemoItem.run(
          uuid(), req.orgId, id, it.product_id || null, it.item_code || '', it.item_name,
          it.description || '', it.quantity || 1, it.unit_price || 0, it.discount || 0,
          it.tax_rate || 18, it.tax_amount, it.line_total, i
        );
      }
      await apLog(req.orgId, type, id, 'Created', null, 'draft', null, req.user.id);
      return sendSuccess(res, { id, doc_no }, 201);
    }

    if (type === 'reserve-invoices') {
      if (!body.invoice_date) return sendError(res, 'Invoice date required', 'VALIDATION_ERROR', 400);
      if (!body.items?.length) return sendError(res, 'At least one item required', 'VALIDATION_ERROR', 400);
      const doc_no = await genDocNo(req.orgId, 'APR');
      const { items, subtotal, tax_amount, total_amount } = calcItemTotals(body.items);
      const discAmt = parseFloat(body.discount_amount || 0);
      await stmts.insertAPReserveInvoice.run(
        id, req.orgId, doc_no,
        body.vendor_id || null, body.vendor_name, body.vendor_gstin || null, body.vendor_ref_no || null,
        body.po_ref || null, body.gr_ref || null,
        body.invoice_date, body.posting_date || body.invoice_date, body.due_date || null,
        body.currency || 'INR', body.department || null, body.cost_center || null,
        body.project || null, body.payment_terms || null, body.description || null,
        subtotal, discAmt, tax_amount, +(total_amount - discAmt).toFixed(2),
        body.notes || null, req.user.id
      );
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        await stmts.insertAPReserveInvoiceItem.run(
          uuid(), req.orgId, id, it.product_id || null, it.item_code || '', it.item_name,
          it.description || '', it.quantity || 1, it.unit_price || 0, it.discount || 0,
          it.tax_rate || 18, it.tax_amount, it.line_total, i
        );
      }
      await apLog(req.orgId, type, id, 'Created', null, 'draft', null, req.user.id);
      return sendSuccess(res, { id, doc_no }, 201);
    }
  } catch (err) {
    console.error('AP create error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

// ── Update ────────────────────────────────────────────────── PUT /:type/:id
router.put('/:type/:id', requireAuth, async (req, res) => {
  if (!validateType(req, res)) return;
  try {
    const { type, id } = req.params;
    const body = req.body;

    if (type === 'down-payments') {
      const base = parseFloat(body.amount || 0);
      const taxAmt = +(base * ((body.tax_rate || 18) / 100)).toFixed(2);
      await stmts.updateAPDownPayment.run(
        id, req.orgId,
        body.vendor_id || null, body.vendor_name, body.vendor_gstin || null, body.po_ref || null,
        body.payment_date, body.due_date || null, body.currency || 'INR', body.payment_terms || null,
        base, body.pct_amount || null, body.tax_rate || 18, taxAmt, +(base + taxAmt).toFixed(2), body.notes || null
      );
    } else if (type === 'invoices') {
      const { items, subtotal, tax_amount, total_amount } = calcItemTotals(body.items || []);
      const discAmt = +(subtotal * ((body.discount_pct || 0) / 100)).toFixed(2);
      await stmts.updateAPInvoice.run(
        id, req.orgId,
        body.vendor_id || null, body.vendor_name, body.vendor_gstin || null, body.vendor_inv_no || null,
        body.po_ref || null, body.gr_ref || null,
        body.invoice_date, body.posting_date || null, body.due_date || null,
        body.currency || 'INR', body.payment_terms || null,
        subtotal, body.discount_pct || 0, discAmt, tax_amount, +(total_amount - discAmt).toFixed(2), body.notes || null
      );
      await stmts.deleteAPInvoiceItems.run(id);
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        await stmts.insertAPInvoiceItem.run(
          uuid(), req.orgId, id, it.product_id || null, it.item_code || '', it.item_name,
          it.description || '', it.quantity || 1, it.unit_price || 0, it.discount || 0,
          it.tax_rate || 18, it.tax_amount, it.line_total, i
        );
      }
    } else if (type === 'credit-memos') {
      const { items, subtotal, tax_amount, total_amount } = calcItemTotals(body.items || []);
      const discAmt = +(subtotal * ((body.discount_pct || 0) / 100)).toFixed(2);
      await stmts.updateAPCreditMemo.run(
        id, req.orgId,
        body.vendor_id || null, body.vendor_name, body.vendor_gstin || null,
        body.ref_invoice_id || null, body.ref_invoice_no || null,
        body.credit_date, body.posting_date || null,
        body.currency || 'INR', body.reason || 'Return Goods',
        subtotal, discAmt, tax_amount, +(total_amount - discAmt).toFixed(2), body.notes || null
      );
      await stmts.deleteAPCreditMemoItems.run(id);
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        await stmts.insertAPCreditMemoItem.run(
          uuid(), req.orgId, id, it.product_id || null, it.item_code || '', it.item_name,
          it.description || '', it.quantity || 1, it.unit_price || 0, it.discount || 0,
          it.tax_rate || 18, it.tax_amount, it.line_total, i
        );
      }
    } else {
      const { items, subtotal, tax_amount, total_amount } = calcItemTotals(body.items || []);
      await stmts.updateAPReserveInvoice.run(
        id, req.orgId,
        body.vendor_id || null, body.vendor_name, body.vendor_gstin || null, body.vendor_ref_no || null,
        body.po_ref || null, body.gr_ref || null,
        body.invoice_date, body.posting_date || null, body.due_date || null,
        body.currency || 'INR', body.department || null, body.cost_center || null,
        body.project || null, body.payment_terms || null, body.description || null,
        subtotal, parseFloat(body.discount_amount || 0), tax_amount, total_amount, body.notes || null
      );
      await stmts.deleteAPReserveInvoiceItems.run(id);
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        await stmts.insertAPReserveInvoiceItem.run(
          uuid(), req.orgId, id, it.product_id || null, it.item_code || '', it.item_name,
          it.description || '', it.quantity || 1, it.unit_price || 0, it.discount || 0,
          it.tax_rate || 18, it.tax_amount, it.line_total, i
        );
      }
    }

    await apLog(req.orgId, req.params.type, id, 'Updated', null, null, 'Document updated', req.user.id);
    sendSuccess(res, { id });
  } catch (err) {
    console.error('AP update error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

// ── Status Transitions ────────────────────────────────────── PATCH /:type/:id/status
router.patch('/:type/:id/status', requireAuth, async (req, res) => {
  if (!validateType(req, res)) return;
  try {
    const { type, id } = req.params;
    const { status, note, amount } = req.body;
    if (!status) return sendError(res, 'Status required', 'VALIDATION_ERROR', 400);

    const adminRequired = ['approved', 'closed'].includes(status);
    if (adminRequired && !['owner', 'admin'].includes(req.user.role)) {
      return sendError(res, 'Admin access required', 'FORBIDDEN', 403);
    }

    let result;
    if (type === 'down-payments') {
      await stmts.updateAPDownPaymentStatus.run(id, req.orgId, status, req.user.id);
    } else if (type === 'invoices') {
      if (status === 'record_payment') {
        if (!amount || amount <= 0) return sendError(res, 'Valid amount required', 'VALIDATION_ERROR', 400);
        result = await stmts.recordAPInvoicePayment.run(id, req.orgId, parseFloat(amount));
      } else {
        await stmts.updateAPInvoiceStatus.run(id, req.orgId, status, req.user.id);
      }
    } else if (type === 'credit-memos') {
      if (status === 'apply') {
        if (!amount || amount <= 0) return sendError(res, 'Valid amount required', 'VALIDATION_ERROR', 400);
        result = await stmts.applyAPCreditMemo.run(id, req.orgId, parseFloat(amount));
      } else {
        await stmts.updateAPCreditMemoStatus.run(id, req.orgId, status, req.user.id);
      }
    } else {
      if (status === 'convert') {
        // Convert reserve invoice to AP invoice
        const reserve = await stmts.getAPReserveInvoice.get(id, req.orgId);
        if (!reserve) return sendError(res, 'Not found', 'NOT_FOUND', 404);
        if (reserve.status !== 'approved') return sendError(res, 'Only approved reserve invoices can be converted', 'CONFLICT', 409);
        const reserveItems = await stmts.getAPReserveInvoiceItems.all(id);

        const newId = uuid();
        const doc_no = await genDocNo(req.orgId, 'API');
        await stmts.insertAPInvoice.run(
          newId, req.orgId, doc_no,
          reserve.vendor_id, reserve.vendor_name, reserve.vendor_gstin, reserve.vendor_ref_no,
          reserve.po_ref, reserve.gr_ref,
          new Date().toISOString().split('T')[0], new Date().toISOString().split('T')[0], reserve.due_date,
          reserve.currency, reserve.payment_terms,
          reserve.subtotal, 0, reserve.discount_amount, reserve.tax_amount, reserve.total_amount,
          `Converted from ${reserve.doc_no}`, req.user.id
        );
        for (let i = 0; i < reserveItems.length; i++) {
          const it = reserveItems[i];
          await stmts.insertAPInvoiceItem.run(
            uuid(), req.orgId, newId, it.product_id || null, it.item_code || '', it.item_name,
            it.description || '', it.quantity, it.unit_price, it.discount || 0,
            it.tax_rate, it.tax_amount, it.total_amount, i
          );
        }
        await stmts.updateAPReserveInvoiceStatus.run(id, req.orgId, 'converted', null, newId);
        await apLog(req.orgId, type, id, 'Converted to AP Invoice', reserve.status, 'converted', `New invoice: ${doc_no}`, req.user.id);
        await apLog(req.orgId, 'invoices', newId, 'Created from Reserve Invoice', null, 'draft', `From ${reserve.doc_no}`, req.user.id);
        return sendSuccess(res, { converted_to_id: newId, doc_no });
      }
      await stmts.updateAPReserveInvoiceStatus.run(id, req.orgId, status, req.user.id, null);
    }

    const action = status === 'record_payment' ? 'Payment Recorded' : status.charAt(0).toUpperCase() + status.slice(1);
    await apLog(req.orgId, type, id, action, null, status, note || null, req.user.id);
    sendSuccess(res, { status, ...(result?.rows?.[0] || {}) });
  } catch (err) {
    console.error('AP status error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

// ── Cancel / Delete ───────────────────────────────────────── DELETE /:type/:id
router.delete('/:type/:id', requireAuth, requireAdmin, async (req, res) => {
  if (!validateType(req, res)) return;
  try {
    const { type, id } = req.params;
    if (type === 'down-payments')    await stmts.softDeleteAPDownPayment.run(id, req.orgId);
    else if (type === 'invoices')    await stmts.softDeleteAPInvoice.run(id, req.orgId);
    else if (type === 'credit-memos') await stmts.softDeleteAPCreditMemo.run(id, req.orgId);
    else                             await stmts.softDeleteAPReserveInvoice.run(id, req.orgId);
    await apLog(req.orgId, type, id, 'Cancelled', null, 'cancelled', req.body.reason || null, req.user.id);
    sendSuccess(res, { cancelled: true });
  } catch (err) {
    console.error('AP delete error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

module.exports = router;
