import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Search, Trash2, Edit2, ShoppingBag, Package } from 'lucide-react'
import { purchaseOrdersApi } from '@/api'
import { fmt } from '@/lib/utils'
import { Badge, PageLoading } from '@/components/ui'
import { toast } from '@/store/toastStore'
import { confirmAction } from '@/store/confirmStore'
import PurchaseOrderForm from './PurchaseOrderForm'

export default function PurchaseOrdersTab() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['purchaseOrders'],
    queryFn: purchaseOrdersApi.list
  })

  const del = useMutation({
    mutationFn: purchaseOrdersApi.remove,
    onSuccess: () => {
      qc.invalidateQueries(['purchaseOrders'])
      toast.success('PO deleted')
    }
  })

  const handleEdit = (o) => {
    setEditing(o)
    setFormOpen(true)
  }

  const handleDelete = (id) => {
    confirmAction({
      title: 'Delete Purchase Order',
      message: 'Are you sure you want to delete this Purchase Order?',
      confirmText: 'Delete',
      onConfirm: () => del.mutate(id)
    })
  }

  const filtered = orders.filter(o => 
    (o.po_number || '').toLowerCase().includes(search.toLowerCase()) ||
    (o.vendor_name || '').toLowerCase().includes(search.toLowerCase())
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
              placeholder="Search by vendor or PO#..." 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
            />
          </div>
          <div className="spacer" />
          <button className="btn btn-primary" style={{ gap: 8 }} onClick={() => { setEditing(null); setFormOpen(true) }}>
            <Plus size={15} /> New PO
          </button>
        </div>

        {filtered.length === 0 ? (
          <div style={{ padding: '80px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#0f2347', marginBottom: 6 }}>No purchase orders found</div>
            <div style={{ fontSize: 13, color: 'var(--c-text3)' }}>Create your first purchase order to get started.</div>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>PO #</th>
                  <th>Vendor</th>
                  <th>Date</th>
                  <th>Delivery Date</th>
                  <th>Status</th>
                  <th>Total</th>
                  <th style={{ width: 120 }}></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(o => (
                  <tr key={o.id}>
                    <td style={{ fontWeight: 600, color: 'var(--accent)' }}>{o.po_number}</td>
                    <td style={{ fontWeight: 500 }}>{o.vendor_name}</td>
                    <td style={{ color: 'var(--text-2)' }}>{fmt.date(o.created_at)}</td>
                    <td style={{ color: 'var(--text-2)' }}>{o.expected_delivery_date ? fmt.date(o.expected_delivery_date) : '-'}</td>
                    <td><Badge status={o.status} /></td>
                    <td style={{ fontWeight: 700 }}>
                      {fmt.currency(o.total, o.currency)}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                        <button className="topbar-icon-btn" onClick={() => handleEdit(o)} title="Edit"><Edit2 size={14} /></button>
                        <button className="topbar-icon-btn" onClick={() => handleDelete(o.id)} title="Delete" style={{ color: 'var(--red)' }}><Trash2 size={14} /></button>
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
        <PurchaseOrderForm 
          initial={editing} 
          isOpen={formOpen}
          onClose={() => setFormOpen(false)} 
        />
      )}
    </div>
  )
}
