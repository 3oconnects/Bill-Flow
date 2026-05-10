// js/api.js — Centralized API client
const API = {
  async _req(method, path, body) {
    const opts = { method, headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin' };
    if (body !== undefined) opts.body = JSON.stringify(body);
    const r = await fetch(path, opts);
    const res = await r.json().catch(() => ({}));
    if (!r.ok) {
      const msg = res.error?.message || res.error || `HTTP ${r.status}`;
      throw new Error(msg);
    }
    return res.success ? res.data : res;
  },
  get:    (path)       => API._req('GET', path),
  post:   (path, body) => API._req('POST', path, body),
  put:    (path, body) => API._req('PUT', path, body),
  patch:  (path, body) => API._req('PATCH', path, body),
  delete: (path)       => API._req('DELETE', path),

  // Auth
  login:    (email, password)           => API.post('/api/auth/login', { email, password }),
  register: (orgName, name, email, pw)  => API.post('/api/auth/register', { orgName, name, email, password: pw }),
  logout:   ()                          => API.post('/api/auth/logout'),
  me:       ()                          => API.get('/api/auth/me'),
  changePassword: (cur, nw)             => API.post('/api/auth/change-password', { currentPassword: cur, newPassword: nw }),

  // Org
  getOrg:    ()    => API.get('/api/org'),
  updateOrg: (data) => API.put('/api/org', data),

  // Team
  getTeam:      ()              => API.get('/api/team'),
  addMember:    (data)          => API.post('/api/team', data),
  updateMember: (id, data)      => API.put(`/api/team/${id}`, data),
  deleteMember: (id)            => API.delete(`/api/team/${id}`),

  // Customers
  getCustomers:    ()          => API.get('/api/customers'),
  getCustomerDetail: (id)      => API.get(`/api/customers/${id}/detail`),
  createCustomer:  (data)      => API.post('/api/customers', data),
  updateCustomer:  (id, data)  => API.put(`/api/customers/${id}`, data),
  deleteCustomer:  (id)        => API.delete(`/api/customers/${id}`),

  // Warranty Claims
  getWarrantyClaims:       ()              => API.get('/api/warranty-claims'),
  createWarrantyClaim:     (data)          => API.post('/api/warranty-claims', data),
  updateWarrantyClaimStatus: (id, status, notes) => API.patch(`/api/warranty-claims/${id}/status`, { status, notes }),
  deleteWarrantyClaim:     (id)            => API.delete(`/api/warranty-claims/${id}`),

  // Vendors
  getVendors:    ()          => API.get('/api/vendors'),
  getVendor:     (id)        => API.get(`/api/vendors/${id}`),
  getVendorProducts: (id)    => API.get(`/api/vendors/${id}/products`),
  getVendorExpenses: (id)    => API.get(`/api/vendors/${id}/expenses`),
  getVendorPurchaseHistory: (id) => API.get(`/api/vendors/${id}/purchase-history`),
  getVendorSummary: (id)     => API.get(`/api/vendors/${id}/summary`),
  getVendorDocs: (id)        => API.get(`/api/vendors/${id}/documents`),
  uploadVendorDoc: (id, data) => API.post(`/api/vendors/${id}/documents`, data),
  deleteVendorDoc: (vendorId, docId) => API.delete(`/api/vendors/${vendorId}/documents/${docId}`),
  createVendor:  (data)      => API.post('/api/vendors', data),
  updateVendor:  (id, data)  => API.put(`/api/vendors/${id}`, data),
  deleteVendor:  (id)        => API.delete(`/api/vendors/${id}`),
  setItemVendorApproval: (invId, itemId, approved) => API.patch(`/api/invoices/${invId}/items/${itemId}/vendor-approval`, { approved }),

  // Product Vendors
  getProductVendors:    (productId)           => API.get(`/api/products/${productId}/vendors`),
  addProductVendor:     (productId, data)     => API.post(`/api/products/${productId}/vendors`, data),
  updateProductVendor:  (productId, pvid, data) => API.put(`/api/products/${productId}/vendors/${pvid}`, data),
  removeProductVendor:  (productId, pvid)     => API.delete(`/api/products/${productId}/vendors/${pvid}`),

  // Invoices
  getInvoices:       ()          => API.get('/api/invoices'),
  getInvoice:        (id)        => API.get(`/api/invoices/${id}`),
  createInvoice:     (data)      => API.post('/api/invoices', data),
  updateInvoice:     (id, data)  => API.put(`/api/invoices/${id}`, data),
  updateInvStatus:   (id, status)=> API.patch(`/api/invoices/${id}/status`, { status }),
  deleteInvoice:     (id)        => API.delete(`/api/invoices/${id}`),

  // Payments
  getPayments:    ()          => API.get('/api/payments'),
  createPayment:  (data)      => API.post('/api/payments', data),
  deletePayment:  (id)        => API.delete(`/api/payments/${id}`),

  // Expenses
  getExpenses:    ()          => API.get('/api/expenses'),
  createExpense:  (data)      => API.post('/api/expenses', data),
  updateExpense:  (id, data)  => API.put(`/api/expenses/${id}`, data),
  deleteExpense:  (id)        => API.delete(`/api/expenses/${id}`),

  // Products
  getProducts:      ()          => API.get('/api/products'),
  getProduct:       (id)        => API.get(`/api/products/${id}`),
  createProduct:    (data)      => API.post('/api/products', data),
  updateProduct:    (id, data)  => API.put(`/api/products/${id}`, data),
  deleteProduct:    (id)        => API.delete(`/api/products/${id}`),
  adjustStock:      (id, delta) => API.patch(`/api/products/${id}/stock`, { delta }),

  // Reports
  getReportSummary: () => API.get('/api/reports/summary'),
  getChartData: (mode, from, to) => {
    let url = `/api/reports/chart?mode=${encodeURIComponent(mode)}`;
    if (from && to) url += `&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
    return API.get(url);
  },
};
// Added methods (patch to existing API object)
Object.assign(API, {
  updateShipment:  (id, shipment_status) => API.patch(`/api/invoices/${id}/shipment`, { shipment_status }),
  searchReceipt:   (txn_id) => API.get(`/api/receipt/search?txn_id=${encodeURIComponent(txn_id)}`),
});
