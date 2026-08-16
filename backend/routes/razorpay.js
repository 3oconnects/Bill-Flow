// backend/routes/razorpay.js
// Razorpay integration — order creation, webhook verification, payment matching
const express = require('express');
const router  = express.Router();
const crypto  = require('crypto');
const { v4: uuid } = require('uuid');
const { db }  = require('../db');
const { requireAuth } = require('../auth');
const { sendSuccess, sendError } = require('../utils/response');
const PaymentAllocationService = require('../services/paymentAllocationService');

// Lazily instantiate Razorpay so the module loads even without creds in dev
let _rzp = null;
function getRzp() {
  if (_rzp) return _rzp;
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    throw new Error('RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET env vars required');
  }
  const Razorpay = require('razorpay');
  _rzp = new Razorpay({
    key_id:     process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
  return _rzp;
}

// ── Create payment order for an invoice ───────────────────────────────────────
router.post('/orders', requireAuth, async (req, res) => {
  try {
    const { invoice_id } = req.body;
    if (!invoice_id) return sendError(res, 'invoice_id required', 'VALIDATION_ERROR', 400);

    const { rows } = await db.query(
      `SELECT id, number, customer_id, total, COALESCE(paid_amount,0) AS paid,
              customer_email, customer_name, currency
         FROM invoices WHERE id=$1 AND org_id=$2 AND deleted_at IS NULL`,
      [invoice_id, req.orgId]
    );
    if (!rows.length) return sendError(res, 'Invoice not found', 'NOT_FOUND', 404);

    const inv = rows[0];
    const amountDue = parseFloat(inv.total) - parseFloat(inv.paid);
    if (amountDue <= 0) return sendError(res, 'Invoice already paid', 'ALREADY_PAID', 422);

    const paise = Math.round(amountDue * 100);
    const rzp   = getRzp();
    const order = await rzp.orders.create({
      amount:   paise,
      currency: inv.currency || 'INR',
      receipt:  inv.number,
      notes: {
        org_id:      req.orgId,
        invoice_id:  invoice_id,
        customer_id: inv.customer_id || '',
      },
    });

    // Persist the order reference for webhook matching
    await db.query(
      `INSERT INTO razorpay_orders
       (id, org_id, invoice_id, razorpay_order_id, amount, status, created_at)
       VALUES ($1,$2,$3,$4,$5,'created',NOW())
       ON CONFLICT (razorpay_order_id) DO NOTHING`,
      [uuid(), req.orgId, invoice_id, order.id, amountDue]
    ).catch(() => {}); // table may not exist yet — handled by migration

    sendSuccess(res, {
      order_id:        order.id,
      amount:          paise,
      currency:        order.currency,
      key_id:          process.env.RAZORPAY_KEY_ID,
      customer_email:  inv.customer_email,
      customer_name:   inv.customer_name,
      invoice_number:  inv.number,
    });
  } catch (err) {
    console.error('Create Razorpay order error:', err);
    sendError(res, err.message || 'Gateway error', 'GATEWAY_ERROR', 500);
  }
});

// ── Verify payment after frontend callback ─────────────────────────────────────
router.post('/verify', requireAuth, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, invoice_id } = req.body;
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature)
      return sendError(res, 'Missing payment fields', 'VALIDATION_ERROR', 400);

    const secret   = process.env.RAZORPAY_KEY_SECRET;
    const expected = crypto
      .createHmac('sha256', secret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (expected !== razorpay_signature)
      return sendError(res, 'Payment verification failed', 'SIGNATURE_MISMATCH', 400);

    // Fetch payment amount from Razorpay
    const rzp     = getRzp();
    const payment = await rzp.payments.fetch(razorpay_payment_id);
    const amount  = payment.amount / 100; // paise → rupees

    const inv = await db.query(
      `SELECT customer_id FROM invoices WHERE id=$1 AND org_id=$2`,
      [invoice_id, req.orgId]
    );
    if (!inv.rows.length) return sendError(res, 'Invoice not found', 'NOT_FOUND', 404);

    await PaymentAllocationService.createPaymentWithAllocation(
      req.orgId,
      inv.rows[0].customer_id,
      amount,
      new Date().toISOString().split('T')[0],
      'razorpay',
      { [invoice_id]: { amount, notes: `Razorpay ${razorpay_payment_id}` } },
      { reference: razorpay_payment_id, currency: payment.currency, created_by: req.user.id }
    );

    sendSuccess(res, { verified: true, amount });
  } catch (err) {
    console.error('Verify payment error:', err);
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

// ── Webhook (Razorpay server → Ozofi Books) ─────────────────────────────────────
// Must be registered BEFORE express.json() is applied — needs raw body
router.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    try {
      const signature = req.headers['x-razorpay-signature'];
      const secret    = process.env.RAZORPAY_WEBHOOK_SECRET;

      if (!secret) {
        console.warn('[Razorpay Webhook] RAZORPAY_WEBHOOK_SECRET not set — skipping verification');
      } else {
        const expected = crypto
          .createHmac('sha256', secret)
          .update(req.body)
          .digest('hex');
        if (expected !== signature) {
          return res.status(400).json({ error: 'Invalid webhook signature' });
        }
      }

      const event = JSON.parse(req.body.toString());
      console.log('[Razorpay Webhook] event:', event.event);

      if (event.event === 'payment.captured') {
        const pay     = event.payload.payment.entity;
        const orderId = pay.order_id;
        const amount  = pay.amount / 100;

        // Find invoice from order notes
        const rzp   = getRzp();
        const order = await rzp.orders.fetch(orderId);
        const { org_id, invoice_id, customer_id } = order.notes || {};

        if (!invoice_id || !org_id) {
          console.error('[Razorpay Webhook] Missing notes in order', orderId);
          return res.status(200).json({ status: 'ok' }); // Ack to avoid retries
        }

        await PaymentAllocationService.createPaymentWithAllocation(
          org_id,
          customer_id || null,
          amount,
          new Date().toISOString().split('T')[0],
          'razorpay',
          { [invoice_id]: { amount, notes: `Webhook: Razorpay ${pay.id}` } },
          { reference: pay.id, currency: pay.currency }
        ).catch(err => {
          console.error('[Razorpay Webhook] Allocation failed:', err.message);
        });
      }

      res.status(200).json({ status: 'ok' });
    } catch (err) {
      console.error('[Razorpay Webhook] Error:', err);
      res.status(200).json({ status: 'ok' }); // Always 200 to prevent Razorpay retries
    }
  }
);

module.exports = router;
