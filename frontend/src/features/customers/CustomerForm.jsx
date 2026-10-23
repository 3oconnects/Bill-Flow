import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useMutation } from '@tanstack/react-query'
import { customersApi } from '@/api'
import { Spinner } from '@/components/ui'

const STATES = ['Tamil Nadu','Karnataka','Maharashtra','Delhi','Gujarat','Rajasthan','Andhra Pradesh','Telangana','Kerala','West Bengal','Madhya Pradesh','Uttar Pradesh','Punjab','Haryana','Bihar','Other']

export default function CustomerForm({ initial, onSuccess, onCancel }) {
  const [apiError, setApiError] = useState(null)
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({ defaultValues: initial || {} })

  const mutation = useMutation({
    mutationFn: (data) => initial ? customersApi.update(initial.id, data) : customersApi.create(data),
    onSuccess,
    onError: (e) => {
      // e.fieldErrors is set by the API interceptor for VALIDATION_ERROR responses
      const FIELD_LABELS = {
        name: 'Name', email: 'Email', phone: 'Phone', address: 'Address',
        city: 'City', state: 'State', country: 'Country', pincode: 'Pincode',
        gstin: 'GSTIN / Tax ID', pan: 'PAN Number', currency: 'Currency',
        credit_limit: 'Credit Limit', notes: 'Notes',
      }
      if (e.fieldErrors && e.fieldErrors.length > 0) {
        const msg = e.fieldErrors
          .map(fe => `${FIELD_LABELS[fe.field] || fe.field || 'Field'}: ${fe.message}`)
          .join(' · ')
        setApiError(msg)
      } else {
        setApiError(e.message)
      }
    },
  })

  return (
    <form onSubmit={handleSubmit((d) => {
        setApiError(null)
        // react-hook-form sends NaN for empty number inputs with valueAsNumber:true
        if (typeof d.credit_limit === 'number' && Number.isNaN(d.credit_limit)) {
          d.credit_limit = undefined
        }
        mutation.mutate(d)
      })}>
      <div className="po-form-standard">
        {apiError && (
          <div style={{ background: 'var(--c-red-lt)', color: 'var(--c-red)', padding: '12px 16px', borderRadius: 'var(--radius)', fontSize: '13px', marginBottom: '24px', border: '1px solid #f5c6c6' }}>
            {apiError}
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48, marginBottom: 32 }}>
          {/* Left Column: Primary & Contact */}
          <div className="form-section-compact">
            <div className="form-group-row">
              <label>Name *</label>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <input className="form-input sm" {...register('name', { required: 'Required' })} placeholder="Customer name" />
                {errors.name && <div className="form-err">{errors.name.message}</div>}
              </div>
            </div>
            <div className="form-group-row">
              <label>Email Address</label>
              <input className="form-input sm" type="email" {...register('email')} placeholder="email@example.com" />
            </div>
            <div className="form-group-row">
              <label>Phone Number</label>
              <input className="form-input sm" {...register('phone')} placeholder="+91 98765 43210" />
            </div>
            <div className="form-group-row">
              <label>Currency</label>
              <select className="form-select sm" {...register('currency')}>
                <option value="INR">INR (₹)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
              </select>
            </div>
          </div>

          {/* Right Column: Tax & Limit */}
          <div className="form-section-compact">
            <div className="form-group-row">
              <label>GSTIN / Tax ID</label>
              <input className="form-input sm mono" {...register('gstin')} placeholder="22AAAAA0000A1Z5" />
            </div>
            <div className="form-group-row">
              <label>PAN Number</label>
              <input className="form-input sm mono" {...register('pan')} placeholder="AAAAA9999A" />
            </div>
            <div className="form-group-row">
              <label>State / Region</label>
              <select className="form-select sm" {...register('state')}>
                <option value="">Select state</option>
                {STATES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="form-group-row">
              <label>Credit Limit</label>
              <input className="form-input sm" type="number" {...register('credit_limit', { valueAsNumber: true })} placeholder="0" />
            </div>
          </div>
        </div>

        {/* Bottom Section: Location & Notes */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48, marginBottom: 24 }}>
          <div className="form-section-compact">
            <div className="form-group-row">
              <label>City</label>
              <input className="form-input sm" {...register('city')} placeholder="Chennai" />
            </div>
            <div className="form-group-row">
              <label>Pincode</label>
              <input className="form-input sm" {...register('pincode')} placeholder="600001" />
            </div>
          </div>
          <div className="form-section-compact">
            <div className="form-group-row" style={{ alignItems: 'flex-start' }}>
              <label style={{ marginTop: 8 }}>Full Address</label>
              <textarea className="form-input sm" {...register('address')} placeholder="Billing address" rows={2}></textarea>
            </div>
            <div className="form-group-row" style={{ alignItems: 'flex-start' }}>
              <label style={{ marginTop: 8 }}>Notes</label>
              <textarea className="form-input sm" {...register('notes')} placeholder="Internal notes" rows={2}></textarea>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', borderTop: '1px solid var(--c-border)', paddingTop: 16 }}>
          <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
            {isSubmitting ? <Spinner size={14} /> : initial ? 'Update Customer' : 'Create Customer'}
          </button>
        </div>
      </div>
    </form>
  )
}
