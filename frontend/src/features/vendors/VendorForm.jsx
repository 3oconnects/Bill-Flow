import { useState, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Trash2, Star, Package } from 'lucide-react'
import { vendorsApi, productsApi } from '@/api'
import { fmt } from '@/lib/utils'
import { Spinner } from '@/components/ui'
import { toast } from '@/store/toastStore'
import ProductCombobox from '@/features/products/ProductCombobox'

const EMPTY_VENDOR = {
  name: '', company_name: '', contact_person: '',
  email: '', phone: '',
  status: 'active', gstin: '',
  bank_name: '', bank_account: '', ifsc: '',
  city: '', state: '', country: 'India',
  notes: '',
}

export default function VendorForm({ initial, onSuccess, onCancel }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({ ...EMPTY_VENDOR, ...(initial || {}) })
  // Local list of product links being staged before save.
  // shape: { product_id, product_name, sku, hsn_code, supply_price, is_primary, _persisted_id? }
  const [productLinks, setProductLinks] = useState([])

  // Catalogue for the combobox.
  const { data: products = [] } = useQuery({ queryKey: ['products'], queryFn: productsApi.list })

  // If editing, fetch existing links so the user can manage them inline.
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

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

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
        is_primary:   prev.length === 0, // first link auto-primary
      }]
    })
  }

  const updateLink = (i, k, v) => {
    setProductLinks(prev => {
      const next = [...prev]
      next[i] = { ...next[i], [k]: v }
      // Only one primary at a time.
      if (k === 'is_primary' && v) {
        next.forEach((l, j) => { if (j !== i) l.is_primary = false })
      }
      return next
    })
  }

  const removeLink = (i) => setProductLinks(prev => prev.filter((_, j) => j !== i))

  // Sync product links against the server after the vendor is saved.
  // Strategy: insert new ones, update changed persisted ones, delete removed ones.
  const syncProductLinks = async (vendorId) => {
    const persistedById = new Map(existingLinks.map(l => [l.id, l]))
    const currentPersistedIds = new Set(
      productLinks.map(l => l._persisted_id).filter(Boolean)
    )

    // Deletes
    for (const old of existingLinks) {
      if (!currentPersistedIds.has(old.id)) {
        await vendorsApi.removeProduct(vendorId, old.id).catch(() => {})
      }
    }
    // Inserts + updates
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
        const changed =
          Number(old.supply_price) !== Number(l.supply_price) ||
          !!old.is_primary !== !!l.is_primary
        if (changed) {
          await vendorsApi.updateProduct(vendorId, l._persisted_id, {
            supply_price: Number(l.supply_price) || 0,
            is_primary:   !!l.is_primary,
          }).catch(e => toast.error(`Couldn't update ${l.product_name}: ${e.message}`))
        }
      }
    }
  }

  const mutation = useMutation({
    mutationFn: async () => {
      let vendorId
      if (initial) {
        await vendorsApi.update(initial.id, form)
        vendorId = initial.id
      } else {
        const res = await vendorsApi.create(form)
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
    if (!form.name.trim()) return toast.error('Vendor name is required')
    mutation.mutate()
  }

  const saving = mutation.isPending

  return (
    <form onSubmit={handleSave}>
      <div className="po-form-standard">
        {/* Header section: contact + tax/banking */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, marginBottom: 24 }}>
          <div className="form-section-compact">
            <div className="form-group-row">
              <label>Vendor Name *</label>
              <input className="form-input sm" value={form.name}
                onChange={e => set('name', e.target.value)}
                placeholder="Vendor / Individual name" />
            </div>
            <div className="form-group-row">
              <label>Company Name</label>
              <input className="form-input sm" value={form.company_name}
                onChange={e => set('company_name', e.target.value)}
                placeholder="Company / firm name" />
            </div>
            <div className="form-group-row">
              <label>Contact Person</label>
              <input className="form-input sm" value={form.contact_person}
                onChange={e => set('contact_person', e.target.value)}
                placeholder="Primary contact" />
            </div>
            <div className="form-group-row">
              <label>Email Address</label>
              <input className="form-input sm" type="email" value={form.email}
                onChange={e => set('email', e.target.value)}
                placeholder="vendor@example.com" />
            </div>
            <div className="form-group-row">
              <label>Phone Number</label>
              <input className="form-input sm" value={form.phone}
                onChange={e => set('phone', e.target.value)}
                placeholder="+91 98765 43210" />
            </div>
          </div>

          <div className="form-section-compact">
            <div className="form-group-row">
              <label>Vendor Status</label>
              <select className="form-select sm" value={form.status}
                onChange={e => set('status', e.target.value)}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="blocked">Blocked</option>
              </select>
            </div>
            <div className="form-group-row">
              <label>GSTIN / Tax ID</label>
              <input className="form-input sm mono" value={form.gstin}
                onChange={e => set('gstin', e.target.value)}
                placeholder="22AAAAA0000A1Z5" />
            </div>
            <div className="form-group-row">
              <label>Bank Name</label>
              <input className="form-input sm" value={form.bank_name}
                onChange={e => set('bank_name', e.target.value)}
                placeholder="State Bank of India" />
            </div>
            <div className="form-group-row">
              <label>Account Number</label>
              <input className="form-input sm mono" value={form.bank_account}
                onChange={e => set('bank_account', e.target.value)}
                placeholder="Account number" />
            </div>
            <div className="form-group-row">
              <label>IFSC Code</label>
              <input className="form-input sm mono" value={form.ifsc}
                onChange={e => set('ifsc', e.target.value)}
                placeholder="SBIN0000123" />
            </div>
          </div>
        </div>

        {/* Location + notes */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, marginBottom: 24 }}>
          <div className="form-section-compact">
            <div className="form-group-row">
              <label>City</label>
              <input className="form-input sm" value={form.city}
                onChange={e => set('city', e.target.value)} placeholder="City" />
            </div>
            <div className="form-group-row">
              <label>State</label>
              <input className="form-input sm" value={form.state}
                onChange={e => set('state', e.target.value)} placeholder="State" />
            </div>
          </div>
          <div className="form-section-compact">
            <div className="form-group-row" style={{ alignItems: 'flex-start' }}>
              <label style={{ marginTop: 8 }}>Notes</label>
              <textarea className="form-input sm" value={form.notes}
                onChange={e => set('notes', e.target.value)}
                placeholder="Internal notes" rows={3} />
            </div>
          </div>
        </div>

        {/* ── Products this vendor supplies ────────────────────────────── */}
        <div style={{
          borderTop: '1px solid var(--c-border)', paddingTop: 16, marginBottom: 16,
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: 10, gap: 12, flexWrap: 'wrap',
          }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--c-text)' }}>
                Products supplied by this vendor
              </div>
              <div style={{ fontSize: 11, color: 'var(--c-text3)', marginTop: 2 }}>
                Link catalogue items and set the per-vendor supply price.
                One can be marked as the primary supplier for that product.
              </div>
            </div>
            <div style={{ flex: 1, minWidth: 280, maxWidth: 420 }}>
              <ProductCombobox
                products={products}
                onPick={addProductLink}
                placeholder="Search a product to link…"
              />
            </div>
          </div>

          {loadingLinks ? (
            <div style={{ padding: 16, textAlign: 'center' }}><Spinner size={16} /></div>
          ) : productLinks.length === 0 ? (
            <div style={{
              border: '1px dashed var(--c-border)', borderRadius: 10, padding: 22,
              textAlign: 'center', color: 'var(--c-text3)', fontSize: 12,
            }}>
              <Package size={20} style={{ marginBottom: 4, opacity: .6 }} />
              <div>No products linked yet — search above to add one.</div>
            </div>
          ) : (
            <div style={{ border: '1px solid var(--c-border)', borderRadius: 10, overflow: 'hidden' }}>
              <div style={{
                display: 'grid', gridTemplateColumns: '2.4fr 1fr 1fr .8fr 32px',
                gap: 8, fontSize: 10, fontWeight: 700, color: 'var(--c-text3)',
                textTransform: 'uppercase', letterSpacing: '.05em',
                padding: '8px 12px', background: 'var(--c-surface2, var(--c-bg))',
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
                    {l.sku || '—'}
                    {l.hsn_code && <div>HSN {l.hsn_code}</div>}
                  </div>
                  <input className="form-input sm text-right" type="number" min="0" step="0.01"
                    value={l.supply_price}
                    onChange={e => updateLink(i, 'supply_price', parseFloat(e.target.value) || 0)} />
                  <div style={{ textAlign: 'center' }}>
                    <input type="checkbox" checked={!!l.is_primary}
                      onChange={e => updateLink(i, 'is_primary', e.target.checked)}
                      title="Mark as primary supplier for this product" />
                  </div>
                  <button type="button" className="action-icon-btn red"
                    onClick={() => removeLink(i)} title="Unlink">
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', borderTop: '1px solid var(--c-border)', paddingTop: 16 }}>
          <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? <Spinner size={14} /> : (initial ? 'Update Vendor' : 'Create Vendor')}
          </button>
        </div>
      </div>
    </form>
  )
}
