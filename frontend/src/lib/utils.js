// Formatting utilities for BillFlow Pro

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
    partially_paid: 'badge-yellow',
    refunded:      'badge-purple',
    not_shipped: 'badge-gray',
    processing:  'badge-yellow',
    shipped:     'badge-blue',
    delivered:   'badge-green',
  }
  return map[status] || 'badge-gray'
}

export const ROLES = ['owner', 'admin', 'staff', 'member']
export const ROLE_PAGE_ACCESS = {
  owner:  ['dashboard','customers','products','invoices','payments','vendors','expenses','reports','settings','marketplace','banking','warranty','roles','purchase_mgmt','goods_mgmt','ap_handle','recurring_txn'],
  admin:  ['dashboard','customers','products','invoices','payments','vendors','expenses','reports','settings','marketplace','banking','warranty','roles','purchase_mgmt','goods_mgmt','ap_handle','recurring_txn'],
  staff:  ['dashboard','customers','products','invoices','payments','vendors','expenses','banking','warranty','purchase_mgmt','goods_mgmt','ap_handle','recurring_txn'],
  member: ['dashboard','customers','products','invoices','payments','vendors','expenses','warranty','purchase_mgmt','goods_mgmt','ap_handle','recurring_txn'],
}
export const ROLE_DEFAULT_PAGE = {
  owner:  '/dashboard',
  admin:  '/dashboard',
  staff:  '/invoices',
  member: '/invoices',
}

export const TAX_RATES = [0, 5, 12, 18, 28]
export const EXPENSE_CATEGORIES = [
  'rent','utilities','salaries','marketing','transport','office_supplies',
  'travel','maintenance','insurance','legal','subscriptions','bank_charges','other',
]
export const PAYMENT_METHODS = ['bank_transfer','upi','neft','rtgs','cash','cheque','card']
export const UNITS = ['pcs','kg','g','litre','ml','box','carton','dozen','metre','sqft','hour','set']
export const PRODUCT_CATEGORIES = ['general','electronics','clothing','food','furniture','medical','automotive','stationery','other']
