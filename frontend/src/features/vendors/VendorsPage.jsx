import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  Plus, Search, Eye, Edit2, Trash2, ShoppingBag,
  Users, UserPlus, Wallet, AlertTriangle, ShieldCheck, TrendingUp,
} from 'lucide-react'
import { vendorsApi, apApi } from '@/api'
import { fmt } from '@/lib/utils'
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
  const { data: apInvoices = [] } = useQuery({
    queryKey: ['ap', 'invoices'],
    queryFn:  () => apApi.list('invoices'),
  })

  // ── KPIs ────────────────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const now    = Date.now()
    const day    = 86400000
    const last30 = now - 30 * day
    const prev30 = now - 60 * day

    const newThisMonth = vendors.filter(v => {
      const t = v.created_at ? new Date(v.created_at).getTime() : 0
      return t >= last30
    })
    const newPrev30 = vendors.filter(v => {
      const t = v.created_at ? new Date(v.created_at).getTime() : 0
      return t >= prev30 && t < last30
    })
    const growthPct = newPrev30.length
      ? Math.round(((newThisMonth.length - newPrev30.length) / newPrev30.length) * 100)
      : (newThisMonth.length ? 100 : 0)

    // Outstanding payables across all open AP invoices, grouped by vendor.
    const openInvoices = apInvoices.filter(i =>
      !['paid', 'cancelled', 'closed'].includes(i.status)
    )
    const totalPayables = openInvoices.reduce(
      (s, i) => s + Math.max(0, Number(i.total_amount || 0) - Number(i.paid_amount || 0)),
      0,
    )
    const vendorsWithBalance = new Set(
      openInvoices.filter(i => i.vendor_id).map(i => i.vendor_id)
    ).size

    const overdue = openInvoices.filter(i =>
      i.due_date && new Date(i.due_date).getTime() < now
    )
    const overdueValue = overdue.reduce(
      (s, i) => s + Math.max(0, Number(i.total_amount || 0) - Number(i.paid_amount || 0)),
      0,
    )

    const gstinRegistered = vendors.filter(v => v.gstin && v.gstin.trim()).length
    const gstinPct = vendors.length
      ? Math.round((gstinRegistered / vendors.length) * 100) : 0

    return {
      total: vendors.length,
      newThisMonth: newThisMonth.length,
      growthPct,
      totalPayables,
      vendorsWithBalance,
      overdueCount: overdue.length,
      overdueValue,
      gstinRegistered,
      gstinPct,
    }
  }, [vendors, apInvoices])

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

      {/* KPIs */}
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(6,1fr)', marginBottom: 20 }}>
        <div className="kpi-card blue">
          <div className="kpi-icon"><Users size={18} /></div>
          <div className="kpi-label">Total Vendors</div>
          <div className="kpi-value" style={{ fontSize: 18 }}>{kpis.total}</div>
          <div className="kpi-sub">In your supplier book</div>
        </div>
        <div className="kpi-card green">
          <div className="kpi-icon"><UserPlus size={18} /></div>
          <div className="kpi-label">New This Month</div>
          <div className="kpi-value" style={{ fontSize: 18 }}>{kpis.newThisMonth}</div>
          <div className="kpi-sub" style={{
            color: kpis.growthPct >= 0 ? 'var(--c-green, #0a8754)' : 'var(--c-red, #d63d3d)',
            fontWeight: 600,
          }}>
            <TrendingUp size={11} style={{ verticalAlign: 'middle', marginRight: 2 }} />
            {kpis.growthPct >= 0 ? '+' : ''}{kpis.growthPct}% vs prev 30d
          </div>
        </div>
        <div className="kpi-card orange">
          <div className="kpi-icon"><Wallet size={18} /></div>
          <div className="kpi-label">Total Payables</div>
          <div className="kpi-value" style={{ fontSize: 16 }}>{fmt.currency(kpis.totalPayables)}</div>
          <div className="kpi-sub">Across {kpis.vendorsWithBalance} vendors</div>
        </div>
        <div className="kpi-card red">
          <div className="kpi-icon"><AlertTriangle size={18} /></div>
          <div className="kpi-label">Overdue</div>
          <div className="kpi-value" style={{ fontSize: 18 }}>{kpis.overdueCount}</div>
          <div className="kpi-sub">{fmt.currency(kpis.overdueValue)} past due</div>
        </div>
        <div className="kpi-card purple">
          <div className="kpi-icon"><ShieldCheck size={18} /></div>
          <div className="kpi-label">GSTIN Registered</div>
          <div className="kpi-value" style={{ fontSize: 18 }}>{kpis.gstinPct}%</div>
          <div className="kpi-sub">{kpis.gstinRegistered} of {kpis.total} vendors</div>
        </div>
        <div className="kpi-card blue">
          <div className="kpi-icon"><ShoppingBag size={18} /></div>
          <div className="kpi-label">Open AP Invoices</div>
          <div className="kpi-value" style={{ fontSize: 18 }}>
            {apInvoices.filter(i => !['paid','cancelled','closed'].includes(i.status)).length}
          </div>
          <div className="kpi-sub">Awaiting payment</div>
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
