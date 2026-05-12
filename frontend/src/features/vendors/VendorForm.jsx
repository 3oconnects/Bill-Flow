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
      <div className="form-grid">
        <div className="form-group">
          <label className="form-label">Vendor Name *</label>
          <input className="form-input" {...register('name', { required: true })} placeholder="Vendor / Individual name" />
        </div>
        <div className="form-group">
          <label className="form-label">Company Name</label>
          <input className="form-input" {...register('company_name')} placeholder="Company / firm name" />
        </div>
        <div className="form-group">
          <label className="form-label">Contact Person</label>
          <input className="form-input" {...register('contact_person')} placeholder="Primary contact" />
        </div>
        <div className="form-group">
          <label className="form-label">Email</label>
          <input className="form-input" type="email" {...register('email')} placeholder="vendor@example.com" />
        </div>
        <div className="form-group">
          <label className="form-label">Phone</label>
          <input className="form-input" {...register('phone')} placeholder="+91 98765 43210" />
        </div>
        <div className="form-group">
          <label className="form-label">GSTIN</label>
          <input className="form-input" {...register('gstin')} placeholder="22AAAAA0000A1Z5" />
        </div>
        <div className="form-group">
          <label className="form-label">City</label>
          <input className="form-input" {...register('city')} placeholder="City" />
        </div>
        <div className="form-group">
          <label className="form-label">State</label>
          <input className="form-input" {...register('state')} placeholder="State" />
        </div>
        <div className="form-group">
          <label className="form-label">Bank Account</label>
          <input className="form-input" {...register('bank_account')} placeholder="Account number" />
        </div>
        <div className="form-group">
          <label className="form-label">IFSC</label>
          <input className="form-input" {...register('ifsc')} placeholder="SBIN0000123" />
        </div>
        <div className="form-group">
          <label className="form-label">Bank Name</label>
          <input className="form-input" {...register('bank_name')} placeholder="State Bank of India" />
        </div>
        <div className="form-group">
          <label className="form-label">Status</label>
          <select className="form-select" {...register('status')}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="blocked">Blocked</option>
          </select>
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">Notes</label>
        <textarea className="form-textarea" {...register('notes')} placeholder="Internal notes" rows={2} />
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
        <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
          {isSubmitting ? <Spinner size={14} /> : initial ? 'Update Vendor' : 'Create Vendor'}
        </button>
      </div>
    </form>
  )
}
