import { useState, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Trash2, Star, Package, ChevronDown, ChevronRight, Copy } from 'lucide-react'
import { vendorsApi, productsApi } from '@/api'
import { fmt } from '@/lib/utils'
import { Spinner } from '@/components/ui'
import { toast } from '@/store/toastStore'
import ProductCombobox from '@/features/products/ProductCombobox'

const EMPTY_VENDOR = {
  name: '', company_name: '', contact_person: '',
  email: '', phone: '', alternate_phone: '', website: '',
  status: 'active', vendor_type: 'supplier',
  // Billing Address
  address: '', street: '', city: '', state: '', country: 'India', pincode: '',
  // Shipping Address
  shipping_address: '', shipping_city: '', shipping_state: '',
  shipping_country: 'India', shipping_pincode: '',
  same_as_billing: false,
  // Tax
  gstin: '', pan: '', tax_treatment: 'regular', registration_type: 'regular',
  // Financial
  currency: 'INR', payment_terms: 'net30', credit_limit: '', opening_balance: '',
  // Bank
  bank_name: '', account_holder_name: '', bank_account: '', ifsc: '', bank_branch: '',
  // Notes
  notes: '',
}

const VENDOR_TYPES    = ['supplier', 'manufacturer', 'distributor', 'retailer', 'service_provider', 'contractor', 'other']
const PAYMENT_TERMS   = [
  { value: 'immediate', label: 'Immediate' },
  { value: 'net7',      label: 'Net 7 Days' },
  { value: 'net15',     label: 'Net 15 Days' },
  { value: 'net30',     label: 'Net 30 Days' },
  { value: 'net45',     label: 'Net 45 Days' },
  { value: 'net60',     label: 'Net 60 Days' },
  { value: 'net90',     label: 'Net 90 Days' },
]
const TAX_TREATMENTS  = ['regular', 'composition', 'unregistered', 'consumer', 'overseas', 'special_economic_zone']
const REG_TYPES       = ['regular', 'composition', 'consumer']
const CURRENCIES      = ['INR', 'USD', 'EUR', 'GBP', 'AED', 'SGD']

// ── Small helpers ──────────────────────────────────────────────────────
function FormRow({ label, required, children, hint }) {
  return (
    <div className="form-group" style={{ marginBottom: 14 }}>
      <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        {label}
        {required && <span style={{ color: 'var(--c-red)' }}>*</span>}
      </label>
      {children}
      {hint && <div style={{ fontSize: 11, color: 'var(--c-text3)', marginTop: 3 }}>{hint}</div>}
    </div>
  )
}

function SectionHeader({ title, subtitle, expanded, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      style={{
        width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center',
        gap: 10, padding: '10px 0', background: 'none', border: 'none',
        borderBottom: '2px solid var(--c-border)', marginBottom: 16,
        cursor: 'pointer',
      }}
    >
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--c-text)' }}>{title}</div>
        {subtitle && <div style={{ fontSize: 11, color: 'var(--c-text3)', marginTop: 1 }}>{subtitle}</div>}
      </div>
      {expanded ? <ChevronDown size={16} style={{ color: 'var(--c-text3)' }} /> : <ChevronRight size={16} style={{ color: 'var(--c-text3)' }} />}
    </button>
  )
}

// ── Main Form ──────────────────────────────────────────────────────────
export default function VendorForm({ initial, onSuccess, onCancel }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({ ...EMPTY_VENDOR, ...(initial || {}) })
  const [productLinks, setProductLinks] = useState([])
  const [errors, setErrors] = useState({})

  // Collapsed state for each section
  const [open, setOpen] = useState({
    basic: true, address: true, tax: true, financial: true, bank: true, products: false,
  })
  const toggle = (k) => setOpen(o => ({ ...o, [k]: !o[k] }))

  const { data: products = [] } = useQuery({ queryKey: ['products'], queryFn: productsApi.list })

  const { data: existingLinks = [], isLoading: loadingLinks } = useQuery({
    queryKey: ['vendor', initial?.id, 'products'],
    queryFn:  () => vendorsApi.listProducts(initial.id),
    enabled:  !!initial?.id,
  })

  useEffect(() => {
    if (existingLinks.length) {
      setProductLinks(existingLinks.map(l => ({
        _persisted_id: l.id,
        product_id:    l.product_id,
        product_name:  l.product_name,
        sku:           l.sku,
        hsn_code:      l.hsn_code,
        supply_price:  Number(l.supply_price) || 0,
        is_primary:    !!l.is_primary,
      })))
    }
  }, [existingLinks])

  const set = (k, v) => {
    setForm(f => ({ ...f, [k]: v }))
    if (errors[k]) setErrors(e => ({ ...e, [k]: null }))
  }

  // Sync shipping with billing
  const handleSameAsBilling = (checked) => {
    set('same_as_billing', checked)
    if (checked) {
      setForm(f => ({
        ...f,
        same_as_billing: true,
        shipping_address: f.address || f.street,
        shipping_city:    f.city,
        shipping_state:   f.state,
        shipping_country: f.country,
        shipping_pincode: f.pincode,
      }))
    }
  }

  // ── Product link helpers ────────────────────────────────────────────
  const addProductLink = (p) => {
    setProductLinks(prev => {
      if (prev.some(l => l.product_id === p.id)) {
        toast.error(`${p.name} is already linked`)
        return prev
      }
      return [...prev, {
        product_id:   p.id,
        product_name: p.name,
        sku:          p.sku,
        hsn_code:     p.hsn_code,
        supply_price: Number(p.purchase_price) || Number(p.unit_price) || 0,
        is_primary:   prev.length === 0,
      }]
    })
  }

  const updateLink = (i, k, v) => {
    setProductLinks(prev => {
      const next = [...prev]
      next[i] = { ...next[i], [k]: v }
      if (k === 'is_primary' && v) next.forEach((l, j) => { if (j !== i) l.is_primary = false })
      return next
    })
  }

  const removeLink = (i) => setProductLinks(prev => prev.filter((_, j) => j !== i))

  // ── Sync product links ──────────────────────────────────────────────
  const syncProductLinks = async (vendorId) => {
    const persistedById = new Map(existingLinks.map(l => [l.id, l]))
    const currentPersistedIds = new Set(productLinks.map(l => l._persisted_id).filter(Boolean))
    for (const old of existingLinks) {
      if (!currentPersistedIds.has(old.id)) {
        await vendorsApi.removeProduct(vendorId, old.id).catch(() => {})
      }
    }
    for (const l of productLinks) {
      if (!l._persisted_id) {
        await vendorsApi.addProduct(vendorId, {
          product_id:   l.product_id,
          supply_price: Number(l.supply_price) || 0,
          is_primary:   !!l.is_primary,
        }).catch(e => toast.error(`Couldn't link ${l.product_name}: ${e.message}`))
      } else {
        const old = persistedById.get(l._persisted_id)
        if (!old) continue
        const changed = Number(old.supply_price) !== Number(l.supply_price) || !!old.is_primary !== !!l.is_primary
        if (changed) {
          await vendorsApi.updateProduct(vendorId, l._persisted_id, {
            supply_price: Number(l.supply_price) || 0,
            is_primary:   !!l.is_primary,
          }).catch(e => toast.error(`Couldn't update ${l.product_name}: ${e.message}`))
        }
      }
    }
  }

  // ── Validation ──────────────────────────────────────────────────────
  const validate = () => {
    const errs = {}
    if (!form.name?.trim()) errs.name = 'Vendor name is required'
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Invalid email address'
    if (form.phone && !/^[+\d\s\-()]{7,15}$/.test(form.phone)) errs.phone = 'Invalid phone number'
    if (form.gstin && !/^[0-9A-Z]{15}$/.test(form.gstin.trim().toUpperCase())) errs.gstin = 'GSTIN must be 15 alphanumeric characters'
    setErrors(errs)
    if (Object.keys(errs).length > 0) {
      toast.error('Please fix the errors before saving')
      // Open relevant sections
      if (errs.name || errs.email || errs.phone) setOpen(o => ({ ...o, basic: true }))
      if (errs.gstin) setOpen(o => ({ ...o, tax: true }))
      return false
    }
    return true
  }

  const mutation = useMutation({
    mutationFn: async () => {
      let vendorId
      const payload = { ...form }
      delete payload.same_as_billing
      if (initial) {
        await vendorsApi.update(initial.id, payload)
        vendorId = initial.id
      } else {
        const res = await vendorsApi.create(payload)
        vendorId = res?.id
        if (!vendorId) throw new Error('Vendor creation returned no id')
      }
      await syncProductLinks(vendorId)
      return vendorId
    },
    onSuccess: (vendorId) => {
      qc.invalidateQueries(['vendors'])
      qc.invalidateQueries(['vendor', vendorId])
      qc.invalidateQueries(['vendor', vendorId, 'products'])
      onSuccess?.()
    },
    onError: (e) => toast.error(e.message || 'Failed to save vendor'),
  })

  const handleSave = (e) => {
    e.preventDefault()
    if (!validate()) return
    mutation.mutate()
  }

  const saving = mutation.isPending

  return (
    <form onSubmit={handleSave}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

        {/* ── A. Basic Information ── */}
        <SectionHeader
          title="A. Basic Information"
          subtitle="Vendor name, contact details and type"
          expanded={open.basic}
          onToggle={() => toggle('basic')}
        />
        {open.basic && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px', marginBottom: 8 }}>
            <FormRow label="Vendor Name" required>
              <input className={`form-input${errors.name ? ' border-red' : ''}`} value={form.name}
                onChange={e => set('name', e.target.value)} placeholder="Full name or trade name" />
              {errors.name && <div style={{ fontSize: 11, color: 'var(--c-red)', marginTop: 2 }}>{errors.name}</div>}
            </FormRow>
            <FormRow label="Company Name">
              <input className="form-input" value={form.company_name}
                onChange={e => set('company_name', e.target.value)} placeholder="Registered company or firm name" />
            </FormRow>
            <FormRow label="Vendor Type">
              <select className="form-select" value={form.vendor_type} onChange={e => set('vendor_type', e.target.value)}>
                {VENDOR_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>)}
              </select>
            </FormRow>
            <FormRow label="Contact Person">
              <input className="form-input" value={form.contact_person}
                onChange={e => set('contact_person', e.target.value)} placeholder="Primary contact person" />
            </FormRow>
            <FormRow label="Email Address">
              <input className={`form-input${errors.email ? ' border-red' : ''}`} type="email" value={form.email}
                onChange={e => set('email', e.target.value)} placeholder="vendor@example.com" />
              {errors.email && <div style={{ fontSize: 11, color: 'var(--c-red)', marginTop: 2 }}>{errors.email}</div>}
            </FormRow>
            <FormRow label="Phone Number">
              <input className={`form-input${errors.phone ? ' border-red' : ''}`} value={form.phone}
                onChange={e => set('phone', e.target.value)} placeholder="+91 98765 43210" />
              {errors.phone && <div style={{ fontSize: 11, color: 'var(--c-red)', marginTop: 2 }}>{errors.phone}</div>}
            </FormRow>
            <FormRow label="Alternate Phone">
              <input className="form-input" value={form.alternate_phone || ''}
                onChange={e => set('alternate_phone', e.target.value)} placeholder="Secondary phone" />
            </FormRow>
            <FormRow label="Website">
              <input className="form-input" value={form.website || ''}
                onChange={e => set('website', e.target.value)} placeholder="https://vendor.com" />
            </FormRow>
            <FormRow label="Vendor Status">
              <select className="form-select" value={form.status} onChange={e => set('status', e.target.value)}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="blocked">Blocked</option>
              </select>
            </FormRow>
          </div>
        )}

        {/* ── B. Address ── */}
        <SectionHeader
          title="B. Address"
          subtitle="Billing and shipping addresses"
          expanded={open.address}
          onToggle={() => toggle('address')}
        />
        {open.address && (
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--c-text2)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '.04em' }}>
              Billing Address
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
              <FormRow label="Street / Address Line">
                <input className="form-input" value={form.address || form.street || ''}
                  onChange={e => { set('address', e.target.value); set('street', e.target.value) }}
                  placeholder="Street, building, floor" />
              </FormRow>
              <FormRow label="City">
                <input className="form-input" value={form.city} onChange={e => set('city', e.target.value)} placeholder="City" />
              </FormRow>
              <FormRow label="State">
                <input className="form-input" value={form.state} onChange={e => set('state', e.target.value)} placeholder="State / Province" />
              </FormRow>
              <FormRow label="Country">
                <input className="form-input" value={form.country} onChange={e => set('country', e.target.value)} placeholder="Country" />
              </FormRow>
              <FormRow label="ZIP / Postal Code">
                <input className="form-input" value={form.pincode} onChange={e => set('pincode', e.target.value)} placeholder="PIN / ZIP Code" />
              </FormRow>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '12px 0', padding: '10px 14px', background: 'var(--c-surface2)', borderRadius: 8 }}>
              <input type="checkbox" id="same-billing" checked={!!form.same_as_billing}
                onChange={e => handleSameAsBilling(e.target.checked)} />
              <label htmlFor="same-billing" style={{ fontSize: 13, color: 'var(--c-text)', cursor: 'pointer', userSelect: 'none' }}>
                Shipping address is same as billing address
              </label>
            </div>

            {!form.same_as_billing && (
              <>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--c-text2)', margin: '12px 0 10px', textTransform: 'uppercase', letterSpacing: '.04em' }}>
                  Shipping Address
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
                  <FormRow label="Street / Address Line">
                    <input className="form-input" value={form.shipping_address || ''}
                      onChange={e => set('shipping_address', e.target.value)} placeholder="Street, building, floor" />
                  </FormRow>
                  <FormRow label="City">
                    <input className="form-input" value={form.shipping_city || ''} onChange={e => set('shipping_city', e.target.value)} placeholder="City" />
                  </FormRow>
                  <FormRow label="State">
                    <input className="form-input" value={form.shipping_state || ''} onChange={e => set('shipping_state', e.target.value)} placeholder="State" />
                  </FormRow>
                  <FormRow label="Country">
                    <input className="form-input" value={form.shipping_country || 'India'} onChange={e => set('shipping_country', e.target.value)} placeholder="Country" />
                  </FormRow>
                  <FormRow label="ZIP / Postal Code">
                    <input className="form-input" value={form.shipping_pincode || ''} onChange={e => set('shipping_pincode', e.target.value)} placeholder="PIN / ZIP Code" />
                  </FormRow>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── C. Tax Information ── */}
        <SectionHeader
          title="C. Tax Information"
          subtitle="GST, PAN and tax treatment"
          expanded={open.tax}
          onToggle={() => toggle('tax')}
        />
        {open.tax && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px', marginBottom: 8 }}>
            <FormRow label="GSTIN / Tax ID" hint="15-character GST Identification Number">
              <input className={`form-input mono${errors.gstin ? ' border-red' : ''}`} value={form.gstin}
                onChange={e => set('gstin', e.target.value.toUpperCase())} placeholder="22AAAAA0000A1Z5" maxLength={15} />
              {errors.gstin && <div style={{ fontSize: 11, color: 'var(--c-red)', marginTop: 2 }}>{errors.gstin}</div>}
            </FormRow>
            <FormRow label="PAN Number">
              <input className="form-input mono" value={form.pan || ''}
                onChange={e => set('pan', e.target.value.toUpperCase())} placeholder="AAAAA0000A" maxLength={10} />
            </FormRow>
            <FormRow label="Tax Treatment">
              <select className="form-select" value={form.tax_treatment} onChange={e => set('tax_treatment', e.target.value)}>
                {TAX_TREATMENTS.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>)}
              </select>
            </FormRow>
            <FormRow label="Registration Type">
              <select className="form-select" value={form.registration_type} onChange={e => set('registration_type', e.target.value)}>
                {REG_TYPES.map(t => <option key={t} value={t}>{t.replace(/\b\w/g, c => c.toUpperCase())}</option>)}
              </select>
            </FormRow>
          </div>
        )}

        {/* ── D. Financial Information ── */}
        <SectionHeader
          title="D. Financial Information"
          subtitle="Currency, payment terms and credit details"
          expanded={open.financial}
          onToggle={() => toggle('financial')}
        />
        {open.financial && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px', marginBottom: 8 }}>
            <FormRow label="Currency">
              <select className="form-select" value={form.currency} onChange={e => set('currency', e.target.value)}>
                {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </FormRow>
            <FormRow label="Payment Terms">
              <select className="form-select" value={form.payment_terms} onChange={e => set('payment_terms', e.target.value)}>
                {PAYMENT_TERMS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </FormRow>
            <FormRow label="Credit Limit (₹)" hint="Maximum credit extended to this vendor">
              <input className="form-input" type="number" min="0" step="0.01" value={form.credit_limit || ''}
                onChange={e => set('credit_limit', e.target.value)} placeholder="0.00" />
            </FormRow>
            <FormRow label="Opening Balance (₹)" hint="Amount owed at the time of adding this vendor">
              <input className="form-input" type="number" step="0.01" value={form.opening_balance || ''}
                onChange={e => set('opening_balance', e.target.value)} placeholder="0.00" />
            </FormRow>
          </div>
        )}

        {/* ── E. Bank Details ── */}
        <SectionHeader
          title="E. Bank Details"
          subtitle="Bank account for payments"
          expanded={open.bank}
          onToggle={() => toggle('bank')}
        />
        {open.bank && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px', marginBottom: 8 }}>
            <FormRow label="Bank Name">
              <input className="form-input" value={form.bank_name}
                onChange={e => set('bank_name', e.target.value)} placeholder="State Bank of India" />
            </FormRow>
            <FormRow label="Account Holder Name">
              <input className="form-input" value={form.account_holder_name || ''}
                onChange={e => set('account_holder_name', e.target.value)} placeholder="As per bank records" />
            </FormRow>
            <FormRow label="Account Number">
              <input className="form-input mono" value={form.bank_account}
                onChange={e => set('bank_account', e.target.value)} placeholder="Account number" />
            </FormRow>
            <FormRow label="IFSC / SWIFT Code">
              <input className="form-input mono" value={form.ifsc}
                onChange={e => set('ifsc', e.target.value.toUpperCase())} placeholder="SBIN0000123" />
            </FormRow>
            <FormRow label="Branch">
              <input className="form-input" value={form.bank_branch || ''}
                onChange={e => set('bank_branch', e.target.value)} placeholder="Branch name" />
            </FormRow>
          </div>
        )}

        {/* ── F. Notes ── */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--c-text)', borderBottom: '2px solid var(--c-border)', paddingBottom: 8, marginBottom: 12 }}>
            F. Notes
          </div>
          <textarea className="form-input" rows={3} value={form.notes}
            onChange={e => set('notes', e.target.value)}
            placeholder="Internal notes about this vendor…" />
        </div>

        {/* ── Products ── */}
        <SectionHeader
          title="G. Products Supplied"
          subtitle="Link catalogue items with per-vendor supply prices"
          expanded={open.products}
          onToggle={() => toggle('products')}
        />
        {open.products && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ marginBottom: 10 }}>
              <ProductCombobox products={products} onPick={addProductLink} placeholder="Search a product to link…" />
            </div>

            {loadingLinks ? (
              <div style={{ padding: 16, textAlign: 'center' }}><Spinner size={16} /></div>
            ) : productLinks.length === 0 ? (
              <div style={{ border: '1px dashed var(--c-border)', borderRadius: 10, padding: 22, textAlign: 'center', color: 'var(--c-text3)', fontSize: 12 }}>
                <Package size={20} style={{ marginBottom: 4, opacity: .6 }} />
                <div>No products linked yet — search above to add one.</div>
              </div>
            ) : (
              <div style={{ border: '1px solid var(--c-border)', borderRadius: 10, overflow: 'hidden' }}>
                <div style={{
                  display: 'grid', gridTemplateColumns: '2.4fr 1fr 1fr .8fr 32px',
                  gap: 8, fontSize: 10, fontWeight: 700, color: 'var(--c-text3)',
                  textTransform: 'uppercase', letterSpacing: '.05em',
                  padding: '8px 12px', background: 'var(--c-surface2)',
                }}>
                  <span>Product</span><span>SKU / HSN</span>
                  <span style={{ textAlign: 'right' }}>Supply Price (₹)</span>
                  <span style={{ textAlign: 'center' }}>Primary</span>
                  <span />
                </div>
                {productLinks.map((l, i) => (
                  <div key={l.product_id} style={{
                    display: 'grid', gridTemplateColumns: '2.4fr 1fr 1fr .8fr 32px',
                    gap: 8, alignItems: 'center', padding: '10px 12px',
                    borderTop: i ? '1px solid var(--c-border)' : 'none',
                    background: l.is_primary ? 'var(--c-primary-lt)' : 'transparent',
                  }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{l.product_name}</div>
                      {l.is_primary && (
                        <div style={{ fontSize: 10, color: 'var(--c-primary)', fontWeight: 700, marginTop: 2 }}>
                          <Star size={9} style={{ verticalAlign: 'middle' }} /> Primary supplier
                        </div>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--c-text3)', fontFamily: 'monospace' }}>
                      {l.sku || '—'}{l.hsn_code && <div>HSN {l.hsn_code}</div>}
                    </div>
                    <input className="form-input text-right" type="number" min="0" step="0.01"
                      value={l.supply_price}
                      onChange={e => updateLink(i, 'supply_price', parseFloat(e.target.value) || 0)} />
                    <div style={{ textAlign: 'center' }}>
                      <input type="checkbox" checked={!!l.is_primary}
                        onChange={e => updateLink(i, 'is_primary', e.target.checked)} />
                    </div>
                    <button type="button" className="action-icon-btn red" onClick={() => removeLink(i)} title="Unlink">
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Footer Buttons ── */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', borderTop: '1px solid var(--c-border)', paddingTop: 16, marginTop: 8 }}>
          <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? <Spinner size={14} /> : (initial ? 'Update Vendor' : 'Save Vendor')}
          </button>
        </div>
      </div>
    </form>
  )
}
