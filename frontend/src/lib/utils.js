// Formatting utilities for Ozofi Books Pro

export const fmt = {
  currency: (n, currency = 'INR') =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 2 }).format(n ?? 0),

  number: (n) => new Intl.NumberFormat('en-IN').format(n ?? 0),

  date: (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—',

  dateInput: (d) => d ? new Date(d).toISOString().split('T')[0] : '',

  percent: (n) => `${Number(n ?? 0).toFixed(1)}%`,

  initials: (name = '') => name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2),
}

export const statusBadge = (status) => {
  const map = {
    draft:       'badge-gray',
    sent:        'badge-blue',
    paid:        'badge-green',
    overdue:     'badge-red',
    cancelled:   'badge-gray',
    pending:     'badge-yellow',
    approved:    'badge-green',
    rejected:    'badge-red',
    resolved:    'badge-purple',
    active:      'badge-green',
    inactive:    'badge-gray',
    blocked:     'badge-red',
    not_shipped: 'badge-gray',
    processing:  'badge-yellow',
    shipped:     'badge-blue',
    delivered:   'badge-green',
  }
  return map[status] || 'badge-gray'
}

export const ROLES = ['owner', 'admin', 'accountant', 'staff', 'member']

// All page IDs in the new navigation architecture
const ALL_PAGES = [
  // Core
  'dashboard',
  // Sales
  'customers', 'quotations', 'invoices', 'payments_received', 'credit_notes',
  'recurring_billing', 'warranty',
  // Purchasing
  'vendors', 'purchase_orders', 'goods_mgmt', 'goods_returns',
  'accounts_payable', 'vendor_payments', 'procurement_analytics',
  // Inventory
  'products', 'stock_overview', 'stock_movements', 'stock_valuation',
  'low_stock_alerts', 'inventory_analytics',
  // Banking
  'banking_overview', 'bank_accounts', 'bank_transactions', 'collections_center',
  'banking_vendor_payments', 'reconciliation_center', 'cash_flow_forecast', 'banking_insights',
  // Finance
  'expenses', 'budget_planner', 'gst_center', 'profit_loss',
  'tax_reports', 'bank_transactions', 'audit_logs', 'financial_reports',
  // Administration
  'org_settings', 'roles', 'preferences', 'approval_workflows', 'integrations',
]

// Subset visible to each role
export const ROLE_PAGE_ACCESS = {
  owner: ALL_PAGES,

  admin: ALL_PAGES.filter(p => !['audit_logs', 'integrations', 'approval_workflows'].includes(p)),

  accountant: [
    'dashboard',
    'customers', 'invoices', 'payments_received', 'credit_notes',
    'vendors', 'accounts_payable', 'vendor_payments', 'procurement_analytics',
    'banking_overview', 'bank_accounts', 'bank_transactions', 'collections_center',
    'reconciliation_center', 'cash_flow_forecast',
    'expenses', 'budget_planner', 'gst_center', 'profit_loss',
    'financial_reports', 'tax_reports', 'audit_logs',
    'products', 'stock_overview', 'stock_valuation',
    'org_settings', 'preferences',
  ],

  staff: [
    'dashboard',
    'customers', 'quotations', 'invoices', 'payments_received', 'warranty',
    'vendors', 'purchase_orders', 'goods_mgmt', 'goods_returns', 'accounts_payable',
    'products', 'stock_overview', 'low_stock_alerts',
    'banking_overview', 'bank_transactions',
    'expenses', 'budget_planner',
  ],

  member: [
    'dashboard',
    'customers', 'invoices', 'payments_received', 'warranty',
    'products', 'stock_overview',
    'expenses',
  ],
}

export const ROLE_DEFAULT_PAGE = {
  owner:      '/dashboard',
  admin:      '/dashboard',
  accountant: '/banking',
  staff:      '/invoices',
  member:     '/invoices',
}

export const TAX_RATES = [0, 5, 12, 18, 28]
export const EXPENSE_CATEGORIES = [
  'rent','utilities','salaries','marketing','transport','office_supplies',
  'travel','maintenance','insurance','legal','subscriptions','bank_charges','other',
]
export const PAYMENT_METHODS = ['bank_transfer','upi','neft','rtgs','cash','cheque','card']
export const UNITS = ['pcs','kg','g','litre','ml','box','carton','dozen','metre','sqft','hour','set']
export const PRODUCT_CATEGORIES = ['general','electronics','clothing','food','furniture','medical','automotive','stationery','other']

export function amountToWords(num) {
  if (num === null || num === undefined || isNaN(num)) return 'Zero Rupees Only'
  const n = Math.abs(Number(num))
  const whole = Math.floor(n)
  const paise = Math.round((n - whole) * 100)

  const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

  function inWords(val) {
    if (val < 20) return a[val]
    if (val < 100) return b[Math.floor(val / 10)] + (val % 10 !== 0 ? ' ' + a[val % 10] : '')
    if (val < 1000) return a[Math.floor(val / 100)] + ' Hundred' + (val % 100 !== 0 ? ' ' + inWords(val % 100) : '')
    if (val < 100000) return inWords(Math.floor(val / 1000)) + ' Thousand' + (val % 1000 !== 0 ? ' ' + inWords(val % 1000) : '')
    if (val < 10000000) return inWords(Math.floor(val / 100000)) + ' Lakh' + (val % 100000 !== 0 ? ' ' + inWords(val % 100000) : '')
    return inWords(Math.floor(val / 10000000)) + ' Crore' + (val % 10000000 !== 0 ? ' ' + inWords(val % 10000000) : '')
  }

  const str = whole === 0 ? 'Zero' : inWords(whole)
  let res = str + ' Rupees'
  if (paise > 0) {
    res += ' and ' + inWords(paise) + ' Paise'
  }
  return res + ' Only'
}

