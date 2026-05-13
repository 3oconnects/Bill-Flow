import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Shield, Edit2, Trash2, Copy, Check } from 'lucide-react'
import { rolesApi, teamApi } from '@/api'
import { useAuthStore } from '@/store/authStore'
import { PageLoading, EmptyState, Badge, Spinner } from '@/components/ui'
import { toast } from '@/store/toastStore'
import Modal from '@/components/Modal'
import { useForm } from 'react-hook-form'

const PERMISSION_GROUPS = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'customers', label: 'Customers' },
  { key: 'invoices', label: 'Invoices' },
  { key: 'products', label: 'Products' },
  { key: 'vendors', label: 'Vendors' },
  { key: 'expenses', label: 'Expenses' },
  { key: 'payments', label: 'Payments' },
  { key: 'reports', label: 'Reports' },
  { key: 'settings', label: 'Settings' },
  { key: 'team', label: 'Team Management' },
]

const ACTIONS = ['view', 'create', 'edit', 'delete']

const ROLE_COLORS = { owner: '#8b5cf6', admin: '#6366f1', staff: '#10b981', member: '#3b82f6' }

function RoleForm({ initial, onSuccess, onCancel }) {
  const { register, handleSubmit, watch, setValue, formState: { isSubmitting } } = useForm({
    defaultValues: initial || {
      name: '', color: '#6366f1',
      permissions: Object.fromEntries(PERMISSION_GROUPS.map((g) => [g.key, { view: true, create: false, edit: false, delete: false }])),
    },
  })

  const mutation = useMutation({
    mutationFn: (data) => initial ? rolesApi.update(initial.id, data) : rolesApi.create(data),
    onSuccess: () => { toast.success(initial ? 'Role updated' : 'Role created'); onSuccess() },
    onError: (e) => toast.error(e.message),
  })

  return (
    <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="po-form-standard">
      <div className="form-section-compact">
        <div className="form-section-header">Basic Info</div>
        <div className="form-grid-2" style={{ gridTemplateColumns: '1fr 1fr', display: 'grid', gap: '0 48px' }}>
          <div className="form-group-row">
            <label className="form-label">Role Name <span style={{color:'var(--c-red)'}}>*</span></label>
            <div className="input-group-compact">
              <input className="form-input sm" {...register('name', { required: true })} placeholder="e.g. Sales Manager" />
            </div>
          </div>
          <div className="form-group-row">
            <label className="form-label">Color</label>
            <div className="input-group-compact">
              <input type="color" {...register('color')} style={{ width: '100%', height: 38, borderRadius: 6, border: '1px solid var(--c-border)', background: 'var(--c-surface2)', cursor: 'pointer', padding: 2 }} />
            </div>
          </div>
        </div>
      </div>

      <div className="form-section-compact" style={{ borderBottom: 'none' }}>
        <div className="form-section-header">Permissions</div>
        <div style={{ border: '1px solid var(--c-border)', borderRadius: 8, overflow: 'hidden', marginTop: 12 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--c-surface2)' }}>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, color: 'var(--c-text3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Module</th>
                {ACTIONS.map((a) => (
                  <th key={a} style={{ padding: '12px 16px', textAlign: 'center', fontSize: 11, color: 'var(--c-text3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{a}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PERMISSION_GROUPS.map((group) => (
                <tr key={group.key} style={{ borderTop: '1px solid var(--c-border)' }}>
                  <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600, color: 'var(--c-text)' }}>{group.label}</td>
                  {ACTIONS.map((action) => (
                    <td key={action} style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <input type="checkbox" {...register(`permissions.${group.key}.${action}`)}
                        style={{ width: 16, height: 16, cursor: 'pointer', accentColor: 'var(--c-primary)' }} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--c-border)' }}>
        <button type="button" className="btn btn-ghost" onClick={onCancel} style={{ padding: '10px 20px' }}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={isSubmitting} style={{ padding: '10px 24px', fontWeight: 600 }}>
          {isSubmitting ? <Spinner size={14} /> : initial ? 'Update Role' : 'Create Role'}
        </button>
      </div>
    </form>
  )
}

function RoleCard({ role, onEdit, onDelete, isSystem }) {
  const grantedCount = role.permissions
    ? Object.values(role.permissions).reduce((s, grp) => s + Object.values(grp || {}).filter(Boolean).length, 0)
    : 0
  const totalPerms = PERMISSION_GROUPS.length * ACTIONS.length
  const pct = Math.round((grantedCount / totalPerms) * 100)
  
  const roleColor = role.color || ROLE_COLORS[role.name] || 'var(--c-primary)'

  return (
    <div className="card" style={{ padding: 24, borderTop: `4px solid ${roleColor}`, position: 'relative', overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, textTransform: 'capitalize', color: 'var(--c-text)', marginBottom: 6 }}>{role.name}</div>
          {isSystem && <span style={{ fontSize: 11, background: 'var(--c-surface2)', color: 'var(--c-text3)', padding: '4px 8px', borderRadius: 6, fontWeight: 600, letterSpacing: '0.02em' }}>System Role</span>}
        </div>
        {!isSystem && (
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="btn-icon-sm" onClick={() => onEdit(role)} title="Edit" style={{ background: 'var(--c-surface2)' }}><Edit2 size={14} /></button>
            <button className="btn-icon-sm" style={{ color: 'var(--c-red)', background: 'var(--c-red-lt)' }} onClick={() => onDelete(role.id)} title="Delete"><Trash2 size={14} /></button>
          </div>
        )}
      </div>

      {/* Permission coverage bar */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--c-text2)', fontWeight: 600, marginBottom: 8 }}>
          <span>Permission coverage</span>
          <span style={{ color: 'var(--c-text)' }}>{pct}%</span>
        </div>
        <div style={{ background: 'var(--c-surface2)', borderRadius: 8, height: 6, overflow: 'hidden' }}>
          <div style={{ height: '100%', borderRadius: 8, width: `${pct}%`, background: roleColor, transition: 'width 0.4s ease' }} />
        </div>
      </div>

      {/* Permission grid */}
      {role.permissions && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 12, marginTop: 16 }}>
          {PERMISSION_GROUPS.slice(0, 6).map((group) => {
            const grp = role.permissions[group.key] || {}
            const granted = Object.values(grp).filter(Boolean).length
            return (
              <div key={group.key} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 500, color: granted > 0 ? 'var(--c-text)' : 'var(--c-text3)' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: granted > 0 ? roleColor : 'var(--c-border)' }} />
                {group.label}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

const SYSTEM_ROLES = [
  { id: 'owner', name: 'owner', color: '#8b5cf6', permissions: Object.fromEntries(PERMISSION_GROUPS.map((g) => [g.key, { view: true, create: true, edit: true, delete: true }])) },
  { id: 'admin', name: 'admin', color: '#6366f1', permissions: Object.fromEntries(PERMISSION_GROUPS.map((g) => [g.key, { view: true, create: true, edit: true, delete: true }])) },
  { id: 'staff', name: 'staff', color: '#10b981', permissions: Object.fromEntries(PERMISSION_GROUPS.slice(0, 7).map((g) => [g.key, { view: true, create: true, edit: true, delete: false }])) },
  { id: 'member', name: 'member', color: '#3b82f6', permissions: Object.fromEntries(PERMISSION_GROUPS.slice(0, 5).map((g) => [g.key, { view: true, create: false, edit: false, delete: false }])) },
]

export default function RolesPage() {
  const qc = useQueryClient()
  const { user } = useAuthStore()
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [activeTab, setActiveTab] = useState('roles')

  const { data: customRoles = [], isLoading } = useQuery({ queryKey: ['roles'], queryFn: rolesApi.list })
  const { data: team = [] } = useQuery({ queryKey: ['team'], queryFn: teamApi.list })

  const deleteMut = useMutation({
    mutationFn: rolesApi.remove,
    onSuccess: () => { qc.invalidateQueries(['roles']); toast.success('Role deleted') },
    onError: (e) => toast.error(e.message),
  })

  if (isLoading) return <PageLoading />

  const allRoles = [...SYSTEM_ROLES, ...customRoles]

  return (
    <div>
      <div className="page-header" style={{ marginBottom: 24 }}>
        <div className="page-header-left">
          <h1>Roles & Permissions</h1>
          <p>{SYSTEM_ROLES.length} system roles · {customRoles.length} custom roles</p>
        </div>
        <div className="page-header-right">
          {(user?.role === 'owner' || user?.role === 'admin') && (
            <button className="btn btn-primary" onClick={() => { setEditing(null); setFormOpen(true) }} style={{ padding: '8px 16px', borderRadius: 8, fontWeight: 600 }}>
              <Plus size={15} /> New Role
            </button>
          )}
        </div>
      </div>

      <div className="tabs" style={{ maxWidth: 360, marginBottom: 24 }}>
        {['roles', 'team'].map((t) => (
          <button key={t} className={`tab-btn${activeTab === t ? ' active' : ''}`} onClick={() => setActiveTab(t)} style={{ textTransform: 'capitalize' }}>
            {t === 'roles' ? `Roles (${allRoles.length})` : `Team (${team.length || 0})`}
          </button>
        ))}
      </div>

      {activeTab === 'roles' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
          {allRoles.map((role) => (
            <RoleCard
              key={role.id}
              role={role}
              isSystem={SYSTEM_ROLES.some((s) => s.id === role.id)}
              onEdit={(r) => { setEditing(r); setFormOpen(true) }}
              onDelete={(id) => window.confirm('Delete this role?') && deleteMut.mutate(id)}
            />
          ))}
        </div>
      )}

      {activeTab === 'team' && (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Joined</th>
                </tr>
              </thead>
              <tbody>
                {team.map((m) => (
                  <tr key={m.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 10, background: `${ROLE_COLORS[m.role] || 'var(--c-primary)'}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: ROLE_COLORS[m.role] || 'var(--c-primary)' }}>
                          {m.name?.charAt(0).toUpperCase()}
                        </div>
                        <span style={{ fontWeight: 600, color: 'var(--c-text)' }}>{m.name}</span>
                        {m.id === user?.id && <span style={{ fontSize: 11, color: 'var(--c-primary)', background: 'var(--c-blue-lt)', padding: '2px 6px', borderRadius: 4, fontWeight: 600 }}>(You)</span>}
                      </div>
                    </td>
                    <td style={{ color: 'var(--c-text2)', fontWeight: 500 }}>{m.email}</td>
                    <td><Badge status={m.role} /></td>
                    <td><Badge status={m.is_active ? 'active' : 'inactive'} /></td>
                    <td style={{ color: 'var(--c-text3)', fontSize: 13, fontWeight: 500 }}>{new Date(m.created_at).toLocaleDateString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {formOpen && (
        <Modal title={editing ? 'Edit Role' : 'Create Role'} onClose={() => setFormOpen(false)} size="lg">
          <RoleForm
            initial={editing}
            onSuccess={() => { setFormOpen(false); qc.invalidateQueries(['roles']) }}
            onCancel={() => setFormOpen(false)}
          />
        </Modal>
      )}
    </div>
  )
}
