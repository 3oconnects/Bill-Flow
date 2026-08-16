// backend/services/billing/gateway.js
// Payment Gateway Abstraction Layer — supports Stripe (primary) + Razorpay
'use strict';

/**
 * Gateway interface contract:
 *   createCustomer(org)       → { id, gateway }
 *   createSubscription(opts)  → { id, status, clientSecret?, ... }
 *   cancelSubscription(id)    → { id, status }
 *   getSubscription(id)       → { id, status, currentPeriodEnd, ... }
 *   constructWebhookEvent(body, sig) → parsed event object
 */

class PaymentGateway {
  constructor(name) { this.name = name; }
  async createCustomer() { throw new Error('Not implemented'); }
  async createSubscription() { throw new Error('Not implemented'); }
  async cancelSubscription() { throw new Error('Not implemented'); }
  async getSubscription() { throw new Error('Not implemented'); }
  constructWebhookEvent() { throw new Error('Not implemented'); }
}

// ── Stripe Gateway ──────────────────────────────────────────────────────────
class StripeGateway extends PaymentGateway {
  constructor() {
    super('stripe');
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY env var required for Stripe gateway');
    }
    this.stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
  }

  async createCustomer(org) {
    const customer = await this.stripe.customers.create({
      name: org.name,
      email: org.email,
      metadata: { org_id: org.id, ozofibooks: 'true' },
    });
    return { id: customer.id, gateway: 'stripe' };
  }

  async createSubscription({ customerId, priceId, trialDays, metadata }) {
    const params = {
      customer: customerId,
      items: [{ price: priceId }],
      metadata: metadata || {},
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
    };
    if (trialDays > 0) {
      params.trial_period_days = trialDays;
    }
    const sub = await this.stripe.subscriptions.create(params);
    return {
      id: sub.id,
      status: sub.status,
      clientSecret: sub.latest_invoice?.payment_intent?.client_secret || null,
      currentPeriodStart: new Date(sub.current_period_start * 1000),
      currentPeriodEnd: new Date(sub.current_period_end * 1000),
      trialEnd: sub.trial_end ? new Date(sub.trial_end * 1000) : null,
    };
  }

  async cancelSubscription(subscriptionId, { atPeriodEnd = true } = {}) {
    if (atPeriodEnd) {
      const sub = await this.stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true,
      });
      return { id: sub.id, status: sub.status, cancelAt: new Date(sub.cancel_at * 1000) };
    }
    const sub = await this.stripe.subscriptions.cancel(subscriptionId);
    return { id: sub.id, status: sub.status };
  }

  async getSubscription(subscriptionId) {
    const sub = await this.stripe.subscriptions.retrieve(subscriptionId);
    return {
      id: sub.id,
      status: sub.status,
      currentPeriodStart: new Date(sub.current_period_start * 1000),
      currentPeriodEnd: new Date(sub.current_period_end * 1000),
      cancelAtPeriodEnd: sub.cancel_at_period_end,
    };
  }

  async createCheckoutSession({ customerId, priceId, successUrl, cancelUrl, metadata }) {
    const session = await this.stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: metadata || {},
    });
    return { id: session.id, url: session.url };
  }

  async createPortalSession({ customerId, returnUrl }) {
    const session = await this.stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });
    return { url: session.url };
  }

  constructWebhookEvent(body, signature) {
    return this.stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  }
}

// ── Razorpay Gateway ────────────────────────────────────────────────────────
class RazorpayGateway extends PaymentGateway {
  constructor() {
    super('razorpay');
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      throw new Error('RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET env vars required');
    }
    const Razorpay = require('razorpay');
    this.rzp = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  }

  async createCustomer(org) {
    // Razorpay doesn't have a separate customer API for subscriptions;
    // we create one via the Customers API if available, or use org metadata.
    try {
      const customer = await this.rzp.customers.create({
        name: org.name,
        email: org.email,
        notes: { org_id: org.id },
      });
      return { id: customer.id, gateway: 'razorpay' };
    } catch {
      // Fallback: use org_id as customer reference
      return { id: `org_${org.id}`, gateway: 'razorpay' };
    }
  }

  async createSubscription({ planId, customerId, totalBillingCycles, metadata }) {
    const params = {
      plan_id: planId,
      total_count: totalBillingCycles || 120,
      notes: metadata || {},
    };
    if (customerId && !customerId.startsWith('org_')) {
      params.customer_id = customerId;
    }
    const sub = await this.rzp.subscriptions.create(params);
    return {
      id: sub.id,
      status: sub.status,
      shortUrl: sub.short_url,
      currentPeriodStart: sub.current_start ? new Date(sub.current_start * 1000) : null,
      currentPeriodEnd: sub.current_end ? new Date(sub.current_end * 1000) : null,
    };
  }

  async cancelSubscription(subscriptionId, { atPeriodEnd = true } = {}) {
    const sub = await this.rzp.subscriptions.cancel(subscriptionId, atPeriodEnd);
    return { id: sub.id, status: sub.status };
  }

  async getSubscription(subscriptionId) {
    const sub = await this.rzp.subscriptions.fetch(subscriptionId);
    return {
      id: sub.id,
      status: sub.status,
      currentPeriodStart: sub.current_start ? new Date(sub.current_start * 1000) : null,
      currentPeriodEnd: sub.current_end ? new Date(sub.current_end * 1000) : null,
    };
  }

  constructWebhookEvent(body, signature) {
    const crypto = require('crypto');
    const expected = crypto
      .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
      .update(body)
      .digest('hex');
    if (expected !== signature) {
      throw new Error('Invalid Razorpay webhook signature');
    }
    return JSON.parse(body.toString());
  }
}

// ── Factory ─────────────────────────────────────────────────────────────────
let _stripeGw = null;
let _razorpayGw = null;

function getGateway(name) {
  if (name === 'stripe') {
    if (!_stripeGw) _stripeGw = new StripeGateway();
    return _stripeGw;
  }
  if (name === 'razorpay') {
    if (!_razorpayGw) _razorpayGw = new RazorpayGateway();
    return _razorpayGw;
  }
  throw new Error(`Unknown payment gateway: ${name}`);
}

function getDefaultGateway() {
  // Stripe is primary; fall back to Razorpay if Stripe not configured
  if (process.env.STRIPE_SECRET_KEY) return getGateway('stripe');
  if (process.env.RAZORPAY_KEY_ID) return getGateway('razorpay');
  return null; // No gateway configured — free plan only
}

module.exports = {
  PaymentGateway,
  StripeGateway,
  RazorpayGateway,
  getGateway,
  getDefaultGateway,
};
