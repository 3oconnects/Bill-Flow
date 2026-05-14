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

// ── Auth ──────────────────────────────────────────
export const authApi = {
  me:             ()             => api.get('/auth/me'),
  login:          (data)        => api.post('/auth/login', data),
  register:       (data)        => api.post('/auth/register', data),
  logout:         ()             => api.post('/auth/logout'),
  changePassword: (data)        => api.post('/auth/change-password', data),
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
}

// ── Products ─────────────────────────────────────
export const productsApi = {
  list:          ()              => api.get('/products'),
  get:           (id)            => api.get(`/products/${id}`),
  generateSku:   (brand)         => api.get(`/products/sku/generate?brand=${brand}`),
  create:        (data)          => api.post('/products', data),
  update:        (id, data)      => api.put(`/products/${id}`, data),
  remove:        (id)            => api.delete(`/products/${id}`),
  adjustStock:   (id, delta)     => api.patch(`/products/${id}/stock`, { delta }),
  bulk:          (products)      => api.post('/products/bulk', { products }),
  getVendors:    (id)            => api.get(`/products/${id}/vendors`),
  addVendor:     (id, data)      => api.post(`/products/${id}/vendors`, data),
  updateVendor:  (id, pvid, d)   => api.put(`/products/${id}/vendors/${pvid}`, d),
  removeVendor:  (id, pvid)      => api.delete(`/products/${id}/vendors/${pvid}`),
}

// ── Invoices ─────────────────────────────────────
export const invoicesApi = {
  list:            ()              => api.get('/invoices'),
  get:             (id)            => api.get(`/invoices/${id}`),
  create:          (data)          => api.post('/invoices', data),
  update:          (id, data)      => api.put(`/invoices/${id}`, data),
  updateStatus:    (id, status)    => api.patch(`/invoices/${id}/status`, { status }),
  updateShipment:  (id, status)    => api.patch(`/invoices/${id}/shipment`, { shipment_status: status }),
  duplicate:       (id)            => api.post(`/invoices/${id}/duplicate`),
  remove:          (id)            => api.delete(`/invoices/${id}`),
}

// ── Payments ─────────────────────────────────────
export const paymentsApi = {
  list:   ()         => api.get('/payments'),
  create: (data)     => api.post('/payments', data),
  remove: (id)       => api.delete(`/payments/${id}`),
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
  summary: ()                      => api.get('/reports/summary'),
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

export default api
