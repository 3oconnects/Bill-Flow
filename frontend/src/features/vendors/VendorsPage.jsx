import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Eye, Edit2, Trash2, ShoppingBag } from 'lucide-react'
import { vendorsApi } from '@/api'
import { PageLoading, EmptyState, Badge } from '@/components/ui'
import { toast } from '@/store/toastStore'
import Modal from '@/components/Modal'
import VendorForm from './VendorForm'

export default function VendorsPage() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)

  const { data: vendors = [], isLoading } = useQuery({ queryKey: ['vendors'], queryFn: vendorsApi.list })

  const deleteMut = useMutation({
    mutationFn: vendorsApi.remove,
    onSuccess: () => { qc.invalidateQueries(['vendors']); toast.success('Vendor deleted') },
    onError: (e) => toast.error(e.message),
  })

  const filtered = vendors.filter((v) =>
    !search || v.name?.toLowerCase().includes(search.toLowerCase()) ||
    v.email?.toLowerCase().includes(search.toLowerCase()) ||
    v.gstin?.includes(search)
  )

  if (isLoading) return <PageLoading />

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left"><h1>Vendors</h1><p>{vendors.length} vendors</p></div>
        <div className="page-header-right">
          <button className="btn btn-primary" onClick={() => { setEditing(null); setFormOpen(true) }}>
            <Plus size={15} /> Add Vendor
          </button>
        </div>
      </div>
      <div className="card">
        <div className="inv-filter-bar">
          <div className="inv-filter-left">
            <div className="inv-search-wrap">
              <Search className="inv-search-icon" />
              <input className="inv-search-input" placeholder="Search vendors..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
        </div>
        {filtered.length === 0 ? (
          <EmptyState icon={<ShoppingBag size={48} />} title="No vendors yet"
            description="Add vendors to link them to products and expenses"
            action={<button className="btn btn-primary" onClick={() => { setEditing(null); setFormOpen(true) }}><Plus size={15} /> Add Vendor</button>} />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Vendor</th><th>Contact</th><th>GSTIN</th><th>Bank / IFSC</th><th>Status</th><th style={{ width: 80 }}></th></tr>
              </thead>
              <tbody>
                {filtered.map((v) => (
                  <tr key={v.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{v.name}</div>
                      {v.company_name && <div style={{ fontSize: 11, color: 'var(--text-2)' }}>{v.company_name}</div>}
                    </td>
                    <td>
                      <div>{v.contact_person || '—'}</div>
                      {v.email && <div style={{ fontSize: 11, color: 'var(--text-2)' }}>{v.email}</div>}
                      {v.phone && <div style={{ fontSize: 11, color: 'var(--text-2)' }}>{v.phone}</div>}
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{v.gstin || '—'}</td>
                    <td style={{ fontSize: 12 }}>
                      {v.bank_account ? <div>{v.bank_account}</div> : '—'}
                      {v.ifsc && <div style={{ color: 'var(--text-2)' }}>{v.ifsc}</div>}
                    </td>
                    <td><Badge status={v.status} /></td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="topbar-icon-btn" title="View" onClick={() => navigate(`/vendors/${v.id}`)}><Eye size={14} /></button>
                        <button className="topbar-icon-btn" title="Edit" onClick={() => { setEditing(v); setFormOpen(true) }}><Edit2 size={14} /></button>
                        <button className="topbar-icon-btn" style={{ color: 'var(--red)' }} onClick={() => window.confirm(`Delete "${v.name}"?`) && deleteMut.mutate(v.id)}><Trash2 size={14} /></button>
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
        <Modal title={editing ? 'Edit Vendor' : 'New Vendor'} onClose={() => setFormOpen(false)} size="lg">
          <VendorForm
            initial={editing}
            onSuccess={() => { setFormOpen(false); qc.invalidateQueries(['vendors']); toast.success(editing ? 'Vendor updated' : 'Vendor created') }}
            onCancel={() => setFormOpen(false)}
          />
        </Modal>
      )}
    </div>
  )
}
