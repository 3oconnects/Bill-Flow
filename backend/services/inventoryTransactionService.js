// backend/services/inventoryTransactionService.js
'use strict';
const { db } = require('../db');
const { v4: uuid } = require('uuid');
const GSTCalculationService = require('./gstCalculationService');
const CustomerBalance = require('./customerBalanceService');

class InventoryTransactionService {

  // Helper: apply stock delta for one product (negative = deduct, positive = restore)
  static async _adjustStock(client, orgId, productId, delta, invoiceId, invoiceNumber) {
    if (!productId) return;
    const product = await client.query(
      'SELECT stock_qty, low_stock_alert FROM products WHERE id = $1 AND org_id = $2 FOR UPDATE',
      [productId, orgId]
    );
    if (!product.rowCount) return; // product deleted — skip

    const currentStock = parseFloat(product.rows[0].stock_qty || 0);
    const newStock = currentStock + delta;

    if (newStock < 0) {
      throw new Error(
        'Insufficient stock for product ' + productId +
        '. Available: ' + currentStock + ', Requested: ' + Math.abs(delta)
      );
    }

    await client.query(
      'UPDATE products SET stock_qty = $1, updated_at = NOW() WHERE id = $2',
      [newStock, productId]
    );

    const txType = delta < 0 ? 'sale' : 'return';
    await client.query(
      'INSERT INTO inventory_transactions (id, org_id, product_id, transaction_type, reference_type, reference_id, quantity, unit_cost, total_cost, note, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,0,0,$8,NOW())',
      [uuid(), orgId, productId, txType, 'invoice', invoiceId, delta,
       (txType === 'sale' ? 'Sale' : 'Edit/Return') + ' via invoice ' + invoiceNumber]
    );

    const alertThreshold = parseFloat(product.rows[0].low_stock_alert || 0);
    if (newStock <= alertThreshold && delta < 0) {
      db.query(
        'INSERT INTO inventory_alerts (id, org_id, product_id, alert_type, current_stock, threshold, triggered_by, status, created_at) VALUES ($1,$2,$3,$4,$5,(SELECT low_stock_alert FROM products WHERE id=$3),$6,$7,NOW())',
        [uuid(), orgId, productId, 'low_stock', newStock, invoiceId, 'active']
      ).catch(() => {});
    }
  }

  // Create invoice + deduct stock + post GST (all atomic)
  static async createInvoiceWithStockDeduction(orgId, invoiceData, items) {
    const client = await db.connect();
    try {
      await client.query('BEGIN');

      const invoiceId    = uuid();
      const supplierState = invoiceData.supplier_state || null;
      const buyerState    = invoiceData.buyer_state || invoiceData.place_of_supply || null;
      const itemRate      = parseFloat(invoiceData.tax_rate || (items[0] && items[0].tax_rate) || 18);

      const gst = GSTCalculationService.calculateInvoiceGST(
        items.map(function(i) { return { amount: parseFloat(i.amount || 0), discount: 0 }; }),
        supplierState, buyerState, itemRate
      );

      await client.query(
        'INSERT INTO invoices (id, org_id, number, customer_id, customer_name, customer_phone, customer_email, date, due_date, currency, place_of_supply, supplier_state, buyer_state, status, subtotal, discount_pct, discount_amount, tax, cgst, sgst, igst, total_tax, total, gst_type, hsn_applicable, notes, terms, created_by, source_template_id, billing_period, paid_amount, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,0,NOW(),NOW())',
        [
          invoiceId, orgId,
          invoiceData.number, invoiceData.customer_id || null,
          invoiceData.customer_name, invoiceData.customer_phone || '',
          invoiceData.customer_email || '',
          invoiceData.date || new Date().toISOString().split('T')[0],
          invoiceData.due_date || null,
          invoiceData.currency || 'INR',
          invoiceData.place_of_supply || buyerState || '',
          supplierState, buyerState,
          invoiceData.status || 'draft',
          parseFloat(invoiceData.subtotal || 0),
          parseFloat(invoiceData.discount_pct || 0),
          parseFloat(invoiceData.discount_amount || 0),
          parseFloat(invoiceData.tax || gst.total_tax),
          gst.cgst, gst.sgst, gst.igst, gst.total_tax,
          parseFloat(invoiceData.total || 0),
          gst.gst_type, true,
          invoiceData.notes || '', invoiceData.terms || '',
          invoiceData.created_by || null,
          invoiceData.source_template_id || null, invoiceData.billing_period || null,
        ]
      );

      for (var i = 0; i < items.length; i++) {
        var item = items[i];
        await client.query(
          'INSERT INTO invoice_items (id, invoice_id, org_id, product_id, description, hsn_code, sku, vendor_id, vendor_name, quantity, unit_price, tax_rate, tax_amount, amount, sort_order, created_by, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,NOW())',
          [
            uuid(), invoiceId, orgId,
            item.product_id || null, item.description || '',
            item.hsn_code || '', item.sku || '',
            item.vendor_id || null, item.vendor_name || '',
            parseFloat(item.quantity || 1), parseFloat(item.unit_price || 0),
            parseFloat(item.tax_rate || 18), parseFloat(item.tax_amount || 0),
            parseFloat(item.amount || 0), i, invoiceData.created_by || null,
          ]
        );
        if (item.product_id) {
          await InventoryTransactionService._adjustStock(
            client, orgId, item.product_id,
            -parseFloat(item.quantity || 1), invoiceId, invoiceData.number
          );
        }
      }

      // Post GST ledger
      await client.query(
        'INSERT INTO gst_ledger (id, org_id, invoice_id, transaction_type, cgst_amount, sgst_amount, igst_amount, month, year, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW()) ON CONFLICT DO NOTHING',
        [uuid(), orgId, invoiceId, 'sales', gst.cgst, gst.sgst, gst.igst,
         new Date().getMonth() + 1, new Date().getFullYear()]
      );

      // Recompute customer outstanding from the ledger (no cache drift).
      if (invoiceData.customer_id) {
        await CustomerBalance.recompute(client, orgId, invoiceData.customer_id);
      }

      await client.query('COMMIT');
      return { invoiceId: invoiceId, gst: gst, items: items.length };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  // Edit invoice with delta stock reconciliation
  static async updateInvoiceWithStockDelta(orgId, invoiceId, newItems, opts) {
    opts = opts || {};
    const client = await db.connect();
    try {
      await client.query('BEGIN');

      var invRow = await client.query(
        'SELECT number, customer_id, total, subtotal, status FROM invoices WHERE id = $1 AND org_id = $2 FOR UPDATE',
        [invoiceId, orgId]
      );
      if (!invRow.rowCount) throw new Error('Invoice not found');
      var inv = invRow.rows[0];

      var oldItems = await client.query(
        'SELECT product_id, quantity FROM invoice_items WHERE invoice_id = $1 AND deleted_at IS NULL',
        [invoiceId]
      );

      var oldQtyMap = {};
      for (var r of oldItems.rows) {
        if (!r.product_id) continue;
        oldQtyMap[r.product_id] = (oldQtyMap[r.product_id] || 0) + parseFloat(r.quantity);
      }
      var newQtyMap = {};
      for (var item of newItems) {
        if (!item.product_id) continue;
        newQtyMap[item.product_id] = (newQtyMap[item.product_id] || 0) + parseFloat(item.quantity || 1);
      }

      await client.query('UPDATE invoice_items SET deleted_at = NOW() WHERE invoice_id = $1', [invoiceId]);

      var supplierState = opts.supplier_state || null;
      var buyerState    = opts.buyer_state || opts.place_of_supply || null;
      var gst = GSTCalculationService.calculateInvoiceGST(
        newItems.map(function(i) { return { amount: parseFloat(i.amount || 0), discount: 0 }; }),
        supplierState, buyerState,
        parseFloat(opts.tax_rate || (newItems[0] && newItems[0].tax_rate) || 18)
      );

      for (var i = 0; i < newItems.length; i++) {
        var ni = newItems[i];
        await client.query(
          'INSERT INTO invoice_items (id, invoice_id, org_id, product_id, description, hsn_code, sku, vendor_id, vendor_name, quantity, unit_price, tax_rate, tax_amount, amount, sort_order, created_by, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,NOW())',
          [
            uuid(), invoiceId, orgId,
            ni.product_id || null, ni.description || '',
            ni.hsn_code || '', ni.sku || '',
            ni.vendor_id || null, ni.vendor_name || '',
            parseFloat(ni.quantity || 1), parseFloat(ni.unit_price || 0),
            parseFloat(ni.tax_rate || 18), parseFloat(ni.tax_amount || 0),
            parseFloat(ni.amount || 0), i, opts.updated_by || null,
          ]
        );
      }

      var allProducts = new Set(Object.keys(oldQtyMap).concat(Object.keys(newQtyMap)));
      for (var productId of allProducts) {
        var oldQty = oldQtyMap[productId] || 0;
        var newQty = newQtyMap[productId] || 0;
        var delta  = oldQty - newQty;
        if (Math.abs(delta) < 0.0001) continue;
        await InventoryTransactionService._adjustStock(client, orgId, productId, delta, invoiceId, inv.number);
      }

      await client.query(
        'UPDATE invoices SET customer_id=$1, customer_name=$2, customer_phone=$3, customer_email=$4, date=$5, due_date=$6, currency=$7, place_of_supply=$8, subtotal=$9, discount_pct=$10, discount_amount=$11, tax=$12, cgst=$13, sgst=$14, igst=$15, total_tax=$16, total=$17, notes=$18, terms=$19, gst_type=$20, updated_at=NOW() WHERE id=$21 AND org_id=$22',
        [
          opts.customer_id || null, opts.customer_name || '',
          opts.customer_phone || '', opts.customer_email || '',
          opts.date || null, opts.due_date || null,
          opts.currency || 'INR', opts.place_of_supply || '',
          parseFloat(opts.subtotal || 0), parseFloat(opts.discount_pct || 0),
          parseFloat(opts.discount_amount || 0),
          parseFloat(opts.tax || gst.total_tax),
          gst.cgst, gst.sgst, gst.igst, gst.total_tax,
          parseFloat(opts.total || 0),
          opts.notes || '', opts.terms || '', gst.gst_type,
          invoiceId, orgId,
        ]
      );

      await client.query('DELETE FROM gst_ledger WHERE invoice_id = $1 AND org_id = $2', [invoiceId, orgId]);
      await client.query(
        'INSERT INTO gst_ledger (id, org_id, invoice_id, transaction_type, cgst_amount, sgst_amount, igst_amount, month, year, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW())',
        [uuid(), orgId, invoiceId, 'sales', gst.cgst, gst.sgst, gst.igst,
         new Date().getMonth() + 1, new Date().getFullYear()]
      );

      if (opts.customer_id) {
        await CustomerBalance.recompute(client, orgId, opts.customer_id);
      }

      await client.query('COMMIT');
      return { invoiceId: invoiceId, gst: gst };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  // Record purchase receipt
  static async recordPurchaseReceipt(orgId, poId, items) {
    const client = await db.connect();
    try {
      await client.query('BEGIN');
      var receiptId  = uuid();
      var totalCost  = 0;

      for (var item of items) {
        var product = await client.query(
          'SELECT stock_qty FROM products WHERE id = $1 AND org_id = $2 FOR UPDATE',
          [item.product_id, orgId]
        );
        if (!product.rowCount) throw new Error('Product ' + item.product_id + ' not found');

        var newStock = parseFloat(product.rows[0].stock_qty || 0) + item.quantity;
        await client.query(
          'UPDATE products SET stock_qty = $1, purchase_price = $2, updated_at = NOW() WHERE id = $3',
          [newStock, item.unit_cost, item.product_id]
        );

        var cost = item.quantity * item.unit_cost;
        totalCost += cost;

        await client.query(
          'INSERT INTO inventory_transactions (id, org_id, product_id, transaction_type, reference_type, reference_id, quantity, unit_cost, total_cost, note, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW())',
          [uuid(), orgId, item.product_id, 'purchase', 'receipt', receiptId,
           item.quantity, item.unit_cost, cost, 'Purchase via PO ' + poId]
        );
      }

      await client.query('COMMIT');
      return { receiptId: receiptId, totalCost: totalCost, itemCount: items.length };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  // Record goods return
  static async recordGoodsReturn(orgId, invoiceId, items) {
    const client = await db.connect();
    try {
      await client.query('BEGIN');
      var returnId = uuid();

      var invoice = await client.query(
        'SELECT customer_id, total FROM invoices WHERE id = $1 AND org_id = $2',
        [invoiceId, orgId]
      );
      if (!invoice.rowCount) throw new Error('Invoice not found');
      var customerId     = invoice.rows[0].customer_id;
      var totalReturnVal = 0;

      for (var item of items) {
        var product = await client.query(
          'SELECT stock_qty FROM products WHERE id = $1 AND org_id = $2 FOR UPDATE',
          [item.product_id, orgId]
        );
        var newStock = parseFloat(product.rows[0].stock_qty || 0) + item.quantity;
        await client.query(
          'UPDATE products SET stock_qty = $1, updated_at = NOW() WHERE id = $2',
          [newStock, item.product_id]
        );

        var returnValue = item.quantity * item.unit_price;
        totalReturnVal += returnValue;

        await client.query(
          'INSERT INTO inventory_transactions (id, org_id, product_id, transaction_type, reference_type, reference_id, quantity, unit_cost, total_cost, note, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW())',
          [uuid(), orgId, item.product_id, 'return', 'goods_return', returnId,
           item.quantity, item.unit_price, returnValue, 'Return from invoice']
        );
      }

      if (customerId) {
        await CustomerBalance.recompute(client, orgId, customerId);
      }

      await client.query('COMMIT');
      return { returnId: returnId, returnValue: totalReturnVal, itemCount: items.length };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  // Inventory adjustment
  static async createAdjustment(orgId, adjustments, reason, notes) {
    const client = await db.connect();
    try {
      await client.query('BEGIN');
      var adjustmentId = uuid();

      for (var adj of adjustments) {
        var product = await client.query(
          'SELECT stock_qty FROM products WHERE id = $1 AND org_id = $2 FOR UPDATE',
          [adj.product_id, orgId]
        );
        var newStock = parseFloat(product.rows[0].stock_qty || 0) + adj.quantity_change;
        if (newStock < 0) throw new Error('Cannot adjust stock below zero for product ' + adj.product_id);

        await client.query(
          'UPDATE products SET stock_qty = $1, updated_at = NOW() WHERE id = $2',
          [newStock, adj.product_id]
        );
        await client.query(
          'INSERT INTO inventory_transactions (id, org_id, product_id, transaction_type, reference_type, reference_id, quantity, unit_cost, total_cost, note, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,0,0,$8,NOW())',
          [uuid(), orgId, adj.product_id, 'adjustment', 'adjustment', adjustmentId,
           adj.quantity_change, 'Adjustment: ' + reason]
        );
      }

      await client.query('COMMIT');
      return { adjustmentId: adjustmentId, count: adjustments.length };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  // Inventory snapshot
  static async getInventorySnapshot(orgId, productId) {
    var result = await db.query(
      'SELECT p.id, p.sku, p.product_name, p.stock_qty AS current_stock, p.low_stock_alert FROM products p WHERE p.id = $1 AND p.org_id = $2',
      [productId, orgId]
    );
    return result.rows[0] || null;
  }

  static async _createStockAlert(orgId, productId, currentStock, triggeredById, alertType) {
    return db.query(
      'INSERT INTO inventory_alerts (id, org_id, product_id, alert_type, current_stock, threshold, triggered_by, status, created_at) VALUES ($1,$2,$3,$4,$5,(SELECT low_stock_alert FROM products WHERE id=$3),$6,$7,NOW())',
      [uuid(), orgId, productId, alertType, currentStock, triggeredById, 'active']
    );
  }
}

module.exports = InventoryTransactionService;
