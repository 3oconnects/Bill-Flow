// backend/services/billing/subscriptionService.js
// Subscription lifecycle management — plan CRUD, upgrade/downgrade, feature gating
'use strict';
const { v4: uuid } = require('uuid');
const { db } = require('../../db');
const { getDefaultGateway, getGateway } = require('./gateway');
const logger = require('../../utils/logger');

const TRIAL_DAYS = 14;

// ── Plan Queries ─────────────────────────────────────────────────────────────

async function getPlans() {
  const { rows } = await db.query(
    `SELECT id, name, slug, description, price_monthly, price_yearly, currency,
            max_users, max_invoices_mo, max_customers, max_vendors, max_products,
            max_storage_mb, features, sort_order,
            stripe_price_id_monthly, stripe_price_id_yearly,
            razorpay_plan_id_monthly, razorpay_plan_id_yearly
       FROM plans WHERE is_active = TRUE ORDER BY sort_order`
  );
  return rows;
}

async function getPlanById(planId) {
  const { rows } = await db.query(`SELECT * FROM plans WHERE id = $1`, [planId]);
  return rows[0] || null;
}

async function getPlanBySlug(slug) {
  const { rows } = await db.query(`SELECT * FROM plans WHERE slug = $1 AND is_active = TRUE`, [slug]);
  return rows[0] || null;
}

// ── Subscription Queries ────────────────────────────────────────────────────

async function getOrgSubscription(orgId) {
  const { rows } = await db.query(
    `SELECT s.*, p.name AS plan_name, p.slug AS plan_slug, p.features, p.max_users,
            p.max_invoices_mo, p.max_customers, p.max_vendors, p.max_products, p.max_storage_mb
       FROM subscriptions s
       JOIN plans p ON p.id = s.plan_id
      WHERE s.org_id = $1
      ORDER BY s.created_at DESC LIMIT 1`,
    [orgId]
  );
  return rows[0] || null;
}

async function createFreeSubscription(orgId) {
  const id = uuid();
  const freePlan = await getPlanBySlug('free');
  if (!freePlan) throw new Error('Free plan not found — run migration 009');

  await db.query(
    `INSERT INTO subscriptions (id, org_id, plan_id, status, billing_cycle, created_at)
     VALUES ($1, $2, $3, 'active', 'monthly', NOW())
     ON CONFLICT ON CONSTRAINT uq_subscriptions_org DO NOTHING`,
    [id, orgId, freePlan.id]
  );

  await logEvent(orgId, id, 'created', null, freePlan.id);
  return { id, plan: freePlan };
}

async function createTrialSubscription(orgId, planSlug = 'pro') {
  const id = uuid();
  const plan = await getPlanBySlug(planSlug);
  if (!plan) throw new Error(`Plan '${planSlug}' not found`);

  const trialEnds = new Date();
  trialEnds.setDate(trialEnds.getDate() + TRIAL_DAYS);

  await db.query(
    `INSERT INTO subscriptions (id, org_id, plan_id, status, billing_cycle, trial_ends_at, current_period_start, current_period_end, created_at)
     VALUES ($1, $2, $3, 'trialing', 'monthly', $4, NOW(), $4, NOW())
     ON CONFLICT ON CONSTRAINT uq_subscriptions_org DO UPDATE
       SET plan_id = $3, status = 'trialing', trial_ends_at = $4, updated_at = NOW()`,
    [id, orgId, plan.id, trialEnds]
  );

  await db.query(`UPDATE organizations SET trial_started_at = NOW() WHERE id = $1`, [orgId]);
  await logEvent(orgId, id, 'trial_started', null, plan.id);
  return { id, plan, trialEnds };
}

// ── Upgrade / Downgrade ─────────────────────────────────────────────────────

async function changePlan(orgId, newPlanSlug, billingCycle = 'monthly') {
  const current = await getOrgSubscription(orgId);
  if (!current) throw new Error('No active subscription found');

  const newPlan = await getPlanBySlug(newPlanSlug);
  if (!newPlan) throw new Error(`Plan '${newPlanSlug}' not found`);

  if (current.plan_id === newPlan.id) {
    throw new Error('Already on this plan');
  }

  const isUpgrade = newPlan.sort_order > (current.sort_order || 0);
  const eventType = isUpgrade ? 'upgraded' : 'downgraded';

  // If going to free plan, cancel gateway subscription
  if (newPlan.slug === 'free' && current.gateway_subscription_id) {
    try {
      const gw = getGateway(current.gateway);
      await gw.cancelSubscription(current.gateway_subscription_id, { atPeriodEnd: false });
    } catch (err) {
      logger.warn('Failed to cancel gateway subscription', { error: err.message });
    }
  }

  // If upgrading to paid plan, create gateway subscription
  let gatewaySubId = current.gateway_subscription_id;
  let gatewayCustomerId = current.gateway_customer_id;
  let checkoutUrl = null;

  if (newPlan.price_monthly > 0 && !current.gateway_subscription_id) {
    const gw = getDefaultGateway();
    if (gw) {
      // Create customer if needed
      if (!gatewayCustomerId) {
        const { rows } = await db.query(`SELECT * FROM organizations WHERE id = $1`, [orgId]);
        const org = rows[0];
        const customer = await gw.createCustomer(org);
        gatewayCustomerId = customer.id;
      }

      if (gw.name === 'stripe') {
        // Use Stripe Checkout for upgrades
        const priceId = billingCycle === 'yearly'
          ? newPlan.stripe_price_id_yearly
          : newPlan.stripe_price_id_monthly;

        if (priceId) {
          const session = await gw.createCheckoutSession({
            customerId: gatewayCustomerId,
            priceId,
            successUrl: `${process.env.FRONTEND_URL || 'http://localhost:5174'}/settings?billing=success`,
            cancelUrl: `${process.env.FRONTEND_URL || 'http://localhost:5174'}/settings?billing=canceled`,
            metadata: { org_id: orgId, plan_id: newPlan.id },
          });
          checkoutUrl = session.url;
        }
      }
    }
  }

  await db.query(
    `UPDATE subscriptions
        SET plan_id = $1, billing_cycle = $2, gateway_customer_id = COALESCE($3, gateway_customer_id),
            status = CASE WHEN $4 = 'free' THEN 'active' ELSE status END,
            updated_at = NOW()
      WHERE org_id = $5`,
    [newPlan.id, billingCycle, gatewayCustomerId, newPlan.slug, orgId]
  );

  await db.query(`UPDATE organizations SET plan_id = $1 WHERE id = $2`, [newPlan.id, orgId]);
  await logEvent(orgId, current.id, eventType, current.plan_id, newPlan.id);

  return { plan: newPlan, eventType, checkoutUrl };
}

// ── Feature Gating ──────────────────────────────────────────────────────────

async function checkFeature(orgId, featureName) {
  const sub = await getOrgSubscription(orgId);
  if (!sub) return false;
  if (sub.status === 'canceled' || sub.status === 'expired') return false;
  const features = sub.features || {};
  return features[featureName] === true;
}

async function checkLimit(orgId, resource) {
  const sub = await getOrgSubscription(orgId);
  if (!sub) return { allowed: false, reason: 'No subscription' };

  const limitMap = {
    users: sub.max_users,
    invoices: sub.max_invoices_mo,
    customers: sub.max_customers,
    vendors: sub.max_vendors,
    products: sub.max_products,
  };

  const limit = limitMap[resource];
  if (limit === null || limit === undefined) return { allowed: true }; // unlimited

  // Count current usage
  let count = 0;
  switch (resource) {
    case 'users':
      count = (await db.query(
        `SELECT COUNT(*)::int AS c FROM users WHERE org_id = $1 AND deleted_at IS NULL`, [orgId]
      )).rows[0].c;
      break;
    case 'invoices':
      count = sub.invoices_this_month || 0;
      break;
    case 'customers':
      count = (await db.query(
        `SELECT COUNT(*)::int AS c FROM customers WHERE org_id = $1 AND deleted_at IS NULL`, [orgId]
      )).rows[0].c;
      break;
    case 'vendors':
      count = (await db.query(
        `SELECT COUNT(*)::int AS c FROM vendors WHERE org_id = $1 AND deleted_at IS NULL`, [orgId]
      )).rows[0].c;
      break;
    case 'products':
      count = (await db.query(
        `SELECT COUNT(*)::int AS c FROM products WHERE org_id = $1 AND deleted_at IS NULL`, [orgId]
      )).rows[0].c;
      break;
  }

  if (count >= limit) {
    return { allowed: false, reason: `${resource} limit reached (${count}/${limit}). Upgrade your plan.`, current: count, limit };
  }
  return { allowed: true, current: count, limit };
}

// ── Usage Tracking ──────────────────────────────────────────────────────────

async function incrementInvoiceCount(orgId) {
  await db.query(
    `UPDATE subscriptions SET invoices_this_month = invoices_this_month + 1, updated_at = NOW() WHERE org_id = $1`,
    [orgId]
  );
}

async function resetMonthlyCounters() {
  // Called by cron at start of each month
  await db.query(
    `UPDATE subscriptions SET invoices_this_month = 0, usage_reset_at = NOW(), updated_at = NOW()`
  );
  logger.info('Monthly subscription counters reset');
}

// ── Webhook Processing ──────────────────────────────────────────────────────

async function processStripeWebhook(event) {
  const type = event.type;
  const data = event.data?.object;

  switch (type) {
    case 'checkout.session.completed': {
      const orgId = data.metadata?.org_id;
      const planId = data.metadata?.plan_id;
      if (!orgId || !planId) break;

      await db.query(
        `UPDATE subscriptions
            SET status = 'active', gateway = 'stripe',
                gateway_subscription_id = $1, gateway_customer_id = $2,
                current_period_start = NOW(), updated_at = NOW()
          WHERE org_id = $3`,
        [data.subscription, data.customer, orgId]
      );
      await logEvent(orgId, null, 'payment_succeeded', null, planId, data.id);
      break;
    }

    case 'invoice.payment_succeeded': {
      const subId = data.subscription;
      if (!subId) break;
      const { rows } = await db.query(
        `SELECT org_id FROM subscriptions WHERE gateway_subscription_id = $1`, [subId]
      );
      if (rows[0]) {
        await db.query(
          `UPDATE subscriptions SET status = 'active', updated_at = NOW() WHERE gateway_subscription_id = $1`,
          [subId]
        );
        await logEvent(rows[0].org_id, null, 'renewed', null, null, data.id);
      }
      break;
    }

    case 'invoice.payment_failed': {
      const subId = data.subscription;
      if (!subId) break;
      const { rows } = await db.query(
        `SELECT org_id FROM subscriptions WHERE gateway_subscription_id = $1`, [subId]
      );
      if (rows[0]) {
        await db.query(
          `UPDATE subscriptions SET status = 'past_due', updated_at = NOW() WHERE gateway_subscription_id = $1`,
          [subId]
        );
        await logEvent(rows[0].org_id, null, 'payment_failed', null, null, data.id);
      }
      break;
    }

    case 'customer.subscription.deleted': {
      await db.query(
        `UPDATE subscriptions
            SET status = 'canceled', canceled_at = NOW(), updated_at = NOW()
          WHERE gateway_subscription_id = $1`,
        [data.id]
      );
      break;
    }

    default:
      logger.info(`Unhandled Stripe event: ${type}`);
  }
}

// ── Event Logging ───────────────────────────────────────────────────────────

async function logEvent(orgId, subscriptionId, eventType, fromPlanId, toPlanId, gatewayEventId) {
  await db.query(
    `INSERT INTO subscription_events (id, org_id, subscription_id, event_type, from_plan_id, to_plan_id, gateway_event_id, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
    [uuid(), orgId, subscriptionId, eventType, fromPlanId, toPlanId, gatewayEventId || null]
  ).catch(err => logger.warn('Failed to log subscription event', { error: err.message }));
}

module.exports = {
  getPlans,
  getPlanById,
  getPlanBySlug,
  getOrgSubscription,
  createFreeSubscription,
  createTrialSubscription,
  changePlan,
  checkFeature,
  checkLimit,
  incrementInvoiceCount,
  resetMonthlyCounters,
  processStripeWebhook,
  TRIAL_DAYS,
};
