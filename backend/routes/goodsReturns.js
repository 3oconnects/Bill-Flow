// backend/routes/goodsReturns.js
const express = require('express');
const router = express.Router();
const { v4: uuid } = require('uuid');
const { stmts, db } = require('../db');
const { requireAuth, requireAdmin } = require('../auth');
const { sendSuccess, sendError } = require('../utils/response');

// ── Helpers ────────────────────────────────────────────────────────────

function calcTotals(items) {
  let subtotal = 0, tax_amount = 0;
  for (const it of items) {
    const base = (it.qty_returned || 0) * (it.unit_price || 0);
    const tax  = base * ((it.tax_rate || 0) / 100);
    it.tax_amount    = +tax.toFixed(2);
    it.return_amount = +(base + tax).toFixed(2);
    subtotal   += base;
    tax_amount += tax;
  }
  return { subtotal: +subtotal.toFixed(2), tax_amount: +tax_amount.toFixed(2), total_amount: +(subtotal + tax_amount).toFixed(2) };
}

async function logAction(orgId, returnId, action, oldStatus, newStatus, note, userId) {
  await stmts.insertGoodsReturnLog.run(uuid(), orgId, returnId, action, oldStatus || null, newStatus || null, note || null, userId);
}

async function generateReturnNo(orgId) {
  const year = new Date().getFullYear();
  const row  = await stmts.getNextReturnNo.get(orgId);
  const seq  = String(parseInt(row?.cnt || 0) + 1).padStart(4, '0');
  return `GRT-${year}-${seq}`;
}

// ── Dashboard Stats ───────────────────────────────────────────── GET /
router.get('/stats', requireAuth, async (req, res) => {
  try {
    const [stats, topSuppliers] = await Promise.all([
      stmts.getGoodsReturnStats.get(req.orgId),
      stmts.getTopSupplierReturns.all(req.orgId),
    ]);
    sendSuccess(res, { stats, topSuppliers });
  } catch (err) {
    console.error('Goods return stats error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

// ── List ──────────────────────────────────────────────────── GET /
router.get('/', requireAuth, async (req, res) => {
  try {
    const { status, vendor_id, search, from, to, warehouse } = req.query;
    let rows = await stmts.listGoodsReturns.all(req.orgId);

    if (status && status !== 'all') rows = rows.filter(r => r.status === status);
    if (vendor_id) rows = rows.filter(r => r.vendor_id === vendor_id);
    if (warehouse) rows = rows.filter(r => r.warehouse?.toLowerCase().includes(warehouse.toLowerCase()));
    if (from) rows = rows.filter(r => r.return_date >= from);
    if (to)   rows = rows.filter(r => r.return_date <= to);
    if (search) {
      const s = search.toLowerCase();
      rows = rows.filter(r =>
        r.return_no?.toLowerCase().includes(s) ||
        r.vendor_name?.toLowerCase().includes(s) ||
        r.base_receipt_no?.toLowerCase().includes(s)
      );
    }
    sendSuccess(res, rows);
  } catch (err) {
    console.error('List goods returns error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

// ── Get Single ────────────────────────────────────────────── GET /:id
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const gr = await stmts.getGoodsReturn.get(req.params.id, req.orgId);
    if (!gr) return sendError(res, 'Goods return not found', 'NOT_FOUND', 404);
    const [items, logs] = await Promise.all([
      stmts.getGoodsReturnItems.all(req.params.id, req.orgId),
      stmts.getGoodsReturnLogs.all(req.params.id, req.orgId),
    ]);
    sendSuccess(res, { ...gr, items, logs });
  } catch (err) {
    console.error('Get goods return error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

// ── Create ────────────────────────────────────────────────── POST /
router.post('/', requireAuth, async (req, res) => {
  try {
    const {
      vendor_id, vendor_name, vendor_gstin, base_receipt_no,
      return_date, warehouse, status,
      transport_carrier, transport_doc_no, transport_remarks,
      remarks, items = [],
    } = req.body;

    if (!vendor_name) return sendError(res, 'Vendor name is required', 'VALIDATION_ERROR', 400);
    if (!return_date) return sendError(res, 'Return date is required', 'VALIDATION_ERROR', 400);
    if (!items.length) return sendError(res, 'At least one item is required', 'VALIDATION_ERROR', 400);

    const id        = uuid();
    const return_no = await generateReturnNo(req.orgId);
    const totals    = calcTotals(items);

    await stmts.insertGoodsReturn.run(
      id, req.orgId, return_no,
      vendor_id || null, vendor_name, vendor_gstin || null, base_receipt_no || null,
      return_date, warehouse || 'Main Warehouse',
      status || 'draft',
      transport_carrier || null, transport_doc_no || null, transport_remarks || null,
      totals.subtotal, totals.tax_amount, totals.total_amount,
      remarks || null, req.user.id
    );

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      await stmts.insertGoodsReturnItem.run(
        uuid(), req.orgId, id,
        it.product_id || null, it.item_code || '', it.item_name || '',
        it.batch_no || null, it.qty_returned || 1, it.unit_price || 0,
        it.tax_rate ?? 18, it.tax_amount || 0, it.return_amount || 0,
        it.reason || 'Damaged in Transit', i
      );
    }

    await logAction(req.orgId, id, 'Created', null, status || 'draft', 'Goods return created', req.user.id);
    sendSuccess(res, { id, return_no }, 201);
  } catch (err) {
    console.error('Create goods return error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

// ── Update ────────────────────────────────────────────────── PUT /:id
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const gr = await stmts.getGoodsReturn.get(req.params.id, req.orgId);
    if (!gr) return sendError(res, 'Goods return not found', 'NOT_FOUND', 404);
    if (!['draft', 'submitted'].includes(gr.status))
      return sendError(res, `Cannot edit a return in '${gr.status}' status`, 'CONFLICT', 409);

    const {
      vendor_id, vendor_name, vendor_gstin, base_receipt_no,
      return_date, warehouse, transport_carrier, transport_doc_no,
      transport_remarks, remarks, items = [],
    } = req.body;

    if (!vendor_name) return sendError(res, 'Vendor name is required', 'VALIDATION_ERROR', 400);
    if (!items.length) return sendError(res, 'At least one item is required', 'VALIDATION_ERROR', 400);

    const totals = calcTotals(items);

    await stmts.updateGoodsReturn.run(
      req.params.id, req.orgId,
      vendor_id || null, vendor_name, vendor_gstin || null, base_receipt_no || null,
      return_date, warehouse || 'Main Warehouse',
      transport_carrier || null, transport_doc_no || null, transport_remarks || null,
      totals.subtotal, totals.tax_amount, totals.total_amount,
      remarks || null
    );

    await stmts.deleteGoodsReturnItems.run(req.params.id);
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      await stmts.insertGoodsReturnItem.run(
        uuid(), req.orgId, req.params.id,
        it.product_id || null, it.item_code || '', it.item_name || '',
        it.batch_no || null, it.qty_returned || 1, it.unit_price || 0,
        it.tax_rate ?? 18, it.tax_amount || 0, it.return_amount || 0,
        it.reason || 'Damaged in Transit', i
      );
    }

    await logAction(req.orgId, req.params.id, 'Updated', gr.status, gr.status, 'Return details updated', req.user.id);
    sendSuccess(res, { id: req.params.id });
  } catch (err) {
    console.error('Update goods return error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

// ── Submit ────────────────────────────────────────────── PATCH /:id/submit
router.patch('/:id/submit', requireAuth, async (req, res) => {
  try {
    const gr = await stmts.getGoodsReturn.get(req.params.id, req.orgId);
    if (!gr) return sendError(res, 'Not found', 'NOT_FOUND', 404);
    if (gr.status !== 'draft') return sendError(res, 'Only draft returns can be submitted', 'CONFLICT', 409);
    await stmts.updateGoodsReturnStatus.run(req.params.id, req.orgId, 'submitted', null);
    await logAction(req.orgId, req.params.id, 'Submitted', 'draft', 'submitted', req.body.note || null, req.user.id);
    sendSuccess(res, { status: 'submitted' });
  } catch (err) {
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

// ── Approve ───────────────────────────────────────────── PATCH /:id/approve
router.patch('/:id/approve', requireAuth, requireAdmin, async (req, res) => {
  try {
    const gr = await stmts.getGoodsReturn.get(req.params.id, req.orgId);
    if (!gr) return sendError(res, 'Not found', 'NOT_FOUND', 404);
    if (gr.status !== 'submitted') return sendError(res, 'Only submitted returns can be approved', 'CONFLICT', 409);
    await stmts.updateGoodsReturnStatus.run(req.params.id, req.orgId, 'approved', req.user.id);
    await logAction(req.orgId, req.params.id, 'Approved', 'submitted', 'approved', req.body.note || null, req.user.id);
    sendSuccess(res, { status: 'approved' });
  } catch (err) {
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

// ── Process Return (mark as returned to supplier + adjust stock) ── PATCH /:id/process
router.patch('/:id/process', requireAuth, requireAdmin, async (req, res) => {
  try {
    const gr = await stmts.getGoodsReturn.get(req.params.id, req.orgId);
    if (!gr) return sendError(res, 'Not found', 'NOT_FOUND', 404);
    if (gr.status !== 'approved') return sendError(res, 'Only approved returns can be processed', 'CONFLICT', 409);

    // Adjust stock for each item
    if (!gr.stock_adjusted) {
      const items = await stmts.getGoodsReturnItems.all(req.params.id, req.orgId);
      for (const it of items) {
        if (it.product_id) {
          await db.query(
            `UPDATE products SET stock_qty = GREATEST(0, stock_qty - $1) WHERE id = $2 AND org_id = $3`,
            [it.qty_returned, it.product_id, req.orgId]
          );
        }
      }
      await stmts.markGoodsReturnStockAdjusted.run(req.params.id, req.orgId);
    }

    await stmts.updateGoodsReturnStatus.run(req.params.id, req.orgId, 'returned', null);
    await logAction(req.orgId, req.params.id, 'Returned to Supplier', 'approved', 'returned', 'Stock adjusted and goods dispatched', req.user.id);
    sendSuccess(res, { status: 'returned' });
  } catch (err) {
    console.error('Process goods return error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

// ── Generate Credit Note ───────────────────────────────── PATCH /:id/credit-note
router.patch('/:id/credit-note', requireAuth, requireAdmin, async (req, res) => {
  try {
    const gr = await stmts.getGoodsReturn.get(req.params.id, req.orgId);
    if (!gr) return sendError(res, 'Not found', 'NOT_FOUND', 404);
    if (!['returned', 'closed'].includes(gr.status)) return sendError(res, 'Return must be in returned status', 'CONFLICT', 409);
    if (gr.credit_note_no) return sendError(res, 'Credit note already generated', 'CONFLICT', 409);

    const year = new Date().getFullYear();
    const { rows } = await db.query(
      `SELECT COUNT(*) AS cnt FROM goods_returns WHERE org_id=$1 AND credit_note_no IS NOT NULL`,
      [req.orgId]
    );
    const seq = String(parseInt(rows[0]?.cnt || 0) + 1).padStart(4, '0');
    const credit_note_no   = `CN-${year}-${seq}`;
    const credit_note_date = new Date().toISOString().split('T')[0];

    await stmts.updateGoodsReturnCreditNote.run(req.params.id, req.orgId, credit_note_no, credit_note_date);
    await logAction(req.orgId, req.params.id, 'Credit Note Generated', gr.status, gr.status, `Credit note ${credit_note_no} issued`, req.user.id);
    sendSuccess(res, { credit_note_no, credit_note_date });
  } catch (err) {
    console.error('Credit note error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

// ── Close ─────────────────────────────────────────────── PATCH /:id/close
router.patch('/:id/close', requireAuth, requireAdmin, async (req, res) => {
  try {
    const gr = await stmts.getGoodsReturn.get(req.params.id, req.orgId);
    if (!gr) return sendError(res, 'Not found', 'NOT_FOUND', 404);
    if (gr.status !== 'returned') return sendError(res, 'Only returned items can be closed', 'CONFLICT', 409);
    await stmts.updateGoodsReturnStatus.run(req.params.id, req.orgId, 'closed', null);
    await logAction(req.orgId, req.params.id, 'Closed', 'returned', 'closed', req.body.note || 'Return cycle completed', req.user.id);
    sendSuccess(res, { status: 'closed' });
  } catch (err) {
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

// ── Cancel ────────────────────────────────────────────── DELETE /:id
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const gr = await stmts.getGoodsReturn.get(req.params.id, req.orgId);
    if (!gr) return sendError(res, 'Not found', 'NOT_FOUND', 404);
    if (['closed', 'returned'].includes(gr.status))
      return sendError(res, 'Cannot cancel a completed return', 'CONFLICT', 409);
    await stmts.softDeleteGoodsReturn.run(req.params.id, req.orgId);
    await logAction(req.orgId, req.params.id, 'Cancelled', gr.status, 'cancelled', req.body.reason || null, req.user.id);
    sendSuccess(res, { cancelled: true });
  } catch (err) {
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

// ── Reports ───────────────────────────────────────────── GET /reports/:type
router.get('/reports/:type', requireAuth, async (req, res) => {
  try {
    const { from, to } = req.query;
    const type = req.params.type;

    let sql, params;

    if (type === 'register') {
      sql = `
        SELECT gr.return_no, gr.vendor_name, gr.return_date, gr.warehouse,
          gr.status, gr.subtotal, gr.tax_amount, gr.total_amount,
          gr.credit_note_no, gr.credit_note_date,
          (SELECT COUNT(*) FROM goods_return_items WHERE return_id = gr.id) AS items
        FROM goods_returns gr
        WHERE gr.org_id=$1 AND gr.deleted_at IS NULL
        ${from ? 'AND gr.return_date >= $2' : ''}
        ${to   ? `AND gr.return_date <= $${from ? 3 : 2}` : ''}
        ORDER BY gr.return_date DESC
      `;
      params = [req.orgId, ...(from ? [from] : []), ...(to ? [to] : [])];
    } else if (type === 'by-supplier') {
      sql = `
        SELECT vendor_name, vendor_id,
          COUNT(*) AS return_count,
          SUM(total_amount) AS total_value,
          AVG(total_amount) AS avg_value,
          MAX(return_date) AS last_return_date
        FROM goods_returns
        WHERE org_id=$1 AND deleted_at IS NULL
        GROUP BY vendor_name, vendor_id ORDER BY total_value DESC
      `;
      params = [req.orgId];
    } else if (type === 'trend') {
      sql = `
        SELECT date_trunc('month', return_date) AS month,
          COUNT(*) AS count, SUM(total_amount) AS value
        FROM goods_returns
        WHERE org_id=$1 AND deleted_at IS NULL
        ${from ? 'AND return_date >= $2' : ''}
        GROUP BY 1 ORDER BY 1
      `;
      params = [req.orgId, ...(from ? [from] : [])];
    } else if (type === 'inventory-impact') {
      sql = `
        SELECT gri.item_name, gri.item_code, gri.reason,
          SUM(gri.qty_returned) AS total_qty,
          SUM(gri.return_amount) AS total_value,
          COUNT(DISTINCT gri.return_id) AS return_count
        FROM goods_return_items gri
        JOIN goods_returns gr ON gr.id = gri.return_id
        WHERE gr.org_id=$1 AND gr.deleted_at IS NULL
        GROUP BY gri.item_name, gri.item_code, gri.reason
        ORDER BY total_value DESC
      `;
      params = [req.orgId];
    } else {
      return sendError(res, 'Unknown report type', 'NOT_FOUND', 404);
    }

    const { rows } = await db.query(sql, params);
    sendSuccess(res, rows);
  } catch (err) {
    console.error('Goods return report error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

module.exports = router;
