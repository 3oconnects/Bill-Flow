import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { orgApi, teamApi, authApi } from '@/api'
import { useAuthStore } from '@/store/authStore'
import { toast } from '@/store/toastStore'
import { PageLoading, Spinner, Badge } from '@/components/ui'
import { useForm } from 'react-hook-form'
import Modal from '@/components/Modal'
import { Plus, Trash2, Save, Lock, User, Palette, Globe, Building2 } from 'lucide-react'

const TABS = [
  { id: 'org', label: 'Organization', icon: Building2 },
  { id: 'team', label: 'Team', icon: User },
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'security', label: 'Security', icon: Lock },
  { id: 'appearance', label: 'Appearance', icon: Palette },
]

// ── Organization Tab ───────────────────────────────────────────────────
function OrgTab() {
  const { setOrg } = useAuthStore()
  const qc = useQueryClient()
  const { data: org, isLoading } = useQuery({ queryKey: ['org'], queryFn: orgApi.get })
  const { register, handleSubmit, formState: { isSubmitting } } = useForm({ values: org || {} })
  const mutation = useMutation({
    mutationFn: orgApi.update,
    onSuccess: (d) => { qc.invalidateQueries(['org']); setOrg(d); toast.success('Organization updated') },
    onError: (e) => toast.error(e.message),
  })
  if (isLoading) return <PageLoading />
  return (
    <form onSubmit={handleSubmit((d) => mutation.mutate(d))}>
      <div style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>Business Information</div>
      <div className="form-grid">
        <div className="form-group"><label className="form-label">Business Name *</label><input className="form-input" {...register('name')} /></div>
        <div className="form-group"><label className="form-label">Email</label><input className="form-input" type="email" {...register('email')} /></div>
        <div className="form-group"><label className="form-label">Phone</label><input className="form-input" {...register('phone')} /></div>
        <div className="form-group"><label className="form-label">Website</label><input className="form-input" {...register('website')} /></div>
        <div className="form-group"><label className="form-label">GSTIN</label><input className="form-input" {...register('gstin')} /></div>
        <div className="form-group"><label className="form-label">PAN</label><input className="form-input" {...register('pan')} /></div>
        <div className="form-group"><label className="form-label">City</label><input className="form-input" {...register('city')} /></div>
        <div className="form-group"><label className="form-label">State</label><input className="form-input" {...register('state')} /></div>
        <div className="form-group"><label className="form-label">Pincode</label><input className="form-input" {...register('pincode')} /></div>
        <div className="form-group"><label className="form-label">Currency</label>
          <select className="form-select" {...register('currency')}><option value="INR">INR</option><option value="USD">USD</option><option value="EUR">EUR</option><option value="GBP">GBP</option></select>
        </div>
      </div>
      <div className="form-group"><label className="form-label">Address</label><textarea className="form-textarea" {...register('address')} rows={2} /></div>
      <div style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '20px 0 14px' }}>Invoice Defaults</div>
      <div className="form-grid">
        <div className="form-group"><label className="form-label">Invoice Prefix</label><input className="form-input" {...register('inv_prefix')} placeholder="INV-" /></div>
        <div className="form-group"><label className="form-label">Next Invoice No.</label><input className="form-input" type="number" {...register('next_inv_no')} /></div>
        <div className="form-group"><label className="form-label">Default Due Days</label><input className="form-input" type="number" {...register('due_days')} /></div>
      </div>
      <div className="form-group"><label className="form-label">Default Invoice Notes</label><textarea className="form-textarea" {...register('default_notes')} rows={2} /></div>
      <div className="form-group"><label className="form-label">Default Terms & Conditions</label><textarea className="form-textarea" {...register('default_terms')} rows={2} /></div>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
          {isSubmitting ? <Spinner size={14} /> : <><Save size={14} /> Save Changes</>}
        </button>
      </div>
    </form>
  )
}

// ── Team Tab ───────────────────────────────────────────────────────────
function AddMemberModal({ onSuccess, onCancel }) {
  const { register, handleSubmit, formState: { isSubmitting } } = useForm({ defaultValues: { role: 'staff' } })
  const mutation = useMutation({ mutationFn: teamApi.add, onSuccess, onError: (e) => toast.error(e.message) })
  return (
    <form onSubmit={handleSubmit((d) => mutation.mutate(d))}>
      <div className="form-grid">
        <div className="form-group"><label className="form-label">Full Name *</label><input className="form-input" {...register('name', { required: true })} /></div>
        <div className="form-group"><label className="form-label">Email *</label><input className="form-input" type="email" {...register('email', { required: true })} /></div>
        <div className="form-group"><label className="form-label">Password *</label><input className="form-input" type="password" {...register('password', { required: true })} /></div>
        <div className="form-group"><label className="form-label">Role</label>
          <select className="form-select" {...register('role')}>
            {['admin', 'staff', 'member'].map((r) => <option key={r} value={r} style={{ textTransform: 'capitalize' }}>{r}</option>)}
          </select>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={isSubmitting}>{isSubmitting ? <Spinner size={14} /> : 'Add Member'}</button>
      </div>
    </form>
  )
}

function TeamTab() {
  const qc = useQueryClient()
  const { user } = useAuthStore()
  const [addOpen, setAddOpen] = useState(false)
  const { data: team = [], isLoading } = useQuery({ queryKey: ['team'], queryFn: teamApi.list })
  const deleteMut = useMutation({
    mutationFn: teamApi.remove,
    onSuccess: () => { qc.invalidateQueries(['team']); toast.success('Member removed') },
    onError: (e) => toast.error(e.message),
  })
  if (isLoading) return <PageLoading />
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: 'var(--text-2)' }}>{team.length} active members</div>
        <button className="btn btn-primary" onClick={() => setAddOpen(true)}><Plus size={14} /> Add Member</button>
      </div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Member</th><th>Email</th><th>Role</th><th>Status</th><th>Joined</th><th style={{ width: 60 }}></th></tr></thead>
          <tbody>
            {team.map((m) => (
              <tr key={m.id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 34, height: 34, borderRadius: 8, background: 'var(--bg-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, color: 'var(--accent)' }}>{m.name?.charAt(0).toUpperCase()}</div>
                    <div>
                      <div style={{ fontWeight: 600 }}>{m.name} {m.id === user?.id && <span style={{ fontSize: 10, color: 'var(--accent)' }}>(you)</span>}</div>
                    </div>
                  </div>
                </td>
                <td style={{ color: 'var(--text-2)' }}>{m.email}</td>
                <td><Badge status={m.role} /></td>
                <td><Badge status={m.is_active ? 'active' : 'inactive'} /></td>
                <td style={{ color: 'var(--text-3)', fontSize: 12 }}>{new Date(m.created_at).toLocaleDateString('en-IN')}</td>
                <td>
                  {m.id !== user?.id && (
                    <button className="topbar-icon-btn" style={{ color: 'var(--red)' }} onClick={() => window.confirm(`Remove ${m.name}?`) && deleteMut.mutate(m.id)}>
                      <Trash2 size={14} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {addOpen && (
        <Modal title="Add Team Member" onClose={() => setAddOpen(false)}>
          <AddMemberModal onSuccess={() => { setAddOpen(false); qc.invalidateQueries(['team']); toast.success('Member added') }} onCancel={() => setAddOpen(false)} />
        </Modal>
      )}
    </div>
  )
}

// ── Profile Tab ────────────────────────────────────────────────────────
function ProfileTab() {
  const { user } = useAuthStore()
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 28, padding: 20, background: 'var(--bg-2)', borderRadius: 12 }}>
        <div style={{ width: 64, height: 64, borderRadius: 16, background: 'linear-gradient(135deg,var(--accent),#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 700, color: 'white' }}>
          {user?.name?.charAt(0).toUpperCase()}
        </div>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>{user?.name}</div>
          <div style={{ color: 'var(--text-2)', fontSize: 13 }}>{user?.email}</div>
          <div style={{ marginTop: 6 }}><Badge status={user?.role} /></div>
        </div>
      </div>
      {[['Full Name', user?.name], ['Email Address', user?.email], ['Role', user?.role], ['User ID', user?.id]].map(([l, v]) => (
        <div key={l} style={{ display: 'flex', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
          <span style={{ color: 'var(--text-3)', width: 140, flexShrink: 0 }}>{l}</span>
          <span style={{ fontFamily: l === 'User ID' ? 'monospace' : 'inherit', textTransform: l === 'Role' ? 'capitalize' : 'none' }}>{v || '—'}</span>
        </div>
      ))}
      <div style={{ marginTop: 16, padding: '12px 16px', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 8, fontSize: 12, color: '#d97706' }}>
        To change your name or email, contact your organization administrator.
      </div>
    </div>
  )
}

// ── Security Tab ───────────────────────────────────────────────────────
function SecurityTab() {
  const { register, handleSubmit, watch, reset, formState: { isSubmitting, errors } } = useForm()
  const newPw = watch('new_password')
  const mutation = useMutation({
    mutationFn: (data) => authApi.changePassword(data),
    onSuccess: () => { toast.success('Password changed successfully'); reset() },
    onError: (e) => toast.error(e.message),
  })
  return (
    <div style={{ maxWidth: 440 }}>
      <div style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 16 }}>Change Password</div>
      <form onSubmit={handleSubmit((d) => mutation.mutate(d))}>
        <div className="form-group">
          <label className="form-label">Current Password *</label>
          <input className="form-input" type="password" {...register('current_password', { required: true })} placeholder="••••••••" />
        </div>
        <div className="form-group">
          <label className="form-label">New Password *</label>
          <input className="form-input" type="password" {...register('new_password', { required: true, minLength: 8 })} placeholder="Min. 8 characters" />
          {errors.new_password?.type === 'minLength' && <div style={{ color: 'var(--red)', fontSize: 11, marginTop: 4 }}>Password must be at least 8 characters</div>}
        </div>
        <div className="form-group">
          <label className="form-label">Confirm New Password *</label>
          <input className="form-input" type="password" {...register('confirm_password', { required: true, validate: (v) => v === newPw || 'Passwords do not match' })} placeholder="Repeat new password" />
          {errors.confirm_password && <div style={{ color: 'var(--red)', fontSize: 11, marginTop: 4 }}>{errors.confirm_password.message}</div>}
        </div>
        <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
          {isSubmitting ? <Spinner size={14} /> : <><Lock size={14} /> Update Password</>}
        </button>
      </form>
    </div>
  )
}

// ── Appearance Tab ─────────────────────────────────────────────────────
function AppearanceTab() {
  const [theme, setTheme] = useState(localStorage.getItem('bf_theme') || 'dark')
  const [compact, setCompact] = useState(localStorage.getItem('bf_compact') === 'true')

  const applyTheme = (t) => {
    setTheme(t)
    localStorage.setItem('bf_theme', t)
    document.documentElement.setAttribute('data-theme', t)
    toast.success(`${t.charAt(0).toUpperCase() + t.slice(1)} mode applied`)
  }

  return (
    <div>
      <div style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 16 }}>Color Theme</div>
      <div style={{ display: 'flex', gap: 16, marginBottom: 28 }}>
        {[
          { id: 'dark', label: 'Dark Mode', preview: 'linear-gradient(135deg,#0d0e14,#1a1b26)' },
          { id: 'light', label: 'Light Mode', preview: 'linear-gradient(135deg,#f8f9fa,#e9ecef)' },
          { id: 'midnight', label: 'Midnight', preview: 'linear-gradient(135deg,#0a0a1a,#12122a)' },
        ].map((t) => (
          <div key={t.id} onClick={() => applyTheme(t.id)} style={{
            cursor: 'pointer', borderRadius: 12, overflow: 'hidden',
            border: `2px solid ${theme === t.id ? 'var(--accent)' : 'var(--border)'}`,
            transition: '0.2s',
          }}>
            <div style={{ width: 120, height: 72, background: t.preview }} />
            <div style={{ padding: '8px 12px', fontSize: 12, fontWeight: 600, textAlign: 'center', color: theme === t.id ? 'var(--accent)' : 'var(--text-2)' }}>
              {t.label}
            </div>
          </div>
        ))}
      </div>

      <div style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 16 }}>Display Density</div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 16, background: 'var(--bg-2)', borderRadius: 10, marginBottom: 12 }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: 13 }}>Compact Mode</div>
          <div style={{ fontSize: 12, color: 'var(--text-3)' }}>Reduce padding and spacing for denser information display</div>
        </div>
        <label style={{ position: 'relative', display: 'inline-block', width: 44, height: 24, cursor: 'pointer' }}>
          <input type="checkbox" checked={compact} onChange={(e) => {
            setCompact(e.target.checked)
            localStorage.setItem('bf_compact', e.target.checked)
            document.body.classList.toggle('compact', e.target.checked)
          }} style={{ opacity: 0, width: 0, height: 0 }} />
          <span style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 12,
            background: compact ? 'var(--accent)' : 'var(--border)', transition: '0.2s',
          }}>
            <span style={{ position: 'absolute', top: 2, left: compact ? 22 : 2, width: 20, height: 20, background: 'white', borderRadius: '50%', transition: '0.2s' }} />
          </span>
        </label>
      </div>

      <div style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 16 }}>Localization</div>
      <div style={{ display: 'flex', gap: 12 }}>
        <div className="form-group" style={{ flex: 1 }}>
          <label className="form-label">Language</label>
          <select className="form-select" defaultValue={localStorage.getItem('bf_lang') || 'en'}
            onChange={(e) => { localStorage.setItem('bf_lang', e.target.value); toast.success('Language saved') }}>
            <option value="en">English</option>
            <option value="hi">Hindi (हिंदी)</option>
          </select>
        </div>
        <div className="form-group" style={{ flex: 1 }}>
          <label className="form-label">Date Format</label>
          <select className="form-select" defaultValue={localStorage.getItem('bf_date_fmt') || 'dd/mm/yyyy'}
            onChange={(e) => { localStorage.setItem('bf_date_fmt', e.target.value); toast.success('Format saved') }}>
            <option value="dd/mm/yyyy">DD/MM/YYYY</option>
            <option value="mm/dd/yyyy">MM/DD/YYYY</option>
            <option value="yyyy-mm-dd">YYYY-MM-DD</option>
          </select>
        </div>
      </div>
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const [tab, setTab] = useState('org')
  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Settings</h1>
          <p>Manage your workspace and preferences</p>
        </div>
      </div>

      <div className="settings-layout">
        <aside className="settings-sidenav">
          {TABS.map((t) => {
            const Icon = t.icon
            return (
              <button key={t.id}
                className={`settings-sidenav-btn${tab === t.id ? ' active' : ''}`}
                onClick={() => setTab(t.id)}>
                <Icon size={15} />
                {t.label}
              </button>
            )
          })}
        </aside>

        <main className="settings-content">
          <div className="card">
            <div className="card-body">
              {tab === 'org' && <OrgTab />}
              {tab === 'team' && <TeamTab />}
              {tab === 'profile' && <ProfileTab />}
              {tab === 'security' && <SecurityTab />}
              {tab === 'appearance' && <AppearanceTab />}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
