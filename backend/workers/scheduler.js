// backend/workers/scheduler.js
// Polls for due recurring invoices every 60 seconds and dispatches jobs.
// Also refreshes materialized views every 5 minutes.
const { recurringQueue, mvRefreshQueue } = require('./queues');
const { db } = require('../db');

async function dispatchDueRecurringInvoices() {
  try {
    // ATOMIC claim + advance: each due template is moved past today in the SAME
    // statement that selects it, so it can only be claimed once. This eliminates
    // the duplicate-generation bug where the 60s poll re-queued the same template
    // repeatedly until the worker finished. The worker no longer advances next_run.
    // Frequency values match the recurring_invoices CHECK constraint.
    // First, auto-pause templates that have passed their end_date so they stop
    // appearing in "due" queries.
    await db.query(
      `UPDATE recurring_invoices
          SET status = 'paused', updated_at = NOW()
        WHERE status = 'active'
          AND end_date IS NOT NULL
          AND end_date < CURRENT_DATE
          AND deleted_at IS NULL`
    );

    const { rows } = await db.query(
      `UPDATE recurring_invoices
          SET last_run = next_run,
              next_run = (next_run::timestamp + (CASE frequency
                WHEN 'daily'     THEN INTERVAL '1 day'
                WHEN 'weekly'    THEN INTERVAL '7 days'
                WHEN 'bimonthly' THEN INTERVAL '2 months'
                WHEN 'monthly'   THEN INTERVAL '1 month'
                WHEN 'quarterly' THEN INTERVAL '3 months'
                WHEN 'biannual'  THEN INTERVAL '6 months'
                WHEN 'yearly'    THEN INTERVAL '1 year'
                ELSE INTERVAL '1 month' END))::date,
              updated_at = NOW()
        WHERE status = 'active'
          AND next_run IS NOT NULL
          AND next_run <= CURRENT_DATE
          AND (end_date IS NULL OR next_run <= end_date)
          AND deleted_at IS NULL
        RETURNING id, org_id, next_run, last_run`
    );

    for (const row of rows) {
      // Stable jobId keyed to the claimed period — safe against duplicate enqueue.
      await recurringQueue.add(
        { orgId: row.org_id, templateId: row.id, periodKey: String(row.next_run) },
        {
          jobId:    `recurring-${row.id}-${String(row.next_run)}`,
          attempts: 3,
          backoff:  { type: 'exponential', delay: 5000 },
        }
      );
      console.log(`[Scheduler] Queued recurring invoice for template ${row.id} (next: ${row.next_run})`);
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

// Invoice aging: flip sent / partially_paid invoices to 'overdue' once past due.
async function markOverdueInvoices() {
  try {
    const { rowCount } = await db.query(
      `UPDATE invoices
          SET status = 'overdue', updated_at = NOW()
        WHERE status IN ('sent', 'partially_paid')
          AND due_date IS NOT NULL
          AND due_date < CURRENT_DATE
          AND deleted_at IS NULL`
    );
    if (rowCount) console.log(`[Scheduler] Marked ${rowCount} invoice(s) overdue`);
  } catch (err) {
    console.error('[Scheduler] markOverdueInvoices error:', err.message);
  }
}

// Dispatch recurring invoices every 60 seconds
dispatchDueRecurringInvoices();
setInterval(dispatchDueRecurringInvoices, 60 * 1000);

// Age invoices on boot, then hourly.
markOverdueInvoices();
setInterval(markOverdueInvoices, 60 * 60 * 1000);

// Refresh materialized views every 5 minutes
refreshMaterializedViews();
setInterval(refreshMaterializedViews, 5 * 60 * 1000);

console.log('[Workers] scheduler started');
module.exports = {};
