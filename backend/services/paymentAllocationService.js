// backend/services/paymentAllocationService.js
'use strict';
const { db } = require('../db');
const { v4: uuid } = require('uuid');
const CustomerBalance = require('./customerBalanceService');

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
          'SELECT id, customer_id, total, COALESCE(paid_amount,0) AS paid_amount, COALESCE(credited_amount,0) AS credited_amount FROM invoices WHERE id = $1 AND org_id = $2 FOR UPDATE',
          [invoiceId, orgId]
        );
        if (!invoice.rowCount) throw new Error('Invoice ' + invoiceId + ' not found');

        const inv           = invoice.rows[0];
        const credited      = parseFloat(inv.credited_amount);
        const newPaidAmount = parseFloat(inv.paid_amount) + allocAmount;

        // Overpayment cap accounts for any credits already applied to the invoice.
        if (newPaidAmount + credited > parseFloat(inv.total) + 0.01) {
          const remaining = parseFloat(inv.total) - parseFloat(inv.paid_amount) - credited;
          throw new Error('Overpayment to invoice ' + invoiceId + ': trying to allocate ' + allocAmount + ' but only ' + remaining + ' remaining');
        }

        // Settled when cash paid + credits cover the total.
        await client.query(
          "UPDATE invoices SET paid_amount = $1, status = CASE WHEN ($1 + COALESCE(credited_amount,0)) >= total THEN 'paid' ELSE 'partially_paid' END, updated_at = NOW() WHERE id = $2",
          [newPaidAmount, invoiceId]
        );

        await client.query(
          'INSERT INTO payment_allocations (id, payment_id, invoice_id, amount, notes, created_at) VALUES ($1,$2,$3,$4,$5,NOW())',
          [uuid(), paymentId, invoiceId, allocAmount, allocNotes]
        );
      }

      if (resolvedCustomerId) {
        await CustomerBalance.recompute(client, orgId, resolvedCustomerId);
        await client.query(
          'UPDATE customers SET last_payment_date = NOW() WHERE id = $1',
          [resolvedCustomerId]
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

  // H7: Apply each payment's unapplied (advance) balance to open invoices FIFO,
  // creating payment_allocations rows and decrementing the source payment's
  // unapplied_amount. This makes applied advances fully tracked and reversible
  // (reversePayment iterates payment_allocations), instead of an untracked
  // paid_amount bump.
  static async applyUnappliedBalance(orgId, customerId) {
    const client = await db.connect();
    try {
      await client.query('BEGIN');

      const payments = await client.query(
        `SELECT id, COALESCE(unapplied_amount,0) AS unapplied, COALESCE(allocated_amount,0) AS allocated
           FROM payments
          WHERE org_id=$1 AND customer_id=$2 AND deleted_at IS NULL
            AND COALESCE(status,'completed') <> 'reversed'
            AND COALESCE(unapplied_amount,0) > 0
          ORDER BY payment_date ASC, created_at ASC
          FOR UPDATE`,
        [orgId, customerId]
      );
      if (!payments.rowCount) { await client.query('COMMIT'); return { applied: 0 }; }

      const invoices = await client.query(
        `SELECT id, total, COALESCE(paid_amount,0) AS paid, COALESCE(credited_amount,0) AS credited
           FROM invoices
          WHERE org_id=$1 AND customer_id=$2 AND deleted_at IS NULL
            AND status IN ('sent','partially_paid','overdue')
          ORDER BY due_date ASC, created_at ASC
          FOR UPDATE`,
        [orgId, customerId]
      );

      // Track each invoice's remaining balance in memory as we allocate.
      const invState = invoices.rows.map((inv) => ({
        id: inv.id,
        total: parseFloat(inv.total),
        paid: parseFloat(inv.paid),
        remaining: parseFloat(inv.total) - parseFloat(inv.paid) - parseFloat(inv.credited),
      }));

      let totalApplied = 0;

      for (const pay of payments.rows) {
        let payRemaining = parseFloat(pay.unapplied);
        let payAllocated = parseFloat(pay.allocated);

        for (const inv of invState) {
          if (payRemaining <= 0.001) break;
          if (inv.remaining <= 0.001) continue;

          const alloc = Math.min(payRemaining, inv.remaining);
          const newPaid = inv.paid + alloc;

          await client.query(
            "UPDATE invoices SET paid_amount=$1, status = CASE WHEN ($1 + COALESCE(credited_amount,0)) >= total THEN 'paid' ELSE 'partially_paid' END, updated_at=NOW() WHERE id=$2",
            [newPaid, inv.id]
          );
          await client.query(
            'INSERT INTO payment_allocations (id, payment_id, invoice_id, amount, notes, created_at) VALUES ($1,$2,$3,$4,$5,NOW())',
            [uuid(), pay.id, inv.id, alloc, 'Advance balance applied']
          );

          inv.paid = newPaid;
          inv.remaining -= alloc;
          payRemaining -= alloc;
          payAllocated += alloc;
          totalApplied += alloc;
        }

        // Persist the payment's new allocated/unapplied split.
        await client.query(
          'UPDATE payments SET allocated_amount=$1, unapplied_amount=$2, updated_at=NOW() WHERE id=$3',
          [payAllocated, payRemaining, pay.id]
        );
      }

      await CustomerBalance.recompute(client, orgId, customerId);

      await client.query('COMMIT');
      return { applied: totalApplied };
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
          'SELECT paid_amount, total, COALESCE(credited_amount,0) AS credited FROM invoices WHERE id=$1 FOR UPDATE',
          [alloc.invoice_id]
        );
        if (!invoice.rowCount) continue;
        const newPaidAmount = Math.max(0, parseFloat(invoice.rows[0].paid_amount) - parseFloat(alloc.amount));
        // Status reflects paid + credited; aging job will re-flag overdue if due.
        await client.query(
          `UPDATE invoices SET paid_amount=$1,
             status = CASE
               WHEN ($1 + COALESCE(credited_amount,0)) >= total THEN 'paid'
               WHEN $1 > 0 THEN 'partially_paid'
               ELSE 'sent' END,
             updated_at=NOW() WHERE id=$2`,
          [newPaidAmount, alloc.invoice_id]
        );
        await client.query(
          'DELETE FROM payment_allocations WHERE payment_id=$1 AND invoice_id=$2',
          [paymentId, alloc.invoice_id]
        );
      }

      // Reset the payment's allocation split — fully unapplied now that it's reversed.
      await client.query(
        "UPDATE payments SET status='reversed', allocated_amount=0, unapplied_amount=amount, updated_at=NOW() WHERE id=$1",
        [paymentId]
      );

      if (customer_id) {
        await CustomerBalance.recompute(client, orgId, customer_id);
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
