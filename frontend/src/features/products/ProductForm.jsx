import { useForm, Controller } from 'react-hook-form'
import { useMutation } from '@tanstack/react-query'
import { productsApi } from '@/api'
import { TAX_RATES, UNITS, PRODUCT_CATEGORIES } from '@/lib/utils'
import { Spinner } from '@/components/ui'
import { Wand2 } from 'lucide-react'
import { useSkuGen } from './hooks/useSkuGen'
import ImageUploader from './components/ImageUploader'

const DEFAULTS = { tax_rate: 18, unit: 'pcs', category: 'general', warranty_type: 'none', guarantee_type: 'none', is_active: true, stock_qty: 0, low_stock_alert: 5 }
const DU = ['days', 'months', 'years']
const W_TYPES = [['none','None'],['manufacturer','Manufacturer'],['seller','Seller']]
const G_TYPES = [['none','None'],['replacement','Replacement'],['repair','Repair'],['refund','Refund']]

export default function ProductForm({ initial, onSuccess, onCancel }) {
  const { register, handleSubmit, watch, setValue, control, formState: { errors, isSubmitting } } = useForm({
    defaultValues: initial || DEFAULTS,
  })
  const { generate: genSku, loading: skuLoading } = useSkuGen(() => watch('brand'), setValue)
  const mutation = useMutation({
    mutationFn: d => initial ? productsApi.update(initial.id, d) : productsApi.create(d),
    onSuccess,
    onError: e => alert(e.message),
  })

  const sp = +watch('unit_price') || 0
  const cp = +watch('purchase_price') || 0
  const tr = +watch('tax_rate') || 0
  const margin = sp > 0 ? (((sp - cp) / sp) * 100).toFixed(1) : null
  const mc = margin ? (+margin >= 20 ? 'var(--green)' : +margin >= 10 ? 'var(--yellow)' : 'var(--red)') : null

  return (
    <form onSubmit={handleSubmit(d => mutation.mutate(d))}>
      <div className="po-form-standard">

        {/* ── Section 1: Identity — two balanced columns ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48, marginBottom: 28 }}>
          <div className="form-section-compact">
            <div className="form-group-row" style={{ alignItems: 'flex-start' }}>
              <label>Name *</label>
              <div style={{ flex: 1 }}>
                <input className="form-input sm" {...register('name', { required: 'Required' })} placeholder="Product name" />
                {errors.name && <div className="form-err">{errors.name.message}</div>}
              </div>
            </div>
            <div className="form-group-row">
              <label>SKU</label>
              <div style={{ flex: 1, display: 'flex', gap: 6 }}>
                <input className="form-input sm" {...register('sku')} placeholder="Auto-generated if blank" style={{ flex: 1 }} />
                <button type="button" onClick={genSku} disabled={skuLoading} className="btn btn-ghost"
                  style={{ padding: '0 10px', height: 32, fontSize: 12, flexShrink: 0 }}>
                  {skuLoading ? <Spinner size={11} /> : <Wand2 size={12} />}&nbsp;Auto
                </button>
              </div>
            </div>
            <div className="form-group-row">
              <label>Brand</label>
              <input className="form-input sm" {...register('brand')} placeholder="e.g. HP, Samsung" />
            </div>
            <div className="form-group-row">
              <label>Model No.</label>
              <input className="form-input sm" {...register('model_number')} placeholder="e.g. 15-eg2036TU" />
            </div>
          </div>

          <div className="form-section-compact">
            <div className="form-group-row">
              <label>Category</label>
              <select className="form-select sm" {...register('category')}>
                {PRODUCT_CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
              </select>
            </div>
            <div className="form-group-row">
              <label>Unit</label>
              <select className="form-select sm" {...register('unit')}>
                {UNITS.map(u => <option key={u}>{u}</option>)}
              </select>
            </div>
            <div className="form-group-row">
              <label>HSN Code</label>
              <input className="form-input sm mono" {...register('hsn_code')} placeholder="e.g. 8471" />
            </div>
            <div className="form-group-row">
              <label>Status</label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, flex: 1, whiteSpace: 'nowrap' }}>
                <input type="checkbox" {...register('is_active')} style={{ accentColor: 'var(--accent)', width: 15, height: 15, flexShrink: 0 }} />
                Active product
              </label>
            </div>
          </div>
        </div>

        {/* ── Section 2: Product Image — full width ── */}
        <div style={{ borderTop: '1px solid var(--c-border)', paddingTop: 20, marginBottom: 28 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>Product Image</div>
          <div style={{ maxWidth: 480 }}>
            <Controller name="image_url" control={control}
              render={({ field }) => <ImageUploader value={field.value || ''} onChange={field.onChange} />} />
          </div>
        </div>

        {/* ── Section 3: Pricing & Stock ── */}
        <div style={{ borderTop: '1px solid var(--c-border)', paddingTop: 20, marginBottom: 28 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>Pricing & Stock</div>
          {margin && (
            <div style={{ display: 'inline-flex', gap: 12, padding: '4px 12px', borderRadius: 20, background: mc + '18', border: `1px solid ${mc}30`, marginBottom: 12, fontSize: 12 }}>
              <span style={{ color: 'var(--text-2)' }}>Margin: <strong style={{ color: mc }}>{margin}%</strong></span>
              <span style={{ color: 'var(--text-2)' }}>· Profit: ₹{(sp - cp).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
              {tr > 0 && <span style={{ color: 'var(--text-2)' }}>· Incl. GST: ₹{(sp * (1 + tr / 100)).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>}
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 48px' }}>
            <div className="form-section-compact">
              <div className="form-group-row">
                <label>Sell Price</label>
                <input className="form-input sm" type="number" step="0.01" min="0" {...register('unit_price')} placeholder="0.00" />
              </div>
              <div className="form-group-row">
                <label>Cost Price</label>
                <input className="form-input sm" type="number" step="0.01" min="0" {...register('purchase_price')} placeholder="0.00" />
              </div>
              <div className="form-group-row">
                <label>Tax Rate</label>
                <select className="form-select sm" {...register('tax_rate')}>
                  {TAX_RATES.map(r => <option key={r} value={r}>{r === 0 ? 'No GST (0%)' : `${r}% GST`}</option>)}
                </select>
              </div>
            </div>
            <div className="form-section-compact">
              <div className="form-group-row">
                <label>Stock Qty</label>
                <input className="form-input sm" type="number" step="0.001" min="0" {...register('stock_qty')} placeholder="0" />
              </div>
              <div className="form-group-row">
                <label>Alert Level</label>
                <input className="form-input sm" type="number" step="0.001" min="0" {...register('low_stock_alert')} placeholder="5" />
              </div>
            </div>
          </div>
        </div>

        {/* ── Section 4: Warranty & Description ── */}
        <div style={{ borderTop: '1px solid var(--c-border)', paddingTop: 20, marginBottom: 24 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>Warranty & Description</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 48px', marginBottom: 12 }}>
            <div className="form-section-compact">
              <div className="form-group-row">
                <label>Warranty</label>
                <div style={{ flex: 1, display: 'flex', gap: 6 }}>
                  <select className="form-select sm" {...register('warranty_type')} style={{ flex: 1 }}>
                    {W_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                  <input className="form-input sm" type="number" min="0" {...register('warranty_duration')} placeholder="0" style={{ width: 52 }} />
                  <select className="form-select sm" {...register('warranty_unit')} style={{ width: 74 }}>
                    {DU.map(u => <option key={u}>{u}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className="form-section-compact">
              <div className="form-group-row">
                <label>Guarantee</label>
                <div style={{ flex: 1, display: 'flex', gap: 6 }}>
                  <select className="form-select sm" {...register('guarantee_type')} style={{ flex: 1 }}>
                    {G_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                  <input className="form-input sm" type="number" min="0" {...register('guarantee_duration')} placeholder="0" style={{ width: 52 }} />
                  <select className="form-select sm" {...register('guarantee_unit')} style={{ width: 74 }}>
                    {DU.map(u => <option key={u}>{u}</option>)}
                  </select>
                </div>
              </div>
            </div>
          </div>
          <div className="form-section-compact">
            <div className="form-group-row" style={{ alignItems: 'flex-start' }}>
              <label style={{ marginTop: 6 }}>Description</label>
              <textarea className="form-input sm" {...register('description')} placeholder="Product details, specs, features…" rows={2} style={{ resize: 'vertical' }} />
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', borderTop: '1px solid var(--c-border)', paddingTop: 16 }}>
          <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
            {isSubmitting ? <Spinner size={14} /> : initial ? 'Save Changes' : 'Create Product'}
          </button>
        </div>
      </div>
    </form>
  )
}
