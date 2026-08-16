import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.response.use(
  (res) => res.data?.data ?? res.data,
  (err) => {
    const msg = err.response?.data?.error?.message || err.response?.data?.error || err.message || 'Request failed'
    return Promise.reject(new Error(msg))
  }
)

// Some list endpoints return a paginated envelope { data: [...], page, limit }
// while components expect a bare array. Normalize so callers always get an array.
const asList = (p) => p.then((r) => (Array.isArray(r) ? r : (r?.data ?? [])))

// ── Auth ──────────────────────────────────────────
export const authApi = {
  me:             ()             => api.get('/auth/me'),
  login:          (data)        => api.post('/auth/login', data),
  register:       (data)        => api.post('/auth/register', data),
  logout:         ()             => api.post('/auth/logout'),
  changePassword: (data)        => api.post('/auth/change-password', data),
  logoutAll:      ()             => api.post('/auth/logout-all'),
  verifyEmail:    (token)        => api.post('/auth/verify-email', { token }),
  resendVerify:   ()             => api.post('/auth/resend-verification'),
}

// ── Organization ──────────────────────────────────
export const orgApi = {
  get:    ()     => api.get('/org'),
  update: (data) => api.put('/org', data),
}

// ── Team ──────────────────────────────────────────
export const teamApi = {
  list:   ()         => api.get('/team'),
  add:    (data)     => api.post('/team', data),
  update: (id, data) => api.put(`/team/${id}`, data),
  remove: (id)       => api.delete(`/team/${id}`),
}

// ── Roles ──────────────────────────────────────────
export const rolesApi = {
  list:   ()         => api.get('/org/roles'),
  create: (data)     => api.post('/org/roles', data),
  update: (id, data) => api.put(`/org/roles/${id}`, data),
  remove: (id)       => api.delete(`/org/roles/${id}`),
}

// ── Customers ─────────────────────────────────────
export const customersApi = {
  list:   ()         => api.get('/customers'),
  detail: (id)       => api.get(`/customers/${id}/detail`),
  create: (data)     => api.post('/customers', data),
  update: (id, data) => api.put(`/customers/${id}`, data),
  remove: (id)       => api.delete(`/customers/${id}`),
}

// ── Vendors ──────────────────────────────────────
export const vendorsApi = {
  list:          ()              => api.get('/vendors'),
  get:           (id)            => api.get(`/vendors/${id}`),
  products:      (id)            => api.get(`/vendors/${id}/products`),
  expenses:      (id)            => api.get(`/vendors/${id}/expenses`),
  summary:       (id)            => api.get(`/vendors/${id}/summary`),
  create:        (data)          => api.post('/vendors', data),
  update:        (id, data)      => api.put(`/vendors/${id}`, data),
  remove:        (id)            => api.delete(`/vendors/${id}`),
  uploadDoc:     (id, data)      => api.post(`/vendors/${id}/documents`, data),
  deleteDoc:     (vid, did)      => api.delete(`/vendors/${vid}/documents/${did}`),
  // Vendor ↔ product links
  listProducts:   (id)             => asList(api.get(`/vendors/${id}/products`)),
  addProduct:     (id, data)       => api.post(`/vendors/${id}/products`, data),
  updateProduct:  (id, pvId, data) => api.put(`/vendors/${id}/products/${pvId}`, data),
  removeProduct:  (id, pvId)       => api.delete(`/vendors/${id}/products/${pvId}`),
}

// ── Products ─────────────────────────────────────
export const productsApi = {
  list:          ()              => api.get('/products'),
  get:           (id)            => api.get(`/products/${id}`),
  generateSku:   (brand)         => api.get(`/products/sku/generate?brand=${brand}`),
  create:        (data)          => api.post('/products', data),
  update:        (id, data)      => api.put(`/products/${id}`, data),
  remove:        (id)            => api.delete(`/products/${id}`),
  analysis:      (id)            => api.get(`/products/${id}/analysis`),
  uploadImage:    (id, data_url)  => api.post(`/products/${id}/image`, { data_url }),
  adjustStock:    (id, data)      => api.patch(`/products/${id}/stock`, data),
  clone:          (id)            => api.post(`/products/${id}/clone`),
  exportCsvUrl:   ()              => `/api/products/export/csv`,
  getStockHistory:(id)            => api.get(`/products/${id}/stock-history`),
  getSalesHistory:(id)            => api.get(`/products/${id}/sales-history`),
  getPriceLists:  (id)            => api.get(`/products/${id}/price-lists`),
  addPriceList:   (id, data)      => api.post(`/products/${id}/price-lists`, data),
  updatePriceList:(id, plId, d)   => api.put(`/products/${id}/price-lists/${plId}`, d),
  removePriceList:(id, plId)      => api.delete(`/products/${id}/price-lists/${plId}`),
  getCategories:  ()              => api.get(`/products/categories/list`),
  createCategory: (data)          => api.post(`/products/categories/list`, data),
  updateCategory: (catId, data)   => api.put(`/products/categories/${catId}`, data),
  removeCategory: (catId)         => api.delete(`/products/categories/${catId}`),
  bulk:          (products)      => api.post('/products/bulk', { products }),
  getVendors:    (id)            => api.get(`/products/${id}/vendors`),
  addVendor:     (id, data)      => api.post(`/products/${id}/vendors`, data),
  updateVendor:  (id, pvid, d)   => api.put(`/products/${id}/vendors/${pvid}`, d),
  removeVendor:  (id, pvid)      => api.delete(`/products/${id}/vendors/${pvid}`),
}

// ── Invoices ─────────────────────────────────────
export const invoicesApi = {
  list:            ()              => asList(api.get('/invoices')),
  get:             (id)            => api.get(`/invoices/${id}`),
  create:          (data)          => api.post('/invoices', data),
  update:          (id, data)      => api.put(`/invoices/${id}`, data),
  updateStatus:    (id, status)    => api.patch(`/invoices/${id}/status`, { status }),
  updateShipment:  (id, status)    => api.patch(`/invoices/${id}/shipment`, { shipment_status: status }),
  remove:          (id)            => api.delete(`/invoices/${id}`),
}

// ── Payments ─────────────────────────────────────
export const paymentsApi = {
  list:   ()         => asList(api.get('/payments')),
  create: (data)     => api.post('/payments', data),
  remove: (id)       => api.delete(`/payments/${id}`),
}

// ── Vendor Payments (AP side) ────────────────────
export const vendorPaymentsApi = {
  list:   ()      => asList(api.get('/vendor-payments')),
  create: (data)  => api.post('/vendor-payments', data),
  remove: (id)    => api.delete(`/vendor-payments/${id}`),
}

// ── Expenses ─────────────────────────────────────
export const expensesApi = {
  list:   ()         => api.get('/expenses'),
  create: (data)     => api.post('/expenses', data),
  update: (id, data) => api.put(`/expenses/${id}`, data),
  remove: (id)       => api.delete(`/expenses/${id}`),
}

// ── Reports ──────────────────────────────────────
export const reportsApi = {
  summary:          ()              => api.get('/reports/summary'),
  agedReceivables: ()              => api.get('/reports/aged-receivables'),
  plStatement:     ()              => api.get('/reports/pl-statement'),
  cashFlow:        ()              => api.get('/reports/cash-flow'),
  gstSummary:      ()              => api.get('/reports/gst-summary'),
  expenseAnalytics:()              => api.get('/reports/expense-analytics'),
  apAging:         ()              => api.get('/reports/ap-aging'),
  balanceSheet:    ()              => api.get('/reports/balance-sheet'),
  trialBalance:    ()              => api.get('/reports/trial-balance'),
  cashLedger:      ()              => api.get('/reports/cash-ledger'),
  chart:   (mode, from, to)        => {
    let url = `/reports/chart?mode=${mode}`
    if (from && to) url += `&from=${from}&to=${to}`
    return api.get(url)
  },
}

// ── Warranty ─────────────────────────────────────
export const warrantyApi = {
  list:         ()                    => api.get('/warranty-claims'),
  create:       (data)                => api.post('/warranty-claims', data),
  updateStatus: (id, status, notes)   => api.patch(`/warranty-claims/${id}/status`, { status, notes }),
  remove:       (id)                  => api.delete(`/warranty-claims/${id}`),
}

// ── Goods Returns ─────────────────────────────────
export const goodsReturnsApi = {
  stats:      ()               => api.get('/goods-returns/stats'),
  list:       (params = {})    => api.get('/goods-returns', { params }),
  get:        (id)             => api.get(`/goods-returns/${id}`),
  create:     (data)           => api.post('/goods-returns', data),
  update:     (id, data)       => api.put(`/goods-returns/${id}`, data),
  delete:     (id)             => api.delete(`/goods-returns/${id}`),
  submit:     (id, note)       => api.patch(`/goods-returns/${id}/submit`, { note }),
  approve:    (id, note)       => api.patch(`/goods-returns/${id}/approve`, { note }),
  process:    (id, note)       => api.patch(`/goods-returns/${id}/process`, { note }),
  close:      (id, note)       => api.patch(`/goods-returns/${id}/close`, { note }),
  creditNote: (id)             => api.patch(`/goods-returns/${id}/credit-note`),
  cancel:     (id, reason)     => api.delete(`/goods-returns/${id}`, { data: { reason } }),
  report:     (type, from, to) => api.get(`/goods-returns/reports/${type}`, { params: { from, to } }),
}

// ── Accounts Payable ──────────────────────────────────
// type: 'invoices' | 'down-payments' | 'credit-memos' | 'reserve-invoices'
export const apApi = {
  stats:        (type)              => api.get(`/ap/${type}/stats`),
  list:         (type, params = {}) => api.get(`/ap/${type}`, { params }),
  get:          (type, id)          => api.get(`/ap/${type}/${id}`),
  create:       (type, data)        => api.post(`/ap/${type}`, data),
  update:       (type, id, data)    => api.put(`/ap/${type}/${id}`, data),
  updateStatus: (type, id, body)    => api.patch(`/ap/${type}/${id}/status`, body),
  cancel:       (type, id, reason)  => api.delete(`/ap/${type}/${id}`, { data: { reason } }),
}

// ── Quotations ───────────────────────────────────
export const quotationsApi = {
  list:    ()              => api.get('/quotations'),
  stats:   ()              => api.get('/quotations/stats'),
  get:     (id)            => api.get(`/quotations/${id}`),
  create:  (data)          => api.post('/quotations', data),
  update:  (id, data)      => api.put(`/quotations/${id}`, data),
  status:  (id, status)    => api.patch(`/quotations/${id}/status`, { status }),
  convert: (id)            => api.post(`/quotations/${id}/convert`),
  remove:  (id)            => api.delete(`/quotations/${id}`),
}

// ── Credit Notes ─────────────────────────────────
export const creditNotesApi = {
  list:    ()     => api.get('/credit-notes'),
  stats:   ()     => api.get('/credit-notes/stats'),
  get:     (id)   => api.get(`/credit-notes/${id}`),
  create:  (data) => api.post('/credit-notes', data),
  approve: (id)   => api.patch(`/credit-notes/${id}/approve`),
  apply:   (id)   => api.patch(`/credit-notes/${id}/apply`),
  reject:  (id)   => api.patch(`/credit-notes/${id}/reject`),
  remove:  (id)   => api.delete(`/credit-notes/${id}`),
}

// ── Recurring ────────────────────────────────────
export const recurringApi = {
  // Recurring invoices
  listInvoices:        ()           => api.get('/recurring/invoices'),
  getInvoice:          (id)         => api.get(`/recurring/invoices/${id}`),
  createInvoice:       (data)       => api.post('/recurring/invoices', data),
  updateInvoice:       (id, data)   => api.put(`/recurring/invoices/${id}`, data),
  updateInvoiceStatus: (id, status) => api.patch(`/recurring/invoices/${id}/status`, { status }),
  removeInvoice:       (id)         => api.delete(`/recurring/invoices/${id}`),
  invoiceRuns:         (id)         => api.get(`/recurring/invoices/${id}/runs`),
  // Purchase templates
  listTemplates:        ()          => api.get('/recurring/purchase-templates'),
  getTemplate:          (id)        => api.get(`/recurring/purchase-templates/${id}`),
  createTemplate:       (data)      => api.post('/recurring/purchase-templates', data),
  updateTemplate:       (id, data)  => api.put(`/recurring/purchase-templates/${id}`, data),
  updateTemplateStatus: (id, s)     => api.patch(`/recurring/purchase-templates/${id}/status`, { status: s }),
  removeTemplate:       (id)        => api.delete(`/recurring/purchase-templates/${id}`),
  templateRuns:         (id)        => api.get(`/recurring/purchase-templates/${id}/runs`),
}
// ── Billing / Subscriptions ──────────────────────
export const billingApi = {
  getPlans:        ()           => api.get('/billing/plans'),
  getSubscription: ()           => api.get('/billing/subscription'),
  changePlan:      (data)       => api.post('/billing/change-plan', data),
  startTrial:      (data)       => api.post('/billing/start-trial', data),
  getPortalUrl:    ()           => api.post('/billing/portal'),
  getUsage:        ()           => api.get('/billing/usage'),
}

export default api
export const purchaseQuotationsApi = {
  list:     ()          => api.get('/purchase-quotations'),
  get:      (id)        => api.get(`/purchase-quotations/${id}`),
  create:   (data)      => api.post('/purchase-quotations', data),
  update:   (id, data)  => api.put(`/purchase-quotations/${id}`, data),
  remove:   (id)        => api.delete(`/purchase-quotations/${id}`),
  status:   (id, s)     => api.patch(`/purchase-quotations/${id}/status`, { status: s }),
}

export const purchaseOrdersApi = {
  list:     ()          => api.get('/purchase-orders'),
  get:      (id)        => api.get(`/purchase-orders/${id}`),
  create:   (data)      => api.post('/purchase-orders', data),
  update:   (id, data)  => api.put(`/purchase-orders/${id}`, data),
  remove:   (id)        => api.delete(`/purchase-orders/${id}`),
  status:   (id, s)     => api.patch(`/purchase-orders/${id}/status`, { status: s }),
}

export const blanketAgreementsApi = {
  list:     ()          => api.get('/blanket-agreements'),
  get:      (id)        => api.get(`/blanket-agreements/${id}`),
  create:   (data)      => api.post('/blanket-agreements', data),
  update:   (id, data)  => api.put(`/blanket-agreements/${id}`, data),
  remove:   (id)        => api.delete(`/blanket-agreements/${id}`),
  status:   (id, s)     => api.put(`/blanket-agreements/${id}/status`, { status: s }),
}

export const purchaseRequestsApi = {
  list:     ()          => api.get('/purchase-requests'),
  get:      (id)        => api.get(`/purchase-requests/${id}`),
  create:   (data)      => api.post('/purchase-requests', data),
  update:   (id, data)  => api.put(`/purchase-requests/${id}`, data),
  remove:   (id)        => api.delete(`/purchase-requests/${id}`),
  status:   (id, s)     => api.put(`/purchase-requests/${id}/status`, { status: s }),
}

export const goodsReceiptsApi = {
  list:     ()          => api.get('/goods-receipts'),
  create:   (data)      => api.post('/goods-receipts', data)
}
