import { useForm } from 'react-hook-form'
import { useMutation } from '@tanstack/react-query'
import { productsApi } from '@/api'
import { TAX_RATES, UNITS, PRODUCT_CATEGORIES } from '@/lib/utils'
import { Spinner } from '@/components/ui'

export default function ProductForm({ initial, onSuccess, onCancel }) {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    defaultValues: initial || { tax_rate: 18, unit: 'pcs', category: 'general', warranty_type: 'none', guarantee_type: 'none', is_active: true }
  })

  const mutation = useMutation({
    mutationFn: (data) => initial ? productsApi.update(initial.id, data) : productsApi.create(data),
    onSuccess,
    onError: (e) => alert(e.message),
  })

  return (
    <form onSubmit={handleSubmit((d) => mutation.mutate(d))} style={{ padding: '0 8px' }}>
      {/* Basic Info */}
      <div style={{ marginBottom: 12, fontSize: 13, fontWeight: 700, color: 'var(--c-primary)', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid var(--c-border)', paddingBottom: 8 }}>Basic Information</div>
      <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        <div className="form-group">
          <label className="form-label">Name <span style={{color:'var(--red)'}}>*</span></label>
          <input className="form-input" {...register('name', { required: 'Required' })} placeholder="Product name" />
          {errors.name && <div className="form-err">{errors.name.message}</div>}
        </div>
        <div className="form-group">
          <label className="form-label">SKU</label>
          <input className="form-input" {...register('sku')} placeholder="Auto-generated if blank" />
        </div>
        
        <div className="form-group">
          <label className="form-label">Brand</label>
          <input className="form-input" {...register('brand')} placeholder="Brand name" />
        </div>
        <div className="form-group">
          <label className="form-label">Model No.</label>
          <input className="form-input" {...register('model_number')} placeholder="Model #" />
        </div>

        <div className="form-group">
          <label className="form-label">Category</label>
          <select className="form-select" {...register('category')}>
            {PRODUCT_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Unit</label>
          <select className="form-select" {...register('unit')}>
            {UNITS.map((u) => <option key={u}>{u}</option>)}
          </select>
        </div>
        
        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
          <label className="form-label">HSN Code</label>
          <input className="form-input" {...register('hsn_code')} placeholder="e.g. 8471" />
        </div>
      </div>

      {/* Pricing & Stock */}
      <div style={{ marginBottom: 12, fontSize: 13, fontWeight: 700, color: 'var(--c-primary)', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid var(--c-border)', paddingBottom: 8 }}>Pricing & Stock</div>
      <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        <div className="form-group">
          <label className="form-label">Sell Price</label>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: 12, top: 10, color: 'var(--c-text3)', fontWeight: 600 }}>₹</span>
            <input className="form-input" type="number" step="0.01" {...register('unit_price')} placeholder="0.00" style={{ paddingLeft: 28 }} />
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Cost Price</label>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: 12, top: 10, color: 'var(--c-text3)', fontWeight: 600 }}>₹</span>
            <input className="form-input" type="number" step="0.01" {...register('purchase_price')} placeholder="0.00" style={{ paddingLeft: 28 }} />
          </div>
        </div>
        
        <div className="form-group">
          <label className="form-label">Tax Rate</label>
          <select className="form-select" {...register('tax_rate')}>
            {TAX_RATES.map((r) => <option key={r} value={r}>{r}% GST</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Stock Quantity</label>
          <input className="form-input" type="number" step="0.001" {...register('stock_qty')} placeholder="0" />
        </div>
        
        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
          <label className="form-label">Low Stock Alert Level</label>
          <input className="form-input" type="number" step="0.001" {...register('low_stock_alert')} placeholder="e.g. 5" />
        </div>
      </div>

      {/* Warranty & Extras */}
      <div style={{ marginBottom: 12, fontSize: 13, fontWeight: 700, color: 'var(--c-primary)', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid var(--c-border)', paddingBottom: 8 }}>Warranty & Description</div>
      <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        <div className="form-group">
          <label className="form-label">Warranty Type</label>
          <select className="form-select" {...register('warranty_type')}>
            <option value="none">None</option>
            <option value="manufacturer">Manufacturer</option>
            <option value="seller">Seller</option>
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Duration</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input className="form-input" type="number" {...register('warranty_duration')} placeholder="0" style={{ flex: 1, minWidth: 0 }} />
            <select className="form-select" {...register('warranty_unit')} style={{ flex: 1, minWidth: 0 }}>
              <option value="months">Months</option>
              <option value="years">Years</option>
              <option value="days">Days</option>
            </select>
          </div>
        </div>
        
        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
          <label className="form-label">Description</label>
          <textarea className="form-textarea" {...register('description')} placeholder="Add detailed product description..." rows={3} />
        </div>
        
        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', background: 'var(--c-surface2)', padding: '12px 16px', borderRadius: 8, border: '1px solid var(--c-border)' }}>
            <input type="checkbox" {...register('is_active')} id="is_active_chk" style={{ width: 16, height: 16, accentColor: 'var(--c-primary)' }} />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--c-text)' }}>Active Product</span>
              <span style={{ fontSize: 12, color: 'var(--c-text2)' }}>Make this product visible and available for selection in invoices and bills.</span>
            </div>
          </label>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', paddingTop: 16, borderTop: '1px solid var(--c-border)' }}>
        <button type="button" className="btn btn-ghost" onClick={onCancel} style={{ padding: '10px 20px' }}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={isSubmitting} style={{ padding: '10px 24px', fontWeight: 600 }}>
          {isSubmitting ? <Spinner size={14} /> : initial ? 'Save Changes' : 'Create Product'}
        </button>
      </div>
    </form>
  )
}
