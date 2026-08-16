import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Search, Trash2, Edit2, FileText, ChevronRight } from 'lucide-react'
import { purchaseQuotationsApi } from '@/api'
import { fmt } from '@/lib/utils'
import { Badge, PageLoading } from '@/components/ui'
import { toast } from '@/store/toastStore'
import { confirmAction } from '@/store/confirmStore'
import PurchaseQuotationForm from './PurchaseQuotationForm'

export default function PurchaseQuotationsTab() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)

  const { data: quotes = [], isLoading } = useQuery({
    queryKey: ['purchaseQuotations'],
    queryFn: purchaseQuotationsApi.list
  })

  const del = useMutation({
    mutationFn: purchaseQuotationsApi.remove,
    onSuccess: () => {
      qc.invalidateQueries(['purchaseQuotations'])
      toast.success('Quotation deleted')
    }
  })

  const handleEdit = (q) => {
    setEditing(q)
    setFormOpen(true)
  }

  const handleDelete = (id) => {
    confirmAction({
      title: 'Delete Quotation',
      message: 'Are you sure you want to delete this Request for Quotation?',
      confirmText: 'Delete',
      onConfirm: () => del.mutate(id)
    })
  }

  const filtered = quotes.filter(q => 
    (q.number || '').toLowerCase().includes(search.toLowerCase()) ||
    (q.vendor_name || '').toLowerCase().includes(search.toLowerCase())
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
              placeholder="Search by vendor or RFQ#..." 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
            />
          </div>
          <div className="spacer" />
          <button className="btn btn-primary" style={{ gap: 8 }} onClick={() => { setEditing(null); setFormOpen(true) }}>
            <Plus size={15} /> New RFQ
          </button>
        </div>

        {filtered.length === 0 ? (
          <div style={{ padding: '80px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#0f2347', marginBottom: 6 }}>No quotations found</div>
            <div style={{ fontSize: 13, color: 'var(--c-text3)' }}>Create your first Request for Quotation to get started.</div>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>RFQ #</th>
                  <th>Vendor</th>
                  <th>Date</th>
                  <th>Valid Until</th>
                  <th>Status</th>
                  <th>Total</th>
                  <th style={{ width: 120 }}></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(q => (
                  <tr key={q.id}>
                    <td style={{ fontWeight: 600, color: 'var(--accent)' }}>{q.number}</td>
                    <td style={{ fontWeight: 500 }}>{q.vendor_name}</td>
                    <td style={{ color: 'var(--text-2)' }}>{fmt.date(q.created_at)}</td>
                    <td style={{ color: 'var(--text-2)' }}>{q.valid_until ? fmt.date(q.valid_until) : '-'}</td>
                    <td><Badge status={q.status} /></td>
                    <td style={{ fontWeight: 700 }}>
                      {fmt.currency(q.total, q.currency)}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                        <button className="topbar-icon-btn" onClick={() => toast.success('Converting to PO... (mock)')} title="Convert to PO">
                          <ChevronRight size={14} />
                        </button>
                        <button className="topbar-icon-btn" onClick={() => handleEdit(q)} title="Edit"><Edit2 size={14} /></button>
                        <button className="topbar-icon-btn" onClick={() => handleDelete(q.id)} title="Delete" style={{ color: 'var(--red)' }}><Trash2 size={14} /></button>
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
        <PurchaseQuotationForm 
          initial={editing} 
          isOpen={formOpen}
          onClose={() => setFormOpen(false)} 
        />
      )}
    </div>
  )
}
