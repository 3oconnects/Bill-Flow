// backend/services/paymentAllocationService.js
'use strict';
const { db } = require('../db');
const { v4: uuid } = require('uuid');

class PaymentAllocationService {

  static async createPaymentWithAllocation(orgId, customerId, amount, date, method, allocationDetails, opts) {
    allocationDetails = allocationDetails || {};
    opts = opts || {};
    const reference   = opts.reference   || '';
    const notes       = opts.notes       || '';
    const currency    = opts.currency    || 'INR';
    const created_by  = opts.created_by  || null;

    const client = await db.connect();
    try {
      await client.query('BEGIN');

      const paymentId       = uuid();
      const allocVals       = Object.values(allocationDetails);
      const allocatedAmount = allocVals.reduce(function(s,a){ return s + (a.amount||0); }, 0);
      const unappliedAmount = amount - allocatedAmount;

      // Resolve customer_id from first invoice if not supplied
      let resolvedCustomerId = customerId;
      if (!resolvedCustomerId && Object.keys(allocationDetails).length > 0) {
        const firstId = Object.keys(allocationDetails)[0];
        const r = await client.query(
          'SELECT customer_id FROM invoices WHERE id = $1 AND org_id = $2',
          [firstId, orgId]
        );
        if (r.rowCount > 0) resolvedCustomerId = r.rows[0].customer_id;
      }

      await client.query(
        'INSERT INTO payments (id, org_id, customer_id, amount, allocated_amount, unapplied_amount, payment_date, method, currency, reference, notes, status, created_by, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,NOW())',
        [paymentId, orgId, resolvedCustomerId, amount, allocatedAmount,
         unappliedAmount, date, method, currency, reference, notes, 'completed', created_by]
      );

      for (const invoiceId of Object.keys(allocationDetails)) {
        const allocAmount = parseFloat(allocationDetails[invoiceId].amount || 0);
        const allocNotes  = allocationDetails[invoiceId].notes || null;

        const invoice = await client.query(
          'SELECT id, customer_id, total, COALESCE(paid_amount,0) AS paid_amount FROM invoices WHERE id = $1 AND org_id = $2 FOR UPDATE',
          [invoiceId, orgId]
        );
        if (!invoice.rowCount) throw new Error('Invoice ' + invoiceId + ' not found');

        const inv           = invoice.rows[0];
        const newPaidAmount = parseFloat(inv.paid_amount) + allocAmount;

        if (newPaidAmount > parseFloat(inv.total) + 0.01) {
          throw new Error('Overpayment to invoice ' + invoiceId + ': trying to allocate ' + allocAmount + ' but only ' + (inv.total - inv.paid_amount) + ' remaining');
        }

        await client.query(
          "UPDATE invoices SET paid_amount = $1, status = CASE WHEN $1 >= total THEN 'paid' ELSE 'partially_paid' END, updated_at = NOW() WHERE id = $2",
          [newPaidAmount, invoiceId]
        );

        await client.query(
          'INSERT INTO payment_allocations (id, payment_id, invoice_id, amount, notes, created_at) VALUES ($1,$2,$3,$4,$5,NOW())',
          [uuid(), paymentId, invoiceId, allocAmount, allocNotes]
        );
      }

      if (resolvedCustomerId) {
        const result = await client.query(
          "SELECT COALESCE(SUM(total - COALESCE(paid_amount,0)),0) AS outstanding FROM invoices WHERE org_id=$1 AND customer_id=$2 AND status IN ('sent','partially_paid','overdue')",
          [orgId, resolvedCustomerId]
        );
        await client.query(
          'UPDATE customers SET outstanding = $1, last_payment_date = NOW() WHERE id = $2',
          [result.rows[0].outstanding, resolvedCustomerId]
        );
      }

      await client.query('COMMIT');
      return {
        paymentId:       paymentId,
        allocatedAmount: allocatedAmount,
        unappliedAmount: unappliedAmount,
        status:          unappliedAmount > 0 ? 'partial' : 'allocated',
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  static async applyUnappliedBalance(orgId, customerId) {
    const client = await db.connect();
    try {
      await client.query('BEGIN');

      const unapplied = await client.query(
        'SELECT COALESCE(SUM(unapplied_amount),0) AS total_unapplied FROM payments WHERE org_id=$1 AND customer_id=$2 AND deleted_at IS NULL',
        [orgId, customerId]
      );
      let remaining = parseFloat(unapplied.rows[0].total_unapplied);
      if (remaining <= 0) { await client.query('COMMIT'); return { applied: 0 }; }

      const invoices = await client.query(
        "SELECT id, total - COALESCE(paid_amount,0) AS remaining FROM invoices WHERE org_id=$1 AND customer_id=$2 AND status IN ('sent','partially_paid','overdue') ORDER BY due_date ASC, created_at ASC FOR UPDATE",
        [orgId, customerId]
      );

      let totalApplied = 0;
      for (const inv of invoices.rows) {
        if (remaining <= 0) break;
        const allocAmount   = Math.min(remaining, parseFloat(inv.remaining));
        const paidRow       = await client.query('SELECT COALESCE(paid_amount,0) AS paid FROM invoices WHERE id=$1', [inv.id]);
        const newPaidAmount = parseFloat(paidRow.rows[0].paid) + allocAmount;

        await client.query(
          "UPDATE invoices SET paid_amount=$1, status = CASE WHEN $1 >= total THEN 'paid' ELSE 'partially_paid' END WHERE id=$2",
          [newPaidAmount, inv.id]
        );
        remaining    -= allocAmount;
        totalApplied += allocAmount;
      }

      await client.query('COMMIT');
      return { applied: totalApplied, remaining: remaining };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  static async reversePayment(orgId, paymentId) {
    const client = await db.connect();
    try {
      await client.query('BEGIN');

      const payment = await client.query(
        'SELECT customer_id, amount FROM payments WHERE id=$1 AND org_id=$2 FOR UPDATE',
        [paymentId, orgId]
      );
      if (!payment.rowCount) throw new Error('Payment not found');
      const customer_id = payment.rows[0].customer_id;
      const amount      = payment.rows[0].amount;

      const allocations = await client.query(
        'SELECT invoice_id, amount FROM payment_allocations WHERE payment_id=$1',
        [paymentId]
      );

      for (const alloc of allocations.rows) {
        const invoice = await client.query(
          'SELECT paid_amount FROM invoices WHERE id=$1 FOR UPDATE',
          [alloc.invoice_id]
        );
        if (!invoice.rowCount) continue;
        const newPaidAmount = Math.max(0, parseFloat(invoice.rows[0].paid_amount) - parseFloat(alloc.amount));
        await client.query(
          "UPDATE invoices SET paid_amount=$1, status = CASE WHEN $1 = 0 THEN 'sent' ELSE 'partially_paid' END, updated_at=NOW() WHERE id=$2",
          [newPaidAmount, alloc.invoice_id]
        );
        await client.query(
          'DELETE FROM payment_allocations WHERE payment_id=$1 AND invoice_id=$2',
          [paymentId, alloc.invoice_id]
        );
      }

      await client.query(
        "UPDATE payments SET status='reversed', updated_at=NOW() WHERE id=$1",
        [paymentId]
      );

      if (customer_id) {
        const result = await client.query(
          "SELECT COALESCE(SUM(total - COALESCE(paid_amount,0)),0) AS outstanding FROM invoices WHERE org_id=$1 AND customer_id=$2 AND status IN ('sent','partially_paid','overdue')",
          [orgId, customer_id]
        );
        await client.query(
          'UPDATE customers SET outstanding=$1 WHERE id=$2',
          [result.rows[0].outstanding, customer_id]
        );
      }

      await client.query('COMMIT');
      return { reversed: true, amount: amount };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  static async getPaymentSummary(orgId, customerId) {
    const result = await db.query(
      "SELECT COUNT(DISTINCT p.id) AS total_payments, COALESCE(SUM(p.amount),0) AS total_paid, COALESCE(SUM(p.unapplied_amount),0) AS total_unapplied, MAX(p.payment_date) AS last_payment_date FROM payments p WHERE p.org_id=$1 AND p.customer_id=$2 AND p.deleted_at IS NULL",
      [orgId, customerId]
    );
    return result.rows[0];
  }
}

module.exports = PaymentAllocationService;
