import { useForm } from 'react-hook-form'
import { useMutation } from '@tanstack/react-query'
import { vendorsApi } from '@/api'
import { Spinner } from '@/components/ui'

export default function VendorForm({ initial, onSuccess, onCancel }) {
  const { register, handleSubmit, formState: { isSubmitting } } = useForm({ defaultValues: initial || { status: 'active', country: 'India' } })
  const mutation = useMutation({
    mutationFn: (data) => initial ? vendorsApi.update(initial.id, data) : vendorsApi.create(data),
    onSuccess, onError: (e) => alert(e.message),
  })
  return (
    <form onSubmit={handleSubmit((d) => mutation.mutate(d))}>
      <div className="po-form-standard">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48, marginBottom: 32 }}>
          {/* Left Column: Primary & Contact */}
          <div className="form-section-compact">
            <div className="form-group-row">
              <label>Vendor Name *</label>
              <input className="form-input sm" {...register('name', { required: true })} placeholder="Vendor / Individual name" />
            </div>
            <div className="form-group-row">
              <label>Company Name</label>
              <input className="form-input sm" {...register('company_name')} placeholder="Company / firm name" />
            </div>
            <div className="form-group-row">
              <label>Contact Person</label>
              <input className="form-input sm" {...register('contact_person')} placeholder="Primary contact" />
            </div>
            <div className="form-group-row">
              <label>Email Address</label>
              <input className="form-input sm" type="email" {...register('email')} placeholder="vendor@example.com" />
            </div>
            <div className="form-group-row">
              <label>Phone Number</label>
              <input className="form-input sm" {...register('phone')} placeholder="+91 98765 43210" />
            </div>
          </div>

          {/* Right Column: Tax, Banking, Status */}
          <div className="form-section-compact">
            <div className="form-group-row">
              <label>Vendor Status</label>
              <select className="form-select sm" {...register('status')}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="blocked">Blocked</option>
              </select>
            </div>
            <div className="form-group-row">
              <label>GSTIN / Tax ID</label>
              <input className="form-input sm mono" {...register('gstin')} placeholder="22AAAAA0000A1Z5" />
            </div>
            <div className="form-group-row">
              <label>Bank Name</label>
              <input className="form-input sm" {...register('bank_name')} placeholder="State Bank of India" />
            </div>
            <div className="form-group-row">
              <label>Account Number</label>
              <input className="form-input sm mono" {...register('bank_account')} placeholder="Account number" />
            </div>
            <div className="form-group-row">
              <label>IFSC Code</label>
              <input className="form-input sm mono" {...register('ifsc')} placeholder="SBIN0000123" />
            </div>
          </div>
        </div>

        {/* Bottom Section: Location & Notes */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48, marginBottom: 24 }}>
          <div className="form-section-compact">
            <div className="form-group-row">
              <label>City</label>
              <input className="form-input sm" {...register('city')} placeholder="City" />
            </div>
            <div className="form-group-row">
              <label>State</label>
              <input className="form-input sm" {...register('state')} placeholder="State" />
            </div>
          </div>
          <div className="form-section-compact">
            <div className="form-group-row" style={{ alignItems: 'flex-start' }}>
              <label style={{ marginTop: 8 }}>Notes</label>
              <textarea className="form-input sm" {...register('notes')} placeholder="Internal notes" rows={3}></textarea>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', borderTop: '1px solid var(--c-border)', paddingTop: 16 }}>
          <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
            {isSubmitting ? <Spinner size={14} /> : initial ? 'Update Vendor' : 'Create Vendor'}
          </button>
        </div>
      </div>
    </form>
  )
}
