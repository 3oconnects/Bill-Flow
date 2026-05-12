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
    <form onSubmit={handleSubmit((d) => mutation.mutate(d))}>
      <div className="form-grid" style={{ marginBottom: 16 }}>
        <div className="form-group">
          <label className="form-label">Role Name *</label>
          <input className="form-input" {...register('name', { required: true })} placeholder="e.g. Sales Manager" />
        </div>
        <div className="form-group">
          <label className="form-label">Color</label>
          <input type="color" {...register('color')} style={{ width: '100%', height: 38, borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-2)', cursor: 'pointer' }} />
        </div>
      </div>

      <div style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Permissions</div>
      <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--bg-2)' }}>
              <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, color: 'var(--text-3)', fontWeight: 600 }}>Module</th>
              {ACTIONS.map((a) => (
                <th key={a} style={{ padding: '10px 14px', textAlign: 'center', fontSize: 11, color: 'var(--text-3)', fontWeight: 600, textTransform: 'capitalize' }}>{a}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PERMISSION_GROUPS.map((group) => (
              <tr key={group.key} style={{ borderTop: '1px solid var(--border)' }}>
                <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 500 }}>{group.label}</td>
                {ACTIONS.map((action) => (
                  <td key={action} style={{ padding: '10px 14px', textAlign: 'center' }}>
                    <input type="checkbox" {...register(`permissions.${group.key}.${action}`)}
                      style={{ width: 16, height: 16, cursor: 'pointer', accentColor: 'var(--accent)' }} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
        <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
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

  return (
    <div className="card" style={{ borderLeft: `3px solid ${role.color || ROLE_COLORS[role.name] || 'var(--accent)'}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, textTransform: 'capitalize', marginBottom: 4 }}>{role.name}</div>
          {isSystem && <span style={{ fontSize: 10, background: 'var(--bg-3)', color: 'var(--text-3)', padding: '2px 6px', borderRadius: 4 }}>System Role</span>}
        </div>
        {!isSystem && (
          <div style={{ display: 'flex', gap: 4 }}>
            <button className="topbar-icon-btn" onClick={() => onEdit(role)} title="Edit"><Edit2 size={13} /></button>
            <button className="topbar-icon-btn" style={{ color: 'var(--red)' }} onClick={() => onDelete(role.id)} title="Delete"><Trash2 size={13} /></button>
          </div>
        )}
      </div>

      {/* Permission coverage bar */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-3)', marginBottom: 4 }}>
          <span>Permission coverage</span>
          <span>{pct}%</span>
        </div>
        <div style={{ background: 'var(--bg-2)', borderRadius: 4, height: 5 }}>
          <div style={{ height: '100%', borderRadius: 4, width: `${pct}%`, background: role.color || ROLE_COLORS[role.name] || 'var(--accent)', transition: 'width 0.4s ease' }} />
        </div>
      </div>

      {/* Permission grid */}
      {role.permissions && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 4, marginTop: 12 }}>
          {PERMISSION_GROUPS.slice(0, 6).map((group) => {
            const grp = role.permissions[group.key] || {}
            const granted = Object.values(grp).filter(Boolean).length
            return (
              <div key={group.key} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: granted > 0 ? 'var(--text-2)' : 'var(--text-3)' }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: granted > 0 ? (role.color || 'var(--accent)') : 'var(--border)' }} />
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
      <div className="page-header">
        <div className="page-header-left">
          <h1>Roles & Permissions</h1>
          <p>{SYSTEM_ROLES.length} system roles · {customRoles.length} custom roles</p>
        </div>
        <div className="page-header-right">
          {(user?.role === 'owner' || user?.role === 'admin') && (
            <button className="btn btn-primary" onClick={() => { setEditing(null); setFormOpen(true) }}>
              <Plus size={14} /> New Role
            </button>
          )}
        </div>
      </div>

      <div className="tabs" style={{ maxWidth: 360 }}>
        {['roles', 'team'].map((t) => (
          <button key={t} className={`tab-btn${activeTab === t ? ' active' : ''}`} onClick={() => setActiveTab(t)} style={{ textTransform: 'capitalize' }}>
            {t === 'roles' ? `Roles (${allRoles.length})` : `Team (${team.length})`}
          </button>
        ))}
      </div>

      {activeTab === 'roles' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 16 }}>
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 8, background: `${ROLE_COLORS[m.role] || 'var(--accent)'}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: ROLE_COLORS[m.role] || 'var(--accent)' }}>
                          {m.name?.charAt(0).toUpperCase()}
                        </div>
                        <span style={{ fontWeight: 600 }}>{m.name}</span>
                        {m.id === user?.id && <span style={{ fontSize: 10, color: 'var(--accent)' }}>(you)</span>}
                      </div>
                    </td>
                    <td style={{ color: 'var(--text-2)' }}>{m.email}</td>
                    <td><Badge status={m.role} /></td>
                    <td><Badge status={m.is_active ? 'active' : 'inactive'} /></td>
                    <td style={{ color: 'var(--text-3)', fontSize: 12 }}>{new Date(m.created_at).toLocaleDateString('en-IN')}</td>
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
