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
};
