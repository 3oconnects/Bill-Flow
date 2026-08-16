import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Search, Trash2, Edit2, ShieldCheck } from 'lucide-react'
import { blanketAgreementsApi } from '@/api'
import { fmt } from '@/lib/utils'
import { Badge, PageLoading } from '@/components/ui'
import { toast } from '@/store/toastStore'
import { confirmAction } from '@/store/confirmStore'
import BlanketAgreementForm from './BlanketAgreementForm'

export default function BlanketAgreementsTab() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)

  const { data: agreements = [], isLoading } = useQuery({
    queryKey: ['blanketAgreements'],
    queryFn: blanketAgreementsApi.list
  })

  const del = useMutation({
    mutationFn: blanketAgreementsApi.remove,
    onSuccess: () => {
      qc.invalidateQueries(['blanketAgreements'])
      toast.success('Agreement deleted')
    }
  })

  const handleEdit = (a) => {
    setEditing(a)
    setFormOpen(true)
  }

  const handleDelete = (id) => {
    confirmAction({
      title: 'Delete Agreement',
      message: 'Are you sure you want to delete this Blanket Agreement?',
      confirmText: 'Delete',
      onConfirm: () => del.mutate(id)
    })
  }

  const filtered = agreements.filter(a => 
    (a.agreement_number || '').toLowerCase().includes(search.toLowerCase()) ||
    (a.vendor_name || '').toLowerCase().includes(search.toLowerCase())
  )

  if (isLoading) return <PageLoading />

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <div className="card">
        <div className="card-header" style={{ borderBottom: '1px solid var(--c-border)', display: 'flex', padding: 16, gap: 12, alignItems: 'center' }}>
          <div className="search-wrap" style={{ flex: 1, maxWidth: 320 }}>
            <Search className="search-icon" />
            <input 
              className="form-input" 
              placeholder="Search by vendor or Agreement#..." 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
            />
          </div>
          <div className="spacer" />
          <button className="btn btn-primary" style={{ gap: 8 }} onClick={() => { setEditing(null); setFormOpen(true) }}>
            <Plus size={15} /> New Agreement
          </button>
        </div>

        {filtered.length === 0 ? (
          <div style={{ padding: '80px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#0f2347', marginBottom: 6 }}>No blanket agreements found</div>
            <div style={{ fontSize: 13, color: 'var(--c-text3)' }}>Create your first long-term price contract to get started.</div>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Agreement #</th>
                  <th>Vendor</th>
                  <th>Start Date</th>
                  <th>End Date</th>
                  <th>Status</th>
                  <th>Target Value</th>
                  <th style={{ width: 100 }}></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(a => (
                  <tr key={a.id}>
                    <td style={{ fontWeight: 600, color: 'var(--accent)' }}>{a.agreement_number}</td>
                    <td style={{ fontWeight: 500 }}>{a.vendor_name}</td>
                    <td style={{ color: 'var(--text-2)' }}>{a.start_date ? fmt.date(a.start_date) : '-'}</td>
                    <td style={{ color: 'var(--text-2)' }}>{a.end_date ? fmt.date(a.end_date) : '-'}</td>
                    <td><Badge status={a.status} /></td>
                    <td style={{ fontWeight: 700 }}>
                      {fmt.currency(a.total_value, 'INR')}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                        <button className="topbar-icon-btn" onClick={() => handleEdit(a)} title="Edit"><Edit2 size={14} /></button>
                        <button className="topbar-icon-btn" onClick={() => handleDelete(a.id)} title="Delete" style={{ color: 'var(--red)' }}><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {formOpen && (
        <BlanketAgreementForm 
          initial={editing} 
          isOpen={formOpen}
          onClose={() => setFormOpen(false)} 
        />
      )}
    </div>
  )
}
