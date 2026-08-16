// backend/services/cronService.js
const { db } = require('../db');
const InventoryTxnSvc = require('./inventoryTransactionService');

// Batch processing limit to prevent serverless timeout
const BATCH_SIZE = 100;

async function getNextInvoiceNumber(orgId) {
  const result = await db.query(
    `UPDATE organizations
        SET next_inv_no = COALESCE(next_inv_no, 0) + 1
      WHERE id = $1
      RETURNING CONCAT(COALESCE(inv_prefix, 'INV'), '-', LPAD(next_inv_no::TEXT, 4, '0')) AS number`,
    [orgId]
  );
  if (result.rows.length) return result.rows[0].number;
  const count = await db.query(
    `SELECT COUNT(*)+1 AS n FROM invoices WHERE org_id=$1`, [orgId]
  );
  return `INV-${String(count.rows[0].n).padStart(4, '0')}`;
}

async function processRecurringInvoices() {
  let totalProcessed = 0;
  
  // 1. Auto-pause expired templates first
  await db.query(
    `UPDATE recurring_invoices
        SET status = 'paused', updated_at = NOW()
      WHERE status = 'active'
        AND end_date IS NOT NULL
        AND end_date < CURRENT_DATE
        AND deleted_at IS NULL`
  );

  while (true) {
    // 2. Fetch due templates in batches
    // We use SELECT FOR UPDATE SKIP LOCKED to allow concurrent workers if needed, 
    // though Cron is usually singular. We only fetch due active templates.
    const { rows: templates } = await db.query(
      `SELECT * FROM recurring_invoices
        WHERE status = 'active'
          AND next_run IS NOT NULL
          AND next_run <= CURRENT_DATE
          AND (end_date IS NULL OR next_run <= end_date)
          AND deleted_at IS NULL
        LIMIT $1 FOR UPDATE SKIP LOCKED`,
      [BATCH_SIZE]
    );

    if (templates.length === 0) {
      break; // No more due templates
    }

    for (const row of templates) {
      const orgId = row.org_id;
      const templateId = row.id;
      const periodKey = String(row.next_run); // Used for idempotency

      // 3. Check Idempotency Guard (has this period already been generated?)
      const { rows: existing } = await db.query(
        `SELECT id FROM invoices WHERE source_template_id = $1 AND billing_period = $2 AND deleted_at IS NULL LIMIT 1`,
        [templateId, periodKey]
      );
      
      if (existing.length === 0) {
        // Generate the invoice
        const templateData = typeof row.template_data === 'string'
          ? JSON.parse(row.template_data || '{}')
          : (row.template_data || {});

        const invoiceNumber = await getNextInvoiceNumber(orgId);
        const today = new Date().toISOString().split('T')[0];
        
        const invoiceData = {
          ...templateData,
          number: invoiceNumber,
          date: today,
          due_date: templateData.due_days
            ? new Date(Date.now() + templateData.due_days * 86400000).toISOString().split('T')[0]
            : null,
          customer_id: row.customer_id,
          customer_name: row.customer_name,
          currency: row.currency || 'INR',
          status: row.auto_send ? 'sent' : 'draft',
          total: parseFloat(row.amount || 0),
          subtotal: parseFloat(row.amount || 0),
          tax: 0,
          created_by: null,
          source_template_id: templateId,
          billing_period: periodKey,
        };

        const items = templateData.items || [];
        await InventoryTxnSvc.createInvoiceWithStockDeduction(orgId, invoiceData, items);
        console.log(`[Cron] Generated invoice ${invoiceNumber} for template ${templateId} (period: ${periodKey})`);
      } else {
        console.log(`[Cron] Invoice for template ${templateId} (period: ${periodKey}) already exists. Idempotency guard triggered.`);
      }

      // 4. Advance the next_run date safely
      await db.query(
        `UPDATE recurring_invoices
            SET last_run = next_run,
                next_run = (next_run::timestamp + (CASE frequency
                  WHEN 'daily'     THEN INTERVAL '1 day'
                  WHEN 'weekly'    THEN INTERVAL '7 days'
                  WHEN 'biweekly'  THEN INTERVAL '14 days'
                  WHEN 'bimonthly' THEN INTERVAL '2 months'
                  WHEN 'monthly'   THEN INTERVAL '1 month'
                  WHEN 'quarterly' THEN INTERVAL '3 months'
                  WHEN 'biannual'  THEN INTERVAL '6 months'
                  WHEN 'yearly'    THEN INTERVAL '1 year'
                  WHEN 'annual'    THEN INTERVAL '1 year'
                  ELSE INTERVAL '1 month' END))::date,
                updated_at = NOW()
          WHERE id = $1`,
        [templateId]
      );
      
      totalProcessed++;
    }
  }

  return { processed: totalProcessed };
}

async function markOverdueInvoices() {
  const { rowCount } = await db.query(
    `UPDATE invoices
        SET status = 'overdue', updated_at = NOW()
      WHERE status IN ('sent', 'partially_paid')
        AND due_date IS NOT NULL
        AND due_date < CURRENT_DATE
        AND deleted_at IS NULL`
  );
  return { markedOverdue: rowCount || 0 };
}

async function refreshViews() {
  try {
    await db.query('REFRESH MATERIALIZED VIEW CONCURRENTLY mv_daily_revenue');
    await db.query('REFRESH MATERIALIZED VIEW CONCURRENTLY mv_customer_aging');
    return { success: true };
  } catch (err) {
    console.warn('[Cron] MV refresh warning:', err.message);
    return { success: false, error: err.message };
  }
}

module.exports = {
  processRecurringInvoices,
  markOverdueInvoices,
  refreshViews,
};
