import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { teamApi } from '@/api'
import { useAuthStore } from '@/store/authStore'
import { toast } from '@/store/toastStore'
import { PageLoading, Spinner, Badge } from '@/components/ui'
import { useForm } from 'react-hook-form'
import Modal from '@/components/Modal'
import { Plus, Trash2 } from 'lucide-react'
import { confirmAction } from '@/store/confirmStore'

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

export default function TeamTab() {
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

  // Ensure team is an array (guard against undefined/null)
  const teamList = Array.isArray(team) ? team : []

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: 'var(--text-2)' }}>{teamList.length} active members</div>
        <button className="btn btn-primary" onClick={() => setAddOpen(true)}><Plus size={14} /> Add Member</button>
      </div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Member</th><th>Email</th><th>Role</th><th>Status</th><th>Joined</th><th style={{ width: 60 }}></th></tr></thead>
          <tbody>
            {teamList.map((m) => (
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
                    <button className="topbar-icon-btn" style={{ color: 'var(--red)' }} onClick={() => confirmAction(`Remove ${m.name}?`, () => deleteMut.mutate(m.id))}>
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
