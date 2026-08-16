import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Search, Trash2, Edit2, ChevronRight } from 'lucide-react'
import { purchaseRequestsApi } from '@/api'
import { fmt } from '@/lib/utils'
import { Badge, PageLoading } from '@/components/ui'
import { toast } from '@/store/toastStore'
import { confirmAction } from '@/store/confirmStore'
import PurchaseRequestForm from './PurchaseRequestForm'

export default function PurchaseRequestsTab() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['purchaseRequests'],
    queryFn: purchaseRequestsApi.list
  })

  const del = useMutation({
    mutationFn: purchaseRequestsApi.remove,
    onSuccess: () => {
      qc.invalidateQueries(['purchaseRequests'])
      toast.success('Request deleted')
    }
  })

  const statusMut = useMutation({
    mutationFn: ({ id, status }) => purchaseRequestsApi.status(id, status),
    onSuccess: () => {
      qc.invalidateQueries(['purchaseRequests'])
    }
  })

  const handleEdit = (r) => {
    setEditing(r)
    setFormOpen(true)
  }

  const handleDelete = (id) => {
    confirmAction({
      title: 'Delete Request',
      message: 'Are you sure you want to delete this Purchase Request?',
      confirmText: 'Delete',
      onConfirm: () => del.mutate(id)
    })
  }

  const filtered = requests.filter(r => 
    (r.request_number || '').toLowerCase().includes(search.toLowerCase()) ||
    (r.department || '').toLowerCase().includes(search.toLowerCase())
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
              placeholder="Search by dept or PR#..." 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
            />
          </div>
          <div className="spacer" />
          <button className="btn btn-primary" style={{ gap: 8 }} onClick={() => { setEditing(null); setFormOpen(true) }}>
            <Plus size={15} /> New Request
          </button>
        </div>

        {filtered.length === 0 ? (
          <div style={{ padding: '80px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#0f2347', marginBottom: 6 }}>No purchase requests found</div>
            <div style={{ fontSize: 13, color: 'var(--c-text3)' }}>Create your first internal purchase request to get started.</div>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>PR #</th>
                  <th>Department</th>
                  <th>Required By</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th style={{ width: 140 }}></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 600, color: 'var(--accent)' }}>{r.request_number}</td>
                    <td style={{ fontWeight: 500 }}>{r.department || '-'}</td>
                    <td style={{ color: 'var(--text-2)' }}>{r.required_date ? fmt.date(r.required_date) : '-'}</td>
                    <td style={{ color: 'var(--text-2)' }}>{fmt.date(r.created_at)}</td>
                    <td><Badge status={r.status} /></td>
                    <td>
                      <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                        {r.status === 'draft' && (
                          <button className="topbar-icon-btn" onClick={() => statusMut.mutate({ id: r.id, status: 'pending_approval' })} title="Submit for Approval">
                            <ChevronRight size={14} />
                          </button>
                        )}
                        <button className="topbar-icon-btn" onClick={() => handleEdit(r)} title="Edit"><Edit2 size={14} /></button>
                        <button className="topbar-icon-btn" onClick={() => handleDelete(r.id)} title="Delete" style={{ color: 'var(--red)' }}><Trash2 size={14} /></button>
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
        <PurchaseRequestForm 
          initial={editing} 
          isOpen={formOpen}
          onClose={() => setFormOpen(false)} 
        />
      )}
    </div>
  )
}
