// backend/workers/scheduler.js
// Polls for due recurring invoices every 60 seconds and dispatches jobs.
// Also refreshes materialized views every 5 minutes.
const { recurringQueue, mvRefreshQueue } = require('./queues');
const { db } = require('../db');

async function dispatchDueRecurringInvoices() {
  try {
    const { rows } = await db.query(
      `SELECT id, org_id FROM recurring_invoices
        WHERE status = 'active'
          AND next_run <= NOW()
          AND deleted_at IS NULL`
    );

    for (const row of rows) {
      await recurringQueue.add(
        { orgId: row.org_id, templateId: row.id },
        {
          jobId:    `recurring-${row.id}-${Date.now()}`,
          attempts: 3,
          backoff:  { type: 'exponential', delay: 5000 },
        }
      );
      console.log(`[Scheduler] Queued recurring invoice for template ${row.id}`);
    }
  } catch (err) {
    console.error('[Scheduler] dispatchDueRecurringInvoices error:', err.message);
  }
}

async function refreshMaterializedViews() {
  try {
    await db.query('REFRESH MATERIALIZED VIEW CONCURRENTLY mv_daily_revenue');
    await db.query('REFRESH MATERIALIZED VIEW CONCURRENTLY mv_customer_aging');
    console.log('[Scheduler] Materialized views refreshed');
  } catch (err) {
    // Non-fatal — MV may not exist yet or CONCURRENTLY requires initial population
    console.warn('[Scheduler] MV refresh warning:', err.message);
  }
}

// Dispatch recurring invoices every 60 seconds
dispatchDueRecurringInvoices();
setInterval(dispatchDueRecurringInvoices, 60 * 1000);

// Refresh materialized views every 5 minutes
refreshMaterializedViews();
setInterval(refreshMaterializedViews, 5 * 60 * 1000);

console.log('[Workers] scheduler started');
module.exports = {};
