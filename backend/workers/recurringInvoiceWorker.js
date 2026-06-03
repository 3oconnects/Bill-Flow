// backend/workers/recurringInvoiceWorker.js
const { recurringQueue } = require('./queues');
const { db }             = require('../db');
const InventoryTxnSvc    = require('../services/inventoryTransactionService');

// Compute next run date from frequency string
function computeNextRun(frequency, fromDate = new Date()) {
  const d = new Date(fromDate);
  switch (frequency) {
    case 'daily':       d.setDate(d.getDate() + 1);     break;
    case 'weekly':      d.setDate(d.getDate() + 7);     break;
    case 'biweekly':    d.setDate(d.getDate() + 14);    break;
    case 'monthly':     d.setMonth(d.getMonth() + 1);   break;
    case 'quarterly':   d.setMonth(d.getMonth() + 3);   break;
    case 'biannual':    d.setMonth(d.getMonth() + 6);   break;
    case 'annual':      d.setFullYear(d.getFullYear() + 1); break;
    default:            d.setMonth(d.getMonth() + 1);   break; // fallback monthly
  }
  return d.toISOString().split('T')[0];
}

// Generate next invoice number for org
async function getNextInvoiceNumber(orgId) {
  const result = await db.query(
    `UPDATE organizations
        SET next_inv_no = COALESCE(next_inv_no, 0) + 1
      WHERE id = $1
      RETURNING CONCAT(COALESCE(inv_prefix, 'INV'), '-', LPAD(next_inv_no::TEXT, 4, '0')) AS number`,
    [orgId]
  );
  if (result.rows.length) return result.rows[0].number;
  // Fallback
  const count = await db.query(
    `SELECT COUNT(*)+1 AS n FROM invoices WHERE org_id=$1`, [orgId]
  );
  return `INV-${String(count.rows[0].n).padStart(4, '0')}`;
}

recurringQueue.process(async (job) => {
  const { orgId, templateId } = job.data;

  const tmpl = await db.query(
    `SELECT * FROM recurring_invoices
      WHERE id=$1 AND org_id=$2 AND status='active' AND deleted_at IS NULL`,
    [templateId, orgId]
  );
  if (!tmpl.rows.length) {
    console.log(`[Recurring] Template ${templateId} not found or inactive — skipping`);
    return;
  }

  const t           = tmpl.rows[0];
  const templateData = typeof t.template_data === 'string'
    ? JSON.parse(t.template_data || '{}')
    : (t.template_data || {});

  const invoiceNumber = await getNextInvoiceNumber(orgId);
  const today         = new Date().toISOString().split('T')[0];

  const invoiceData = {
    ...templateData,
    number:        invoiceNumber,
    date:          today,
    due_date:      templateData.due_days
      ? new Date(Date.now() + templateData.due_days * 86400000).toISOString().split('T')[0]
      : null,
    customer_id:   t.customer_id,
    customer_name: t.customer_name,
    currency:      t.currency || 'INR',
    status:        t.auto_send ? 'sent' : 'draft',
    total:         parseFloat(t.amount || 0),
    subtotal:      parseFloat(t.amount || 0),
    tax:           0,
    created_by:    null,
  };

  const items = templateData.items || [];

  await InventoryTxnSvc.createInvoiceWithStockDeduction(orgId, invoiceData, items);

  // Schedule next run
  const nextRun = computeNextRun(t.frequency, today);
  await db.query(
    `UPDATE recurring_invoices SET next_run=$1, updated_at=NOW() WHERE id=$2`,
    [nextRun, templateId]
  );

  console.log(`[Recurring] Created invoice ${invoiceNumber} for template ${templateId}. Next: ${nextRun}`);
});

console.log('[Workers] recurringInvoiceWorker started');
module.exports = {};
