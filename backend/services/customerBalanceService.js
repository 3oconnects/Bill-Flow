// backend/services/customerBalanceService.js
// Single source of truth for customer outstanding (accounts-receivable) balance.
//
// Outstanding drift was caused by scattered `outstanding = outstanding ± x`
// cache mutations that could double-count, miss events (invoice create/delete),
// or disagree with each other. Instead we ALWAYS recompute from the invoices
// ledger, which is authoritative and cannot drift.
//
// Definition: sum of unpaid balance (total - paid_amount) across all of the
// customer's invoices that represent a live receivable — i.e. not draft, not
// cancelled, not soft-deleted. (paid invoices contribute 0, so including them is
// harmless; drafts are excluded because they are not yet owed.)
'use strict';
const { db } = require('../db');

/**
 * Recompute and persist a customer's outstanding balance.
 * @param {object} [executor] - a pinned pg client (inside a txn) or omit to use the pool.
 * @param {string} orgId
 * @param {string|null} customerId - no-op when null/undefined.
 * @returns {Promise<number>} the recomputed outstanding amount.
 */
async function recompute(executor, orgId, customerId) {
  if (!customerId) return 0;
  const exec = executor && typeof executor.query === 'function' ? executor : db;
  const { rows } = await exec.query(
    `SELECT COALESCE(SUM(total - COALESCE(paid_amount, 0) - COALESCE(credited_amount, 0)), 0) AS outstanding
       FROM invoices
      WHERE org_id = $1 AND customer_id = $2
        AND deleted_at IS NULL
        AND status NOT IN ('draft', 'cancelled')`,
    [orgId, customerId]
  );
  const outstanding = parseFloat(rows[0].outstanding) || 0;
  await exec.query(
    `UPDATE customers SET outstanding = $1, updated_at = NOW() WHERE id = $2 AND org_id = $3`,
    [outstanding, customerId, orgId]
  );
  return outstanding;
}

module.exports = { recompute };
