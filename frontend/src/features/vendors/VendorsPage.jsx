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
        <div className="card-header" style={{ borderBottom: '1px solid var(--c-border)' }}>
          <div className="search-wrap" style={{ width: 320 }}>
            <Search className="search-icon" />
            <input className="form-input" placeholder="Search vendors..." value={search} onChange={(e) => setSearch(e.target.value)} />
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
                <tr>
                  <th>Vendor</th>
                  <th>Contact Information</th>
                  <th>GSTIN / Tax</th>
                  <th>Bank Details</th>
                  <th>Status</th>
                  <th className="right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((v) => (
                  <tr key={v.id} onClick={() => navigate(`/vendors/${v.id}`)} style={{ cursor: 'pointer' }}>
                    <td>
                      <div style={{ fontWeight: 700, color: 'var(--c-text)' }}>{v.name}</div>
                      {v.company_name && <div style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 500 }}>{v.company_name}</div>}
                    </td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{v.contact_person || '—'}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-2)' }}>{v.email || v.phone || 'No contact info'}</div>
                    </td>
                    <td className="mono" style={{ fontSize: 12, color: 'var(--c-primary)' }}>{v.gstin || '—'}</td>
                    <td>
                      <div style={{ fontSize: 12, fontWeight: 600 }}>{v.bank_account || '—'}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase' }}>{v.ifsc || ''}</div>
                    </td>
                    <td><Badge status={v.status} /></td>
                    <td className="right" onClick={(e) => e.stopPropagation()}>
                      <div className="tbl-actions" style={{ justifyContent: 'flex-end' }}>
                        <button className="topbar-icon-btn" title="View Profile" onClick={() => navigate(`/vendors/${v.id}`)}><Eye size={14} /></button>
                        <button className="topbar-icon-btn" title="Edit Vendor" onClick={() => { setEditing(v); setFormOpen(true) }}><Edit2 size={14} /></button>
                        <button className="topbar-icon-btn" style={{ color: 'var(--c-red)' }} onClick={() => window.confirm(`Delete "${v.name}"?`) && deleteMut.mutate(v.id)}><Trash2 size={14} /></button>
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
