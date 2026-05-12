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
    <form onSubmit={handleSubmit((d) => mutation.mutate(d))}>
      {/* Basic Info */}
      <div style={{ marginBottom: 8, fontSize: 12, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Basic Info</div>
      <div className="form-grid">
        <div className="form-group">
          <label className="form-label">Name *</label>
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
          <label className="form-label">Model Number</label>
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
        <div className="form-group">
          <label className="form-label">HSN Code</label>
          <input className="form-input" {...register('hsn_code')} placeholder="e.g. 8471" />
        </div>
      </div>

      {/* Pricing */}
      <div style={{ marginBottom: 8, fontSize: 12, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 8 }}>Pricing & Tax</div>
      <div className="form-grid">
        <div className="form-group">
          <label className="form-label">Selling Price (₹)</label>
          <input className="form-input" type="number" step="0.01" {...register('unit_price')} placeholder="0.00" />
        </div>
        <div className="form-group">
          <label className="form-label">Purchase Price (₹)</label>
          <input className="form-input" type="number" step="0.01" {...register('purchase_price')} placeholder="0.00" />
        </div>
        <div className="form-group">
          <label className="form-label">Tax Rate (%)</label>
          <select className="form-select" {...register('tax_rate')}>
            {TAX_RATES.map((r) => <option key={r} value={r}>{r}%</option>)}
          </select>
        </div>
      </div>

      {/* Stock */}
      <div style={{ marginBottom: 8, fontSize: 12, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 8 }}>Stock</div>
      <div className="form-grid">
        <div className="form-group">
          <label className="form-label">Stock Quantity</label>
          <input className="form-input" type="number" step="0.001" {...register('stock_qty')} placeholder="0" />
        </div>
        <div className="form-group">
          <label className="form-label">Low Stock Alert At</label>
          <input className="form-input" type="number" step="0.001" {...register('low_stock_alert')} placeholder="5" />
        </div>
      </div>

      {/* Warranty */}
      <div style={{ marginBottom: 8, fontSize: 12, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 8 }}>Warranty & Guarantee</div>
      <div className="form-grid">
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
          <input className="form-input" type="number" {...register('warranty_duration')} placeholder="0" />
        </div>
        <div className="form-group">
          <label className="form-label">Unit</label>
          <select className="form-select" {...register('warranty_unit')}>
            <option value="months">Months</option>
            <option value="years">Years</option>
            <option value="days">Days</option>
          </select>
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Description</label>
        <textarea className="form-textarea" {...register('description')} placeholder="Product description" rows={2} />
      </div>
      <div className="form-group">
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
          <input type="checkbox" {...register('is_active')} defaultChecked />
          Active (visible in invoice line items)
        </label>
      </div>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
        <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
          {isSubmitting ? <Spinner size={14} /> : initial ? 'Update Product' : 'Create Product'}
        </button>
      </div>
    </form>
  )
}
