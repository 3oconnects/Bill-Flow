import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { orgApi } from '@/api'
import { useAuthStore } from '@/store/authStore'
import { toast } from '@/store/toastStore'
import { PageLoading, Spinner } from '@/components/ui'
import { useForm } from 'react-hook-form'
import { Save } from 'lucide-react'

export default function OrgTab() {
  const { setOrg } = useAuthStore()
  const qc = useQueryClient()
  const { data: org, isLoading } = useQuery({ queryKey: ['org'], queryFn: orgApi.get })
  const { register, handleSubmit, formState: { isSubmitting } } = useForm({ values: org || {} })
  const [logoPreview, setLogoPreview] = useState(org?.logo || null)
  const fileInputRef = useRef(null)

  const mutation = useMutation({
    mutationFn: orgApi.update,
    onSuccess: (d) => { qc.invalidateQueries(['org']); setOrg(d); toast.success('Organization updated') },
    onError: (e) => toast.error(e.message),
  })

  const handleLogoChange = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => setLogoPreview(reader.result)
      reader.readAsDataURL(file)
    }
  }

  if (isLoading) return <PageLoading />

  return (
    <form onSubmit={handleSubmit((d) => mutation.mutate(d))}>
      {/* Two Column Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 28, marginBottom: 28 }}>

        {/* LEFT COLUMN - Logo & Profile Upload */}
        <div>
          <div style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: 12, padding: 24, position: 'sticky', top: 0 }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--c-text)', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Company Logo
            </h3>

            {/* Logo Upload Area */}
            <div style={{ marginBottom: 20 }}>
              <div
                onClick={() => fileInputRef.current?.click()}
                style={{
                  width: '100%',
                  aspectRatio: '1',
                  borderRadius: 12,
                  background: logoPreview ? `url(${logoPreview})` : 'var(--c-surface2)',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '2px dashed var(--c-border)',
                  cursor: 'pointer',
                  fontSize: 56,
                  fontWeight: 700,
                  color: 'var(--c-text3)',
                  transition: 'all 0.2s',
                  marginBottom: 12,
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = logoPreview ? `url(${logoPreview})` : 'var(--c-primary-lt)'
                  e.currentTarget.style.borderColor = 'var(--c-primary)'
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = logoPreview ? `url(${logoPreview})` : 'var(--c-surface2)'
                  e.currentTarget.style.borderColor = 'var(--c-border)'
                }}
              >
                {!logoPreview && '🏢'}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleLogoChange}
                style={{ display: 'none' }}
              />
              <div style={{ fontSize: 12, color: 'var(--c-text2)', textAlign: 'center', lineHeight: 1.5 }}>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>Click to upload logo</div>
                <div style={{ fontSize: 11, color: 'var(--c-text3)' }}>PNG, JPG or GIF (Max 5MB)</div>
              </div>
            </div>

            {/* Logo Preview Info */}
            {logoPreview && (
              <div style={{ background: 'var(--c-surface2)', border: '1px solid var(--c-border)', borderRadius: 8, padding: 12, fontSize: 12, color: 'var(--c-text2)' }}>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>✓ Logo uploaded</div>
                <div style={{ fontSize: 11, color: 'var(--c-text3)' }}>Changes will be saved when you click Save</div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN - Business Information */}
        <div>
          <div style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: 12, padding: 24 }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--c-text)', marginBottom: 20, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Business Information
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }}>
              <div className="form-group">
                <label className="form-label">Business Name *</label>
                <input className="form-input" {...register('name')} placeholder="Your company legal name" />
              </div>

              <div className="form-group">
                <label className="form-label">Email</label>
                <input className="form-input" type="email" {...register('email')} placeholder="contact@company.com" />
              </div>

              <div className="form-group">
                <label className="form-label">Phone</label>
                <input className="form-input" {...register('phone')} placeholder="+91-XXXXXXXXXX" />
              </div>

              <div className="form-group">
                <label className="form-label">Website</label>
                <input className="form-input" {...register('website')} placeholder="https://example.com" />
              </div>

              <div className="form-group">
                <label className="form-label">Currency</label>
                <select className="form-select" {...register('currency')}>
                  <option value="INR">₹ INR (Indian Rupee)</option>
                  <option value="USD">$ USD (US Dollar)</option>
                  <option value="EUR">€ EUR (Euro)</option>
                  <option value="GBP">£ GBP (British Pound)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Business Address</label>
                <textarea className="form-textarea" {...register('address')} rows={3} placeholder="Street address, city, state, country" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tax & Compliance Section */}
      <div style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: 12, padding: 24, marginBottom: 24 }}>
        <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--c-text)', marginBottom: 20, paddingBottom: 16, borderBottom: '2px solid var(--c-success)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Tax & Compliance
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
          <div className="form-group">
            <label className="form-label">GSTIN</label>
            <input className="form-input" {...register('gstin')} placeholder="27AABCT1234A1Z5" />
          </div>
          <div className="form-group">
            <label className="form-label">PAN</label>
            <input className="form-input" {...register('pan')} placeholder="AAAPN1234A" />
          </div>
          <div className="form-group">
            <label className="form-label">City</label>
            <input className="form-input" {...register('city')} placeholder="Mumbai" />
          </div>
          <div className="form-group">
            <label className="form-label">State</label>
            <input className="form-input" {...register('state')} placeholder="Maharashtra" />
          </div>
          <div className="form-group">
            <label className="form-label">Pincode</label>
            <input className="form-input" {...register('pincode')} placeholder="400001" />
          </div>
        </div>
      </div>

      {/* Invoice Defaults Section */}
      <div style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: 12, padding: 24, marginBottom: 24 }}>
        <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--c-text)', marginBottom: 20, paddingBottom: 16, borderBottom: '2px solid var(--c-info)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Invoice Defaults
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 16 }}>
          <div className="form-group">
            <label className="form-label">Invoice Prefix</label>
            <input className="form-input" {...register('inv_prefix')} placeholder="INV-" />
          </div>
          <div className="form-group">
            <label className="form-label">Next Invoice Number</label>
            <input className="form-input" type="number" {...register('next_inv_no')} placeholder="1001" />
          </div>
          <div className="form-group">
            <label className="form-label">Default Due Days</label>
            <input className="form-input" type="number" {...register('due_days')} placeholder="30" />
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Default Invoice Notes</label>
          <textarea className="form-textarea" {...register('default_notes')} rows={2} placeholder="e.g., Thank you for your business!" />
        </div>
        <div className="form-group">
          <label className="form-label">Default Terms & Conditions</label>
          <textarea className="form-textarea" {...register('default_terms')} rows={2} placeholder="e.g., Payment due within 30 days of invoice date" />
        </div>
      </div>

      {/* Action Bar */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, paddingTop: 20, borderTop: '1px solid var(--c-border)' }}>
        <button type="submit" className="btn btn-primary" disabled={isSubmitting} style={{ minWidth: 180 }}>
          {isSubmitting ? <Spinner size={14} /> : <><Save size={14} /> Save Changes</>}
        </button>
      </div>
    </form>
  )
}
