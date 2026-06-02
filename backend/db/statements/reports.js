// backend/db/statements/reports.js
const db = require('../conn');

module.exports = {
  getTotalRevenue: db.prepare(`SELECT SUM(total) as total FROM invoices WHERE org_id = ? AND status != 'void' AND deleted_at IS NULL`),
  getTotalExpenses: db.prepare(`SELECT SUM(amount) as total FROM expenses WHERE org_id = ? AND deleted_at IS NULL`),
  getOutstandingAmount: db.prepare(`SELECT SUM(outstanding) as total FROM customers WHERE org_id = ? AND deleted_at IS NULL`),
  getInvoiceCount: db.prepare(`SELECT COUNT(*) as count FROM invoices WHERE org_id = ? AND deleted_at IS NULL`),
  getCustomerCount: db.prepare(`SELECT COUNT(*) as count FROM customers WHERE org_id = ? AND deleted_at IS NULL`),
  
  getInvoicesByStatus: db.prepare(`SELECT status, COUNT(*) as count, SUM(total) as total FROM invoices WHERE org_id = ? AND deleted_at IS NULL GROUP BY status`),
  
  getTopCustomers: db.prepare(`SELECT customer_name, SUM(total) as total FROM invoices WHERE org_id = ? AND deleted_at IS NULL GROUP BY customer_name ORDER BY total DESC LIMIT 5`),
  
  getExpensesByCategory: db.prepare(`SELECT category, SUM(amount) as total FROM expenses WHERE org_id = ? AND deleted_at IS NULL GROUP BY category ORDER BY total DESC`),
  
  getMonthlyRevenue: db.prepare(`
    SELECT TO_CHAR(date::date, 'YYYY-MM') as month, SUM(total) as total 
    FROM invoices 
    WHERE org_id = ? AND deleted_at IS NULL 
    GROUP BY month 
    ORDER BY month DESC 
    LIMIT 12
  `),
  
  getMonthlyExpenses: db.prepare(`
    SELECT TO_CHAR(date::date, 'YYYY-MM') as month, SUM(amount) as total 
    FROM expenses 
    WHERE org_id = ? AND deleted_at IS NULL 
    GROUP BY month 
    ORDER BY month DESC 
    LIMIT 12
  `),

  // Time-series Chart Data
  getDailyChartData: db.prepare(`
    SELECT TO_CHAR(d::date, 'YYYY-MM-DD') as label,
           COALESCE(SUM(CASE WHEN i.org_id = ? THEN i.total ELSE 0 END), 0) as revenue,
           COALESCE(SUM(CASE WHEN ex.org_id = ? THEN ex.amount ELSE 0 END), 0) as expenses
    FROM generate_series(CURRENT_DATE - INTERVAL '30 days', CURRENT_DATE, '1 day'::interval) d
    LEFT JOIN invoices i ON i.date::date = d::date AND i.org_id = ? AND i.deleted_at IS NULL
    LEFT JOIN expenses ex ON ex.date::date = d::date AND ex.org_id = ? AND ex.deleted_at IS NULL
    GROUP BY d ORDER BY d ASC
  `),
  getMonthlyChartData: db.prepare(`
    SELECT TO_CHAR(d::date, 'YYYY-MM') as label,
           COALESCE(SUM(CASE WHEN i.org_id = ? THEN i.total ELSE 0 END), 0) as revenue,
           COALESCE(SUM(CASE WHEN ex.org_id = ? THEN ex.amount ELSE 0 END), 0) as expenses
    FROM generate_series(DATE_TRUNC('year', CURRENT_DATE), DATE_TRUNC('year', CURRENT_DATE) + INTERVAL '11 months', '1 month'::interval) d
    LEFT JOIN invoices i ON DATE_TRUNC('month', i.date::date) = d::date AND i.org_id = ? AND i.deleted_at IS NULL
    LEFT JOIN expenses ex ON DATE_TRUNC('month', ex.date::date) = d::date AND ex.org_id = ? AND ex.deleted_at IS NULL
    GROUP BY d ORDER BY d ASC
  `),
  getYearlyChartData: db.prepare(`
    SELECT TO_CHAR(d::date, 'YYYY') as label,
           COALESCE(SUM(CASE WHEN i.org_id = ? THEN i.total ELSE 0 END), 0) as revenue,
           COALESCE(SUM(CASE WHEN ex.org_id = ? THEN ex.amount ELSE 0 END), 0) as expenses
    FROM generate_series(DATE_TRUNC('year', CURRENT_DATE) - INTERVAL '4 years', DATE_TRUNC('year', CURRENT_DATE), '1 year'::interval) d
    LEFT JOIN invoices i ON DATE_TRUNC('year', i.date::date) = d::date AND i.org_id = ? AND i.deleted_at IS NULL
    LEFT JOIN expenses ex ON DATE_TRUNC('year', ex.date::date) = d::date AND ex.org_id = ? AND ex.deleted_at IS NULL
    GROUP BY d ORDER BY d ASC
  `)

  // ── Aged Receivables ────────────────────────────────────────────────
  ,getAgedReceivables: db.prepare(`
    SELECT
      c.name as customer_name, c.email as customer_email,
      SUM(CASE WHEN i.due_date >= CURRENT_DATE THEN (i.total - COALESCE(i.amount_paid,0)) ELSE 0 END) as current_amt,
      SUM(CASE WHEN i.due_date < CURRENT_DATE AND i.due_date >= CURRENT_DATE - INTERVAL '30 days' THEN (i.total - COALESCE(i.amount_paid,0)) ELSE 0 END) as days_1_30,
      SUM(CASE WHEN i.due_date < CURRENT_DATE - INTERVAL '30 days' AND i.due_date >= CURRENT_DATE - INTERVAL '60 days' THEN (i.total - COALESCE(i.amount_paid,0)) ELSE 0 END) as days_31_60,
      SUM(CASE WHEN i.due_date < CURRENT_DATE - INTERVAL '60 days' AND i.due_date >= CURRENT_DATE - INTERVAL '90 days' THEN (i.total - COALESCE(i.amount_paid,0)) ELSE 0 END) as days_61_90,
      SUM(CASE WHEN i.due_date < CURRENT_DATE - INTERVAL '90 days' THEN (i.total - COALESCE(i.amount_paid,0)) ELSE 0 END) as days_90_plus,
      SUM(i.total - COALESCE(i.amount_paid,0)) as total_outstanding
    FROM invoices i
    JOIN customers c ON i.customer_id = c.id
    WHERE i.org_id = ? AND i.status NOT IN ('paid','cancelled','void') AND i.deleted_at IS NULL
    GROUP BY c.id, c.name, c.email
    HAVING SUM(i.total - COALESCE(i.amount_paid,0)) > 0
    ORDER BY total_outstanding DESC
  `),

  // ── P&L Statement ────────────────────────────────────────────────────
  getPLByMonth: db.prepare(`
    SELECT
      TO_CHAR(date::date, 'YYYY-MM') as month,
      SUM(total) as revenue,
      SUM(tax) as gst_collected,
      SUM(subtotal) as net_revenue,
      COUNT(*) as invoice_count
    FROM invoices
    WHERE org_id = ? AND status NOT IN ('draft','cancelled','void') AND deleted_at IS NULL
    GROUP BY month ORDER BY month
  `),
  getPLExpensesByMonth: db.prepare(`
    SELECT
      TO_CHAR(date::date, 'YYYY-MM') as month,
      category,
      SUM(amount) as total,
      SUM(amount * gst_rate / 100) as gst_paid
    FROM expenses
    WHERE org_id = ? AND deleted_at IS NULL
    GROUP BY month, category ORDER BY month
  `),

  // ── Cash Flow ─────────────────────────────────────────────────────────
  getCashFlowInflows: db.prepare(`
    SELECT
      TO_CHAR(p.date::date, 'YYYY-MM') as month,
      SUM(p.amount) as total,
      COUNT(*) as count,
      p.method
    FROM payments p
    WHERE p.org_id = ? AND p.deleted_at IS NULL
    GROUP BY month, p.method ORDER BY month
  `),
  getCashFlowOutflows: db.prepare(`
    SELECT
      TO_CHAR(e.date::date, 'YYYY-MM') as month,
      SUM(e.amount) as total,
      COUNT(*) as count,
      e.category
    FROM expenses e
    WHERE e.org_id = ? AND e.deleted_at IS NULL
    GROUP BY month, e.category ORDER BY month
  `),

  // ── GST Summary ────────────────────────────────────────────────────────
  getGSTCollected: db.prepare(`
    SELECT
      TO_CHAR(date::date, 'YYYY-MM') as month,
      ii.tax_rate as rate,
      SUM(ii.tax_amount) as tax_amount,
      SUM(ii.amount - ii.tax_amount) as taxable_amount
    FROM invoice_items ii
    JOIN invoices i ON ii.invoice_id = i.id
    WHERE i.org_id = ? AND i.status NOT IN ('draft','cancelled','void') AND i.deleted_at IS NULL
    GROUP BY month, ii.tax_rate ORDER BY month
  `),
  getGSTPaid: db.prepare(`
    SELECT
      TO_CHAR(date::date, 'YYYY-MM') as month,
      gst_rate as rate,
      SUM(amount * gst_rate / 100) as tax_amount,
      SUM(amount) as taxable_amount
    FROM expenses
    WHERE org_id = ? AND gst_rate > 0 AND deleted_at IS NULL
    GROUP BY month, gst_rate ORDER BY month
  `),

  // ── Expense Analytics ─────────────────────────────────────────────────
  getTopVendorsByExpense: db.prepare(`
    SELECT v.name as vendor_name, SUM(e.amount) as total, COUNT(*) as count
    FROM expenses e JOIN vendors v ON e.vendor_id = v.id
    WHERE e.org_id = ? AND e.vendor_id IS NOT NULL AND e.deleted_at IS NULL
    GROUP BY v.id, v.name ORDER BY total DESC LIMIT 10
  `),
  getExpenseTrend: db.prepare(`
    SELECT TO_CHAR(date::date, 'YYYY-MM') as month, SUM(amount) as total, COUNT(*) as count
    FROM expenses WHERE org_id = ? AND deleted_at IS NULL
    GROUP BY month ORDER BY month
  `),
  getExpenseMonthVsCategory: db.prepare(`
    SELECT category, TO_CHAR(date::date, 'YYYY-MM') as month, SUM(amount) as total
    FROM expenses WHERE org_id = ? AND deleted_at IS NULL
    GROUP BY category, month ORDER BY month, total DESC
  `)

  // ── A/P Aging ──────────────────────────────────────────────────────────
  ,getAPAging: db.prepare(`
    SELECT
      v.name as vendor_name, v.email as vendor_email,
      SUM(CASE WHEN ai.due_date >= CURRENT_DATE THEN ai.balance_due ELSE 0 END) as current_amt,
      SUM(CASE WHEN ai.due_date < CURRENT_DATE AND ai.due_date >= CURRENT_DATE - INTERVAL '30 days' THEN ai.balance_due ELSE 0 END) as days_1_30,
      SUM(CASE WHEN ai.due_date < CURRENT_DATE - INTERVAL '30 days' AND ai.due_date >= CURRENT_DATE - INTERVAL '60 days' THEN ai.balance_due ELSE 0 END) as days_31_60,
      SUM(CASE WHEN ai.due_date < CURRENT_DATE - INTERVAL '60 days' AND ai.due_date >= CURRENT_DATE - INTERVAL '90 days' THEN ai.balance_due ELSE 0 END) as days_61_90,
      SUM(CASE WHEN ai.due_date < CURRENT_DATE - INTERVAL '90 days' THEN ai.balance_due ELSE 0 END) as days_90_plus,
      SUM(ai.balance_due) as total_outstanding
    FROM ap_invoices ai
    JOIN vendors v ON ai.vendor_id = v.id
    WHERE ai.org_id = ? AND ai.status NOT IN ('paid','cancelled') AND ai.deleted_at IS NULL AND ai.balance_due > 0
    GROUP BY v.id, v.name, v.email
    ORDER BY total_outstanding DESC
  `),

  // ── Balance Sheet ──────────────────────────────────────────────────────
  getBalanceSheetAssets: db.prepare(`
    SELECT
      SUM(CASE WHEN p.status IN ('sent','overdue') THEN i.total - COALESCE(i.amount_paid,0) ELSE 0 END) as accounts_receivable,
      (SELECT COALESCE(SUM(p2.amount),0) FROM payments p2 WHERE p2.org_id = $1 AND p2.deleted_at IS NULL) as cash_received,
      (SELECT COALESCE(SUM(pr.stock_qty * pr.purchase_price),0) FROM products pr WHERE pr.org_id = $1 AND pr.deleted_at IS NULL) as inventory_value
    FROM invoices i
    LEFT JOIN payments p ON p.invoice_id = i.id AND p.org_id = i.org_id
    WHERE i.org_id = $1 AND i.deleted_at IS NULL
  `),
  getBalanceSheetLiabilities: db.prepare(`
    SELECT
      COALESCE(SUM(CASE WHEN ai.status NOT IN ('paid','cancelled') THEN ai.balance_due ELSE 0 END),0) as accounts_payable,
      COALESCE(SUM(ii.tax_amount),0) as gst_payable
    FROM ap_invoices ai
    CROSS JOIN (SELECT COALESCE(SUM(tax_amount),0) as tax_amount FROM invoice_items WHERE org_id = ?) gst
    WHERE ai.org_id = ? AND ai.deleted_at IS NULL
  `),

  // ── Trial Balance ─────────────────────────────────────────────────────
  getTrialBalance: db.prepare(`
    SELECT 'Sales Revenue' as account, 'Revenue' as type,
      0 as debit, COALESCE(SUM(total),0) as credit
    FROM invoices WHERE org_id = ? AND status NOT IN ('draft','cancelled','void') AND deleted_at IS NULL
    UNION ALL
    SELECT 'Accounts Receivable', 'Asset',
      COALESCE(SUM(total - COALESCE(amount_paid,0)),0), 0
    FROM invoices WHERE org_id = ? AND status IN ('sent','overdue') AND deleted_at IS NULL
    UNION ALL
    SELECT 'Cash Received', 'Asset',
      COALESCE(SUM(amount),0), 0
    FROM payments WHERE org_id = ? AND deleted_at IS NULL
    UNION ALL
    SELECT 'Expenses', 'Expense',
      COALESCE(SUM(amount),0), 0
    FROM expenses WHERE org_id = ? AND deleted_at IS NULL
    UNION ALL
    SELECT 'Accounts Payable', 'Liability',
      0, COALESCE(SUM(balance_due),0)
    FROM ap_invoices WHERE org_id = ? AND status NOT IN ('paid','cancelled') AND deleted_at IS NULL
    UNION ALL
    SELECT 'Inventory', 'Asset',
      COALESCE(SUM(stock_qty * purchase_price),0), 0
    FROM products WHERE org_id = ? AND deleted_at IS NULL
    ORDER BY type, account
  `),

  // ── Cash Ledger ────────────────────────────────────────────────────────
  getCashLedger: db.prepare(`
    SELECT 'receipt' as txn_type, p.date, p.amount, 0 as out_amount,
           i.number as reference, c.name as party, p.method, p.notes as narration
    FROM payments p
    LEFT JOIN invoices i ON p.invoice_id = i.id
    LEFT JOIN customers c ON i.customer_id = c.id
    WHERE p.org_id = ? AND p.deleted_at IS NULL
    UNION ALL
    SELECT 'payment', e.date, 0, e.amount,
           COALESCE(e.reference, e.category), COALESCE(e.vendor_name,'—'), NULL, e.description
    FROM expenses e
    WHERE e.org_id = ? AND e.deleted_at IS NULL
    ORDER BY date DESC, txn_type
    LIMIT 200
  `)
};
