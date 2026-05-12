import { useForm } from 'react-hook-form'
import { useMutation } from '@tanstack/react-query'
import { customersApi } from '@/api'
import { Spinner } from '@/components/ui'

const STATES = ['Tamil Nadu','Karnataka','Maharashtra','Delhi','Gujarat','Rajasthan','Andhra Pradesh','Telangana','Kerala','West Bengal','Madhya Pradesh','Uttar Pradesh','Punjab','Haryana','Bihar','Other']

export default function CustomerForm({ initial, onSuccess, onCancel }) {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({ defaultValues: initial || {} })

  const mutation = useMutation({
    mutationFn: (data) => initial ? customersApi.update(initial.id, data) : customersApi.create(data),
    onSuccess,
    onError: (e) => alert(e.message),
  })

  return (
    <form onSubmit={handleSubmit((d) => mutation.mutate(d))}>
      <div className="form-row cols-2">
        <div className="form-group">
          <label className="form-label">Name *</label>
          <input className="form-input" {...register('name', { required: 'Required' })} placeholder="Customer name" />
          {errors.name && <div className="form-err">{errors.name.message}</div>}
        </div>
        <div className="form-group">
          <label className="form-label">Email</label>
          <input className="form-input" type="email" {...register('email')} placeholder="email@example.com" />
        </div>
      </div>

      <div className="form-row cols-2">
        <div className="form-group">
          <label className="form-label">Phone</label>
          <input className="form-input" {...register('phone')} placeholder="+91 98765 43210" />
        </div>
        <div className="form-group">
          <label className="form-label">GSTIN</label>
          <input className="form-input" {...register('gstin')} placeholder="22AAAAA0000A1Z5" />
        </div>
      </div>

      <div className="form-row cols-2">
        <div className="form-group">
          <label className="form-label">PAN</label>
          <input className="form-input" {...register('pan')} placeholder="AAAAA9999A" />
        </div>
        <div className="form-group">
          <label className="form-label">State</label>
          <select className="form-select" {...register('state')}>
            <option value="">Select state</option>
            {STATES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <div className="form-row cols-3">
        <div className="form-group">
          <label className="form-label">City</label>
          <input className="form-input" {...register('city')} placeholder="Chennai" />
        </div>
        <div className="form-group">
          <label className="form-label">Pincode</label>
          <input className="form-input" {...register('pincode')} placeholder="600001" />
        </div>
        <div className="form-group">
          <label className="form-label">Currency</label>
          <select className="form-select" {...register('currency')}>
            <option value="INR">INR</option>
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
          </select>
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Credit Limit (₹)</label>
        <input className="form-input" type="number" {...register('credit_limit')} placeholder="0" />
      </div>
      <div className="form-group">
        <label className="form-label">Address</label>
        <textarea className="form-textarea" {...register('address')} placeholder="Full address" rows={2} />
      </div>
      <div className="form-group">
        <label className="form-label">Notes</label>
        <textarea className="form-textarea" {...register('notes')} placeholder="Internal notes" rows={2} />
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
        <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
          {isSubmitting ? <Spinner size={14} /> : initial ? 'Update Customer' : 'Create Customer'}
        </button>
      </div>
    </form>
  )
}
