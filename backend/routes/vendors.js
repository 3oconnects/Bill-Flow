// backend/routes/vendors.js
const express = require('express');
const router = express.Router();
const { v4: uuid } = require('uuid');
const { stmts, db } = require('../db');
const { requireAuth, requireAdmin } = require('../auth');
const { sendSuccess, sendError } = require('../utils/response');

router.get('/', requireAuth, async (req, res) => {
  try {
    const vendors = await stmts.getVendors.all(req.orgId);
    sendSuccess(res, vendors);
  } catch (err) {
    console.error('Get vendors error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

router.get('/:id', requireAuth, async (req, res) => {
  try {
    const vendor = await stmts.getVendor.get(req.params.id, req.orgId);
    if (!vendor) return sendError(res, 'Vendor not found', 'NOT_FOUND', 404);
    const docs = await stmts.getVendorDocs.all(req.params.id, req.orgId);
    sendSuccess(res, { ...vendor, documents: docs });
  } catch (err) {
    console.error('Get vendor error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

// Vendor Financial Summary
router.get('/:id/summary', requireAuth, async (req, res) => {
  try {
    const vendorId = req.params.id;
    const orgId = req.orgId;

    // AP Invoices (Bills) for this vendor
    const { rows: invoiceRows } = await db.query(
      `SELECT id, doc_no, status, total_amount, paid_amount, due_date, created_at
         FROM ap_invoices
        WHERE org_id=$1 AND vendor_id=$2 AND deleted_at IS NULL`,
      [orgId, vendorId]
    );

    const now = new Date();
    let totalBills = 0, totalPaid = 0, outstanding = 0, overdue = 0;
    invoiceRows.forEach(inv => {
      const total = Number(inv.total_amount || 0);
      const paid  = Number(inv.paid_amount || 0);
      const bal   = Math.max(0, total - paid);
      totalBills += total;
      totalPaid  += paid;
      outstanding += bal;
      if (bal > 0 && inv.due_date && new Date(inv.due_date) < now) {
        overdue += bal;
      }
    });

    // Vendor Payments
    const { rows: payRows } = await db.query(
      `SELECT SUM(amount) AS total_payments FROM vendor_payments
        WHERE org_id=$1 AND vendor_id=$2 AND deleted_at IS NULL`,
      [orgId, vendorId]
    );

    // Purchase Orders
    const { rows: poRows } = await db.query(
      `SELECT COUNT(*) AS total_pos, SUM(total) AS total_po_value
         FROM purchase_orders
        WHERE org_id=$1 AND vendor_id=$2`,
      [orgId, vendorId]
    ).catch(() => ({ rows: [{ total_pos: 0, total_po_value: 0 }] }));

    // AP Credit Memos
    const { rows: cmRows } = await db.query(
      `SELECT COALESCE(SUM(total_amount),0) AS credit_balance
         FROM ap_credit_memos
        WHERE org_id=$1 AND vendor_id=$2 AND status NOT IN ('cancelled')
          AND deleted_at IS NULL`,
      [orgId, vendorId]
    ).catch(() => ({ rows: [{ credit_balance: 0 }] }));

    sendSuccess(res, {
      total_bills:    totalBills,
      total_paid:     totalPaid,
      outstanding,
      overdue,
      total_payments: Number(payRows[0]?.total_payments || 0),
      total_pos:      Number(poRows[0]?.total_pos || 0),
      total_po_value: Number(poRows[0]?.total_po_value || 0),
      credit_balance: Number(cmRows[0]?.credit_balance || 0),
      bill_count:     invoiceRows.length,
    });
  } catch (err) {
    console.error('Get vendor summary error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

// Vendor AP Invoices (Bills)
router.get('/:id/bills', requireAuth, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT id, doc_no, status, total_amount, paid_amount, due_date,
              created_at, vendor_name
         FROM ap_invoices
        WHERE org_id=$1 AND vendor_id=$2 AND deleted_at IS NULL
        ORDER BY created_at DESC`,
      [req.orgId, req.params.id]
    );
    sendSuccess(res, rows);
  } catch (err) {
    console.error('Get vendor bills error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

// Vendor Payments
router.get('/:id/payments', requireAuth, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT vp.id, vp.amount, vp.date, vp.method, vp.reference,
              vp.notes, vp.ap_invoice_id, vp.ap_invoice_no, vp.created_at
         FROM vendor_payments vp
        WHERE vp.org_id=$1 AND vp.vendor_id=$2 AND vp.deleted_at IS NULL
        ORDER BY vp.date DESC, vp.created_at DESC`,
      [req.orgId, req.params.id]
    );
    sendSuccess(res, rows);
  } catch (err) {
    console.error('Get vendor payments error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

// Vendor Purchase Orders
router.get('/:id/purchase-orders', requireAuth, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT id, po_number, status, total, expected_delivery_date,
              created_at, items, currency
         FROM purchase_orders
        WHERE org_id=$1 AND vendor_id=$2
        ORDER BY created_at DESC`,
      [req.orgId, req.params.id]
    ).catch(() => ({ rows: [] }));
    sendSuccess(res, rows);
  } catch (err) {
    console.error('Get vendor purchase orders error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

// Vendor Credit Memos
router.get('/:id/credit-memos', requireAuth, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT id, doc_no, status, total_amount, applied_amount, created_at
         FROM ap_credit_memos
        WHERE org_id=$1 AND vendor_id=$2 AND deleted_at IS NULL
        ORDER BY created_at DESC`,
      [req.orgId, req.params.id]
    ).catch(() => ({ rows: [] }));
    sendSuccess(res, rows);
  } catch (err) {
    console.error('Get vendor credit memos error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

// Vendor Transactions (combined timeline)
router.get('/:id/transactions', requireAuth, async (req, res) => {
  try {
    const { from, to } = req.query;
    const dateFilter = from && to ? `AND created_at BETWEEN '${from}' AND '${to}'` : '';

    // Bills
    const { rows: bills } = await db.query(
      `SELECT id, doc_no AS ref, 'Bill' AS type, total_amount AS amount,
              paid_amount, status, created_at AS date
         FROM ap_invoices
        WHERE org_id=$1 AND vendor_id=$2 AND deleted_at IS NULL ${dateFilter}`,
      [req.orgId, req.params.id]
    );

    // Payments
    const { rows: payments } = await db.query(
      `SELECT id, ap_invoice_no AS ref, 'Payment' AS type, amount,
              amount AS paid_amount, 'paid' AS status, date AS date
         FROM vendor_payments
        WHERE org_id=$1 AND vendor_id=$2 AND deleted_at IS NULL ${dateFilter}`,
      [req.orgId, req.params.id]
    );

    // Combine and sort by date desc
    const all = [...bills, ...payments].sort(
      (a, b) => new Date(b.date) - new Date(a.date)
    );

    sendSuccess(res, all);
  } catch (err) {
    console.error('Get vendor transactions error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

// Vendor Statement
router.get('/:id/statement', requireAuth, async (req, res) => {
  try {
    const { from, to } = req.query;
    let dateWhere = '';
    const params = [req.orgId, req.params.id];

    if (from && to) {
      dateWhere = `AND t.date BETWEEN $3 AND $4`;
      params.push(from, to);
    }

    // Combined bills + payments as statement rows
    const { rows: billRows } = await db.query(
      `SELECT created_at::date AS date, doc_no AS reference,
              'Bill' AS transaction_type,
              total_amount AS debit, 0 AS credit,
              (total_amount - COALESCE(paid_amount,0)) AS balance,
              status
         FROM ap_invoices
        WHERE org_id=$1 AND vendor_id=$2 AND deleted_at IS NULL
        ORDER BY created_at ASC`,
      [req.orgId, req.params.id]
    );

    const { rows: payRows } = await db.query(
      `SELECT date, ap_invoice_no AS reference,
              'Payment' AS transaction_type,
              0 AS debit, amount AS credit, 0 AS balance, 'paid' AS status
         FROM vendor_payments
        WHERE org_id=$1 AND vendor_id=$2 AND deleted_at IS NULL
        ORDER BY date ASC`,
      [req.orgId, req.params.id]
    );

    // Merge and sort by date
    const rows = [...billRows, ...payRows].sort(
      (a, b) => new Date(a.date) - new Date(b.date)
    );

    // Calculate running balance
    let running = 0;
    const statement = rows.map(r => {
      running += Number(r.debit || 0) - Number(r.credit || 0);
      return { ...r, running_balance: running };
    });

    sendSuccess(res, statement);
  } catch (err) {
    console.error('Get vendor statement error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

router.post('/', requireAuth, async (req, res) => {
  try {
    const {
      name, email, phone, alternate_phone, website, address, gstin, pan,
      bank_account, ifsc, notes, vendor_id, company_name, contact_person,
      street, city, state, pincode, country, bank_name, bank_branch,
      status, vendor_type, payment_terms, currency, credit_limit,
      opening_balance, tax_treatment, registration_type,
      shipping_address, shipping_city, shipping_state, shipping_country,
      shipping_pincode, account_holder_name,
    } = req.body;
    if (!name) return sendError(res, 'Name is required', 'VALIDATION_ERROR', 400);
    const id = uuid();
    await stmts.insertVendor.run(
      id, req.orgId, vendor_id || null, name, company_name||'', contact_person||'',
      email||'', phone||'', address||'', street||'', city||'', state||'',
      pincode||'', country||'India', gstin||'', bank_account||'', ifsc||'',
      bank_name||'', bank_branch||'', status||'active', notes||'', req.user.id
    );
    sendSuccess(res, { id });
  } catch (err) {
    console.error('Create vendor error:', err);
    if (err.code === '23505') {
      if (err.constraint?.includes('email')) return sendError(res, 'A vendor with this email already exists', 'VALIDATION_ERROR', 400);
      if (err.constraint?.includes('phone')) return sendError(res, 'A vendor with this phone already exists', 'VALIDATION_ERROR', 400);
      return sendError(res, 'A vendor with this detail already exists', 'VALIDATION_ERROR', 400);
    }
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

router.put('/:id', requireAuth, async (req, res) => {
  try {
    const {
      name, email, phone, address, gstin, pan, bank_account, ifsc, notes,
      vendor_id, company_name, contact_person, street, city, state, pincode,
      country, bank_name, bank_branch, status,
    } = req.body;
    if (!name) return sendError(res, 'Name is required', 'VALIDATION_ERROR', 400);
    await stmts.updateVendor.run(
      name, company_name||'', contact_person||'', email||'', phone||'', address||'',
      street||'', city||'', state||'', pincode||'', country||'India', gstin||'',
      bank_account||'', ifsc||'', bank_name||'', bank_branch||'', status||'active',
      notes||'', req.params.id, req.orgId
    );
    sendSuccess(res, null);
  } catch (err) {
    console.error('Update vendor error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

// Deactivate vendor (soft)
router.patch('/:id/status', requireAuth, async (req, res) => {
  try {
    const { status } = req.body;
    if (!['active', 'inactive', 'blocked'].includes(status)) {
      return sendError(res, 'Invalid status', 'VALIDATION_ERROR', 400);
    }
    await db.query(
      `UPDATE vendors SET status=$1, updated_at=NOW() WHERE id=$2 AND org_id=$3`,
      [status, req.params.id, req.orgId]
    );
    sendSuccess(res, null);
  } catch (err) {
    console.error('Update vendor status error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    // Check if vendor has transactions — if so, just deactivate
    const { rows: txnCheck } = await db.query(
      `SELECT COUNT(*) AS cnt FROM ap_invoices
        WHERE org_id=$1 AND vendor_id=$2 AND deleted_at IS NULL`,
      [req.orgId, req.params.id]
    ).catch(() => ({ rows: [{ cnt: 0 }] }));

    if (Number(txnCheck[0]?.cnt || 0) > 0) {
      // Soft-deactivate instead of delete
      await db.query(
        `UPDATE vendors SET status='inactive', updated_at=NOW() WHERE id=$1 AND org_id=$2`,
        [req.params.id, req.orgId]
      );
      return sendSuccess(res, { deactivated: true, message: 'Vendor has transactions — deactivated instead of deleted' });
    }

    await stmts.deleteVendor.run(req.params.id, req.orgId);
    sendSuccess(res, null);
  } catch (err) {
    console.error('Delete vendor error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

// Vendor Documents
router.post('/:id/documents', requireAuth, async (req, res) => {
  try {
    const { name, doc_type, file_data, file_name, file_size, mime_type, notes, file_url, storage_key } = req.body;
    if (!name || (!file_data && !file_url)) return sendError(res, 'Name and file data/url required', 'VALIDATION_ERROR', 400);
    const id = uuid();
    await stmts.insertVendorDoc.run(id, req.orgId, req.params.id, name, doc_type||'other', file_url || file_data, storage_key || '', file_name||'', file_size||0, mime_type||'', notes||'');
    sendSuccess(res, { id });
  } catch (err) {
    console.error('Upload document error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

router.delete('/:id/documents/:docId', requireAuth, async (req, res) => {
  try {
    await stmts.deleteVendorDoc.run(req.params.docId, req.orgId);
    sendSuccess(res, null);
  } catch (err) {
    console.error('Delete document error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

// ── Vendor ↔ Products links (product_vendors join table) ───────────────────
router.get('/:id/products', requireAuth, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT pv.id, pv.product_id, pv.supply_price, pv.is_primary, pv.notes,
              p.name AS product_name, p.sku, p.hsn_code,
              p.unit_price, p.stock_qty
         FROM product_vendors pv
         JOIN products p ON p.id = pv.product_id AND p.org_id = pv.org_id
        WHERE pv.org_id=$1 AND pv.vendor_id=$2 AND pv.deleted_at IS NULL
          AND p.deleted_at IS NULL
        ORDER BY pv.is_primary DESC, p.name ASC`,
      [req.orgId, req.params.id]
    );
    sendSuccess(res, rows);
  } catch (err) {
    console.error('Get vendor products error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

router.post('/:id/products', requireAuth, async (req, res) => {
  try {
    const { product_id, supply_price, is_primary, notes } = req.body;
    if (!product_id) return sendError(res, 'product_id is required', 'VALIDATION_ERROR', 400);

    const existing = await db.query(
      `SELECT id FROM product_vendors
        WHERE org_id=$1 AND vendor_id=$2 AND product_id=$3 AND deleted_at IS NULL`,
      [req.orgId, req.params.id, product_id]
    );
    if (existing.rowCount) {
      return sendError(res, 'Product already linked to this vendor', 'DUPLICATE', 409);
    }

    const pvId = uuid();
    await db.query(
      `INSERT INTO product_vendors
         (id, org_id, product_id, vendor_id, supply_price, is_primary, notes, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [pvId, req.orgId, product_id, req.params.id,
       parseFloat(supply_price || 0), !!is_primary, notes || null, req.user.id]
    );
    sendSuccess(res, { id: pvId });
  } catch (err) {
    console.error('Link vendor product error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

router.put('/:id/products/:pvId', requireAuth, async (req, res) => {
  try {
    const { supply_price, is_primary, notes } = req.body;
    const r = await db.query(
      `UPDATE product_vendors
          SET supply_price=$1, is_primary=$2, notes=$3, updated_at=CURRENT_TIMESTAMP
        WHERE id=$4 AND vendor_id=$5 AND org_id=$6 AND deleted_at IS NULL`,
      [parseFloat(supply_price || 0), !!is_primary, notes || null,
       req.params.pvId, req.params.id, req.orgId]
    );
    if (!r.rowCount) return sendError(res, 'Link not found', 'NOT_FOUND', 404);
    sendSuccess(res, null);
  } catch (err) {
    console.error('Update vendor product error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

router.delete('/:id/products/:pvId', requireAuth, async (req, res) => {
  try {
    await db.query(
      `UPDATE product_vendors SET deleted_at=CURRENT_TIMESTAMP
        WHERE id=$1 AND vendor_id=$2 AND org_id=$3`,
      [req.params.pvId, req.params.id, req.orgId]
    );
    sendSuccess(res, null);
  } catch (err) {
    console.error('Unlink vendor product error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

module.exports = router;
