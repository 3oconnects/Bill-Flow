import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  Plus, Search, MoreVertical, Eye, Edit2, Trash2, Users,
  UserPlus, AlertTriangle, Wallet, ShieldCheck, TrendingUp,
} from 'lucide-react'
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

  // ── KPIs ────────────────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const now      = Date.now()
    const day      = 86400000
    const last30   = now - 30 * day
    const prev30   = now - 60 * day
    const totalOutstanding = customers.reduce((s, c) => s + (Number(c.outstanding) || 0), 0)
    const totalCredit      = customers.reduce((s, c) => s + (Number(c.credit_limit) || 0), 0)
    const withOutstanding  = customers.filter(c => Number(c.outstanding) > 0)
    const overLimit        = customers.filter(c =>
      Number(c.credit_limit) > 0 && Number(c.outstanding) > Number(c.credit_limit))
    const newThisMonth = customers.filter(c => {
      const t = c.created_at ? new Date(c.created_at).getTime() : 0
      return t >= last30
    })
    const newPrevMonth = customers.filter(c => {
      const t = c.created_at ? new Date(c.created_at).getTime() : 0
      return t >= prev30 && t < last30
    })
    const growthPct = newPrevMonth.length
      ? Math.round(((newThisMonth.length - newPrevMonth.length) / newPrevMonth.length) * 100)
      : (newThisMonth.length ? 100 : 0)
    const gstinRegistered = customers.filter(c => c.gstin && c.gstin.trim()).length
    const gstinPct = customers.length
      ? Math.round((gstinRegistered / customers.length) * 100) : 0

    return {
      total: customers.length,
      newThisMonth: newThisMonth.length,
      growthPct,
      withOutstanding: withOutstanding.length,
      totalOutstanding,
      overLimit: overLimit.length,
      totalCredit,
      gstinRegistered,
      gstinPct,
    }
  }, [customers])

  const handleDelete = (c) => {
    if (window.confirm(`Delete customer "${c.name}"? This cannot be undone.`)) {
      deleteMut.mutate(c.id)
    }
  }

  if (isLoading) return <PageLoading />
 
  return (
    <div>
      {/* KPIs */}
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(6,1fr)', marginBottom: 20 }}>
        <div className="kpi-card blue">
          <div className="kpi-icon"><Users size={18} /></div>
          <div className="kpi-label">Total Customers</div>
          <div className="kpi-value" style={{ fontSize: 18 }}>{kpis.total}</div>
          <div className="kpi-sub">In your book</div>
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
          <div className="kpi-label">Outstanding Receivables</div>
          <div className="kpi-value" style={{ fontSize: 16 }}>{fmt.currency(kpis.totalOutstanding)}</div>
          <div className="kpi-sub">Across {kpis.withOutstanding} customers</div>
        </div>

        <div className="kpi-card red">
          <div className="kpi-icon"><AlertTriangle size={18} /></div>
          <div className="kpi-label">Over Credit Limit</div>
          <div className="kpi-value" style={{ fontSize: 18 }}>{kpis.overLimit}</div>
          <div className="kpi-sub">Needs review</div>
        </div>

        <div className="kpi-card purple">
          <div className="kpi-icon"><ShieldCheck size={18} /></div>
          <div className="kpi-label">Credit Extended</div>
          <div className="kpi-value" style={{ fontSize: 16 }}>{fmt.currency(kpis.totalCredit)}</div>
          <div className="kpi-sub">Combined credit lines</div>
        </div>

        <div className="kpi-card blue">
          <div className="kpi-icon"><ShieldCheck size={18} /></div>
          <div className="kpi-label">GSTIN Registered</div>
          <div className="kpi-value" style={{ fontSize: 18 }}>{kpis.gstinPct}%</div>
          <div className="kpi-sub">{kpis.gstinRegistered} of {kpis.total} customers</div>
        </div>
      </div>

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
