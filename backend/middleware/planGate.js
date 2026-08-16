// backend/middleware/planGate.js
// Feature gating middleware — restricts access based on subscription plan
'use strict';
const subscriptionService = require('../services/billing/subscriptionService');
const { sendError } = require('../utils/response');

/**
 * Middleware factory: require a specific feature to be enabled in the org's plan.
 * Usage: router.use('/banking', requireFeature('banking'), bankingRoutes)
 */
function requireFeature(featureName) {
  return async (req, res, next) => {
    try {
      if (!req.orgId) return sendError(res, 'Authentication required', 'AUTH_REQUIRED', 401);

      const allowed = await subscriptionService.checkFeature(req.orgId, featureName);
      if (!allowed) {
        return sendError(res, `This feature requires a plan upgrade. "${featureName}" is not available on your current plan.`, 'PLAN_UPGRADE_REQUIRED', 403);
      }
      next();
    } catch (err) {
      console.error('Plan gate error:', err);
      // Fail open in case of billing service errors — don't block core functionality
      next();
    }
  };
}

/**
 * Middleware factory: check resource limits before allowing creation.
 * Usage: router.post('/', requireLimit('customers'), createCustomerHandler)
 */
function requireLimit(resource) {
  return async (req, res, next) => {
    try {
      if (!req.orgId) return sendError(res, 'Authentication required', 'AUTH_REQUIRED', 401);

      const result = await subscriptionService.checkLimit(req.orgId, resource);
      if (!result.allowed) {
        return sendError(res, result.reason, 'LIMIT_EXCEEDED', 403);
      }
      // Attach usage info for potential UI display
      req.planUsage = result;
      next();
    } catch (err) {
      console.error('Limit check error:', err);
      // Fail open
      next();
    }
  };
}

/**
 * Middleware: require a minimum plan tier.
 * Usage: requirePlan('pro') — allows 'pro' and 'enterprise'
 */
function requirePlan(minPlanSlug) {
  const planOrder = { free: 0, pro: 1, enterprise: 2 };

  return async (req, res, next) => {
    try {
      if (!req.orgId) return sendError(res, 'Authentication required', 'AUTH_REQUIRED', 401);

      const sub = await subscriptionService.getOrgSubscription(req.orgId);
      if (!sub) {
        return sendError(res, 'No active subscription', 'NO_SUBSCRIPTION', 403);
      }
      if (sub.status === 'canceled' || sub.status === 'expired') {
        return sendError(res, 'Subscription expired. Please renew your plan.', 'SUBSCRIPTION_EXPIRED', 403);
      }

      const currentOrder = planOrder[sub.plan_slug] ?? -1;
      const requiredOrder = planOrder[minPlanSlug] ?? 0;

      if (currentOrder < requiredOrder) {
        return sendError(
          res,
          `This feature requires the ${minPlanSlug.charAt(0).toUpperCase() + minPlanSlug.slice(1)} plan or higher.`,
          'PLAN_UPGRADE_REQUIRED',
          403
        );
      }
      // Attach plan info to request for downstream use
      req.subscription = sub;
      next();
    } catch (err) {
      console.error('Plan check error:', err);
      next();
    }
  };
}

module.exports = { requireFeature, requireLimit, requirePlan };
