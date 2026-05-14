import { useForm } from 'react-hook-form'
import { useMutation, useQuery } from '@tanstack/react-query'
import { customersApi } from '@/api'
import { Spinner } from '@/components/ui'
import { toast } from '@/store/toastStore'
import { useEffect, useState } from 'react'
import { Info, MapPin, Building2, CreditCard, Settings, User, CheckCircle2 } from 'lucide-react'

const STATES = ['Tamil Nadu','Karnataka','Maharashtra','Delhi','Gujarat','Rajasthan','Andhra Pradesh','Telangana','Kerala','West Bengal','Madhya Pradesh','Uttar Pradesh','Punjab','Haryana','Bihar','Other']
const COUNTRIES = ['India', 'USA', 'UK', 'UAE', 'Singapore', 'Other']
const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP']
const PAYMENT_TERMS = ['Due on Receipt', 'Net 15', 'Net 30', 'Net 45', 'Net 60']
const TAX_PREFERENCES = ['Taxable', 'Tax Exempt']
const CUSTOMER_CATEGORIES = ['Retail', 'Wholesale', 'Distributor', 'Corporate']
const BUSINESS_TYPES = ['Sole Proprietorship', 'Partnership', 'Private Limited', 'Public Limited', 'LLP']

export default function CustomerForm({ initial, onSuccess, onCancel }) {
  const [sameAsBilling, setSameAsBilling] = useState(false)
  const [saveAndNew, setSaveAndNew] = useState(false)

  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: customersApi.list,
    enabled: !initial // Only need for duplication check on new customers
  })

  const { register, handleSubmit, watch, setValue, setError, formState: { errors, isSubmitting } } = useForm({ 
    defaultValues: initial || {
      currency: 'INR',
      country: 'India',
      shipping_country: 'India',
      status: 'active',
      tax_preference: 'Taxable',
      payment_terms: 'Net 30',
      customer_id_display: `CUST-${Math.floor(1000 + Math.random() * 9000)}` // Auto-generate mock ID if new
    } 
  })

  const billingFields = watch(['address', 'shipping_address_line2', 'city', 'state', 'country', 'pincode'])

  useEffect(() => {
    if (sameAsBilling) {
      setValue('shipping_address_line1', billingFields[0])
      setValue('shipping_address_line2', billingFields[1])
      setValue('shipping_city', billingFields[2])
      setValue('shipping_state', billingFields[3])
      setValue('shipping_country', billingFields[4])
      setValue('shipping_pincode', billingFields[5])
    }
  }, [sameAsBilling, billingFields, setValue])

  const mutation = useMutation({
    mutationFn: (data) => initial ? customersApi.update(initial.id, data) : customersApi.create(data),
    onSuccess: (res) => {
      if (saveAndNew) {
        // Reset form for next entry
        setValue('name', '')
        setValue('email', '')
        setValue('phone', '')
        setValue('customer_id_display', `CUST-${Math.floor(1000 + Math.random() * 9000)}`)
        // Keep other defaults or reset as needed
      } else {
        onSuccess(res)
      }
    },
    onError: (e) => alert(e.message),
  })

  const onSubmit = (d) => {
    // Duplicate detection
    if (!initial) {
      const isDuplicate = customers.some(c => 
        c.email?.toLowerCase() === d.email?.toLowerCase() || 
        c.name?.toLowerCase() === d.name?.toLowerCase()
      )
      if (isDuplicate) {
        toast.error('A customer with this name or email already exists')
        return
      }
    }
    mutation.mutate(d)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="po-form-standard">
      <div style={{ maxHeight: '70vh', overflowY: 'auto', paddingRight: 8, marginBottom: 20 }}>
        
        {/* 1. Personal Details */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, color: 'var(--accent)', fontWeight: 600 }}>
            <User size={18} /> Personal Details
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            <div className="form-group">
              <label>Customer Name *</label>
              <input className={`form-input ${errors.name ? 'err' : ''}`} {...register('name', { required: 'Required' })} placeholder="Full name" />
              {errors.name && <div className="form-err">{errors.name.message}</div>}
            </div>
            <div className="form-group">
              <label>Customer ID (Auto Generated)</label>
              <input className="form-input bg-muted" {...register('customer_id_display')} readOnly />
            </div>
            <div className="form-group">
              <label>Contact Person</label>
              <input className="form-input" {...register('contact_person')} placeholder="Liaison name" />
            </div>
            <div className="form-group">
              <label>Email Address *</label>
              <input className={`form-input ${errors.email ? 'err' : ''}`} type="email" {...register('email', { 
                required: 'Required',
                pattern: { value: /^\S+@\S+$/i, message: 'Invalid email' }
              })} placeholder="email@example.com" />
              {errors.email && <div className="form-err">{errors.email.message}</div>}
            </div>
            <div className="form-group">
              <label>Phone Number *</label>
              <input className={`form-input ${errors.phone ? 'err' : ''}`} {...register('phone', { 
                required: 'Required',
                pattern: { value: /^[0-9+\-\s()]{10,}$/, message: 'Invalid phone' }
              })} placeholder="+91 98765 43210" />
              {errors.phone && <div className="form-err">{errors.phone.message}</div>}
            </div>
            <div className="form-group">
              <label>Alternate Phone</label>
              <input className="form-input" {...register('alternate_phone')} placeholder="Emergency contact" />
            </div>
          </div>
        </div>

        {/* 2. Business Details */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, color: 'var(--accent)', fontWeight: 600 }}>
            <Building2 size={18} /> Business Details
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            <div className="form-group">
              <label>Company Name</label>
              <input className="form-input" {...register('company_name')} placeholder="Legal entity name" />
            </div>
            <div className="form-group">
              <label>GSTIN</label>
              <input className={`form-input mono ${errors.gstin ? 'err' : ''}`} {...register('gstin', {
                pattern: { value: /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, message: 'Invalid GSTIN format' }
              })} placeholder="22AAAAA0000A1Z5" />
              {errors.gstin && <div className="form-err">{errors.gstin.message}</div>}
            </div>
            <div className="form-group">
              <label>PAN Number</label>
              <input className="form-input mono" {...register('pan')} placeholder="AAAAA9999A" />
            </div>
            <div className="form-group">
              <label>Business Type</label>
              <select className="form-select" {...register('business_type')}>
                <option value="">Select Type</option>
                {BUSINESS_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* 3. Address Details */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, color: 'var(--accent)', fontWeight: 600 }}>
            <MapPin size={18} /> Address Details
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48 }}>
            {/* Billing */}
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 12, color: 'var(--text-3)' }}>BILLING ADDRESS</div>
              <div className="form-group">
                <label>Address Line 1</label>
                <input className="form-input" {...register('address')} placeholder="Building, Street" />
              </div>
              <div className="form-group">
                <label>Address Line 2</label>
                <input className="form-input" {...register('shipping_address_line2')} placeholder="Area, Landmark" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label>City</label>
                  <input className="form-input" {...register('city')} placeholder="City" />
                </div>
                <div className="form-group">
                  <label>State</label>
                  <select className="form-select" {...register('state')}>
                    <option value="">Select State</option>
                    {STATES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label>Country</label>
                  <select className="form-select" {...register('country')}>
                    {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Pincode</label>
                  <input className="form-input" {...register('pincode')} placeholder="600001" />
                </div>
              </div>
            </div>

            {/* Shipping */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)' }}>SHIPPING ADDRESS</div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, cursor: 'pointer' }}>
                  <input type="checkbox" checked={sameAsBilling} onChange={(e) => setSameAsBilling(e.target.checked)} /> Same as Billing
                </label>
              </div>
              <div className="form-group">
                <label>Address Line 1</label>
                <input className="form-input" {...register('shipping_address_line1')} placeholder="Building, Street" disabled={sameAsBilling} />
              </div>
              <div className="form-group">
                <label>Address Line 2</label>
                <input className="form-input" {...register('shipping_address_line2_ship')} placeholder="Area, Landmark" disabled={sameAsBilling} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label>City</label>
                  <input className="form-input" {...register('shipping_city')} placeholder="City" disabled={sameAsBilling} />
                </div>
                <div className="form-group">
                  <label>State</label>
                  <select className="form-select" {...register('shipping_state')} disabled={sameAsBilling}>
                    <option value="">Select State</option>
                    {STATES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label>Country</label>
                  <select className="form-select" {...register('shipping_country')} disabled={sameAsBilling}>
                    {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Pincode</label>
                  <input className="form-input" {...register('shipping_pincode')} placeholder="600001" disabled={sameAsBilling} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 4. Financial Details */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, color: 'var(--accent)', fontWeight: 600 }}>
            <CreditCard size={18} /> Financial Details
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 24 }}>
            <div className="form-group">
              <label>Currency</label>
              <select className="form-select" {...register('currency')}>
                {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Credit Limit</label>
              <input className="form-input" type="number" {...register('credit_limit')} placeholder="0.00" />
            </div>
            <div className="form-group">
              <label>Payment Terms</label>
              <select className="form-select" {...register('payment_terms')}>
                {PAYMENT_TERMS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Opening Balance</label>
              <input className="form-input" type="number" {...register('opening_balance')} placeholder="0.00" />
            </div>
            <div className="form-group">
              <label>Tax Preference</label>
              <select className="form-select" {...register('tax_preference')}>
                {TAX_PREFERENCES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* 5. Customer Preferences */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, color: 'var(--accent)', fontWeight: 600 }}>
            <Settings size={18} /> Customer Preferences
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            <div className="form-group">
              <label>Notes</label>
              <textarea className="form-input" {...register('notes')} placeholder="Internal customer notes" rows={2}></textarea>
            </div>
            <div className="form-group">
              <label>Tags</label>
              <input className="form-input" {...register('tags')} placeholder="Comma separated tags" />
            </div>
            <div className="form-group">
              <label>Preferred Payment Method</label>
              <select className="form-select" {...register('preferred_payment_method')}>
                <option value="">Select Method</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="cash">Cash</option>
                <option value="cheque">Cheque</option>
                <option value="upi">UPI</option>
              </select>
            </div>
            <div className="form-group">
              <label>Customer Category</label>
              <select className="form-select" {...register('customer_category')}>
                <option value="">Select Category</option>
                {CUSTOMER_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Status</label>
              <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                  <input type="radio" value="active" {...register('status')} /> Active
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                  <input type="radio" value="inactive" {...register('status')} /> Inactive
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                  <input type="radio" value="blacklisted" {...register('status')} /> Blacklisted
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', borderTop: '1px solid var(--c-border)', paddingTop: 16 }}>
        <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancel</button>
        {!initial && (
          <button type="submit" className="btn btn-ghost" onClick={() => setSaveAndNew(true)} disabled={isSubmitting}>
            {isSubmitting && saveAndNew ? <Spinner size={14} /> : 'Save & New'}
          </button>
        )}
        <button type="submit" className="btn btn-primary" onClick={() => setSaveAndNew(false)} disabled={isSubmitting}>
          {isSubmitting && !saveAndNew ? <Spinner size={14} /> : initial ? 'Update Customer' : 'Save Customer'}
        </button>
      </div>
    </form>
  )
}
