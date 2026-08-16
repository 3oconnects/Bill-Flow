// backend/routes/billing.js
// SaaS billing routes — plans, subscriptions, Stripe/Razorpay webhooks
'use strict';
const express = require('express');
const router = express.Router();
const { requireAuth, requireOwner } = require('../auth');
const { sendSuccess, sendError } = require('../utils/response');
const subscriptionService = require('../services/billing/subscriptionService');
const { getDefaultGateway, getGateway } = require('../services/billing/gateway');
const logger = require('../utils/logger');

// ── Public: List plans ──────────────────────────────────────────────────────

router.get('/plans', async (req, res) => {
  try {
    const plans = await subscriptionService.getPlans();
    // Strip gateway IDs from public response
    const sanitized = plans.map(p => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      description: p.description,
      price_monthly: p.price_monthly,
      price_yearly: p.price_yearly,
      currency: p.currency,
      max_users: p.max_users,
      max_invoices_mo: p.max_invoices_mo,
      max_customers: p.max_customers,
      max_vendors: p.max_vendors,
      max_products: p.max_products,
      max_storage_mb: p.max_storage_mb,
      features: p.features,
      sort_order: p.sort_order,
    }));
    sendSuccess(res, sanitized);
  } catch (err) {
    logger.error('Get plans error', { error: err.message });
    sendError(res, 'Failed to load plans', 'INTERNAL_ERROR', 500);
  }
});

// ── Get current subscription ─────────────────────────────────────────────────

router.get('/subscription', requireAuth, async (req, res) => {
  try {
    let sub = await subscriptionService.getOrgSubscription(req.orgId);

    // Auto-create free subscription if none exists (first login after migration)
    if (!sub) {
      await subscriptionService.createFreeSubscription(req.orgId);
      sub = await subscriptionService.getOrgSubscription(req.orgId);
    }

    sendSuccess(res, {
      id: sub.id,
      plan_name: sub.plan_name,
      plan_slug: sub.plan_slug,
      status: sub.status,
      billing_cycle: sub.billing_cycle,
      features: sub.features,
      limits: {
        max_users: sub.max_users,
        max_invoices_mo: sub.max_invoices_mo,
        max_customers: sub.max_customers,
        max_vendors: sub.max_vendors,
        max_products: sub.max_products,
        max_storage_mb: sub.max_storage_mb,
      },
      usage: {
        invoices_this_month: sub.invoices_this_month,
      },
      trial_ends_at: sub.trial_ends_at,
      current_period_end: sub.current_period_end,
      canceled_at: sub.canceled_at,
      gateway: sub.gateway,
    });
  } catch (err) {
    logger.error('Get subscription error', { error: err.message });
    sendError(res, 'Failed to load subscription', 'INTERNAL_ERROR', 500);
  }
});

// ── Change plan (upgrade/downgrade) ──────────────────────────────────────────

router.post('/change-plan', requireAuth, requireOwner, async (req, res) => {
  try {
    const { plan_slug, billing_cycle } = req.body;
    if (!plan_slug) return sendError(res, 'plan_slug is required', 'VALIDATION_ERROR', 400);

    const result = await subscriptionService.changePlan(
      req.orgId, plan_slug, billing_cycle || 'monthly'
    );

    sendSuccess(res, {
      plan: { id: result.plan.id, name: result.plan.name, slug: result.plan.slug },
      event: result.eventType,
      checkout_url: result.checkoutUrl, // null for free, Stripe Checkout URL for paid
    });
  } catch (err) {
    logger.error('Change plan error', { error: err.message, orgId: req.orgId });
    sendError(res, err.message || 'Failed to change plan', 'BILLING_ERROR', 400);
  }
});

// ── Start trial ──────────────────────────────────────────────────────────────

router.post('/start-trial', requireAuth, requireOwner, async (req, res) => {
  try {
    const { plan_slug } = req.body;
    const result = await subscriptionService.createTrialSubscription(
      req.orgId, plan_slug || 'pro'
    );
    sendSuccess(res, {
      plan: { id: result.plan.id, name: result.plan.name, slug: result.plan.slug },
      trial_ends_at: result.trialEnds,
    });
  } catch (err) {
    logger.error('Start trial error', { error: err.message });
    sendError(res, err.message || 'Failed to start trial', 'BILLING_ERROR', 400);
  }
});

// ── Billing portal (Stripe) ─────────────────────────────────────────────────

router.post('/portal', requireAuth, requireOwner, async (req, res) => {
  try {
    const sub = await subscriptionService.getOrgSubscription(req.orgId);
    if (!sub || !sub.gateway_customer_id || sub.gateway !== 'stripe') {
      return sendError(res, 'No billing portal available for your subscription', 'NO_PORTAL', 400);
    }

    const gw = getGateway('stripe');
    const session = await gw.createPortalSession({
      customerId: sub.gateway_customer_id,
      returnUrl: `${process.env.FRONTEND_URL || 'http://localhost:5174'}/settings`,
    });

    sendSuccess(res, { url: session.url });
  } catch (err) {
    logger.error('Billing portal error', { error: err.message });
    sendError(res, 'Failed to open billing portal', 'BILLING_ERROR', 500);
  }
});

// ── Usage check endpoint ────────────────────────────────────────────────────

router.get('/usage', requireAuth, async (req, res) => {
  try {
    const resources = ['users', 'invoices', 'customers', 'vendors', 'products'];
    const usage = {};
    for (const r of resources) {
      usage[r] = await subscriptionService.checkLimit(req.orgId, r);
    }
    sendSuccess(res, usage);
  } catch (err) {
    logger.error('Usage check error', { error: err.message });
    sendError(res, 'Failed to check usage', 'INTERNAL_ERROR', 500);
  }
});

// ── Stripe Webhook ──────────────────────────────────────────────────────────

router.post(
  '/webhooks/stripe',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    try {
      if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
        return res.status(200).json({ received: true, note: 'Stripe not configured' });
      }

      const gw = getGateway('stripe');
      const event = gw.constructWebhookEvent(
        req.body,
        req.headers['stripe-signature']
      );

      await subscriptionService.processStripeWebhook(event);
      res.status(200).json({ received: true });
    } catch (err) {
      logger.error('Stripe webhook error', { error: err.message });
      res.status(400).json({ error: err.message });
    }
  }
);

// ── Razorpay Webhook ────────────────────────────────────────────────────────

router.post(
  '/webhooks/razorpay',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    try {
      if (!process.env.RAZORPAY_WEBHOOK_SECRET) {
        return res.status(200).json({ received: true, note: 'Razorpay not configured' });
      }

      const gw = getGateway('razorpay');
      const event = gw.constructWebhookEvent(
        req.body,
        req.headers['x-razorpay-signature']
      );

      // Process Razorpay subscription events
      if (event.event === 'subscription.activated') {
        const sub = event.payload?.subscription?.entity;
        if (sub) {
          await subscriptionService.processStripeWebhook({
            type: 'checkout.session.completed',
            data: { object: { subscription: sub.id, metadata: sub.notes || {} } },
          });
        }
      }

      res.status(200).json({ received: true });
    } catch (err) {
      logger.error('Razorpay webhook error', { error: err.message });
      res.status(200).json({ received: true }); // Always 200 to prevent retries
    }
  }
);

module.exports = router;
