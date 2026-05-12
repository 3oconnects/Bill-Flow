import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, MoreVertical, Eye, Edit2, Trash2, Users } from 'lucide-react'
import { customersApi } from '@/api'
import { fmt, statusBadge } from '@/lib/utils'
import { PageLoading, EmptyState, Badge } from '@/components/ui'
import { toast } from '@/store/toastStore'
import Modal from '@/components/Modal'
import { useTopbarStore } from '@/store/topbarStore'
import { useEffect } from 'react'
import CustomerForm from './CustomerForm'

export default function CustomersPage() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ['customers'],
    queryFn: customersApi.list,
  })

  const { setActions, setContext, clear } = useTopbarStore()
 
  useEffect(() => {
    setContext('Customers', 'Manage your clients')
    setActions(
      <button className="btn btn-primary" onClick={() => { setEditing(null); setFormOpen(true) }}>
        <Plus size={15} /> New Customer
      </button>
    )
    return clear
  }, [setActions, setContext, clear])
 
  const deleteMut = useMutation({
    mutationFn: customersApi.remove,
    onSuccess: () => { qc.invalidateQueries(['customers']); toast.success('Customer deleted') },
    onError: (e) => toast.error(e.message),
  })

  const filtered = customers.filter((c) =>
    !search || c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search)
  )

  const handleDelete = (c) => {
    if (window.confirm(`Delete customer "${c.name}"? This cannot be undone.`)) {
      deleteMut.mutate(c.id)
    }
  }

  if (isLoading) return <PageLoading />
 
  return (
    <div>
      {/* Page Content */}
      <div className="card">
        <div className="filter-bar" style={{ padding: '16px 20px', borderBottom: '1px solid var(--c-border)' }}>
          <div className="search-wrap" style={{ width: 320 }}>
            <Search className="search-icon" />
            <input className="form-input" style={{ paddingLeft: 34 }} placeholder="Search customers..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="spacer" />
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="topbar-icon-btn active" title="List View"><MoreVertical size={16} /></button>
            <button className="topbar-icon-btn" title="Grid View"><Plus size={16} style={{ transform: 'rotate(45deg)' }} /></button>
          </div>
        </div>

        {/* Table */}
        {filtered.length === 0 ? (
          <div style={{ padding: '80px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#0f2347', marginBottom: 6 }}>No customers found</div>
            <div style={{ fontSize: 13, color: 'var(--c-text3)' }}>Try adjusting your search or add a new customer.</div>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Contact</th>
                  <th>GSTIN</th>
                  <th>Outstanding</th>
                  <th>Credit Limit</th>
                  <th>State</th>
                  <th style={{ width: 60 }}></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/customers/${c.id}`)}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{c.name}</div>
                      {c.email && <div style={{ fontSize: 11, color: 'var(--text-2)' }}>{c.email}</div>}
                    </td>
                    <td style={{ color: 'var(--text-2)' }}>{c.phone || '—'}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{c.gstin || '—'}</td>
                    <td style={{ color: Number(c.outstanding) > 0 ? 'var(--red)' : 'var(--text-2)', fontWeight: Number(c.outstanding) > 0 ? 600 : 400 }}>
                      {fmt.currency(c.outstanding)}
                    </td>
                    <td>{fmt.currency(c.credit_limit)}</td>
                    <td style={{ color: 'var(--text-2)' }}>{c.state || '—'}</td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="topbar-icon-btn" title="View" onClick={() => navigate(`/customers/${c.id}`)}>
                          <Eye size={14} />
                        </button>
                        <button className="topbar-icon-btn" title="Edit" onClick={() => { setEditing(c); setFormOpen(true) }}>
                          <Edit2 size={14} />
                        </button>
                        <button className="topbar-icon-btn" title="Delete" onClick={() => handleDelete(c)} style={{ color: 'var(--red)' }}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Form Modal */}
      {formOpen && (
        <Modal title={editing ? 'Edit Customer' : 'New Customer'} onClose={() => setFormOpen(false)} size="lg">
          <CustomerForm
            initial={editing}
            onSuccess={() => { setFormOpen(false); qc.invalidateQueries(['customers']); toast.success(editing ? 'Customer updated' : 'Customer created') }}
            onCancel={() => setFormOpen(false)}
          />
        </Modal>
      )}
    </div>
  )
}
