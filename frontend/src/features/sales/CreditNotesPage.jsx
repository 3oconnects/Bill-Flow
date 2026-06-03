import { useState, useMemo, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { creditNotesApi } from '@/api'
import { fmt } from '@/lib/utils'
import { useTopbarStore } from '@/store/topbarStore'
import { toast } from '@/store/toastStore'
import { PageLoading } from '@/components/ui'
import {
  FileMinus, Plus, Search, TrendingDown, AlertTriangle, Clock, BarChart3, DollarSign, Users,
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'

import { STATUS_META, REASON_META, WORKFLOW_STAGES } from './CreditNotesShared'
import CreditNoteForm from './CreditNoteForm'
import CreditNoteTable from './CreditNoteTable'

export default function CreditNotesPage() {
  const { setContext, setActions, clear } = useTopbarStore()
  const qc = useQueryClient()
  const [view,     setView]     = useState('dashboard')
  const [search,   setSearch]   = useState('')
  const [statusF,  setStatusF]  = useState('all')
  const [reasonF,  setReasonF]  = useState('all')
  const [showForm, setShowForm] = useState(false)

  const { data: notes = [], isLoading: loadN } = useQuery({ queryKey: ['credit-notes'],       queryFn: creditNotesApi.list })
  const { data: stats,        isLoading: loadS } = useQuery({ queryKey: ['credit-note-stats'], queryFn: creditNotesApi.stats })

  const createMut  = useMutation({ mutationFn: creditNotesApi.create,
    onSuccess: () => { qc.invalidateQueries(['credit-notes']); qc.invalidateQueries(['credit-note-stats']); toast.success('Credit note created') },
    onError: e => toast.error(e.message) })
  const approveMut = useMutation({ mutationFn: creditNotesApi.approve,
    onSuccess: () => { qc.invalidateQueries(['credit-notes']); qc.invalidateQueries(['credit-note-stats']); toast.success('Approved') } })
  const applyMut   = useMutation({ mutationFn: creditNotesApi.apply,
    onSuccess: () => { qc.invalidateQueries(['credit-notes']); qc.invalidateQueries(['credit-note-stats']); toast.success('Credit applied') } })
  const rejectMut  = useMutation({ mutationFn: creditNotesApi.reject,
    onSuccess: () => { qc.invalidateQueries(['credit-notes']); qc.invalidateQueries(['credit-note-stats']); toast.success('Rejected') } })
  const deleteMut  = useMutation({ mutationFn: creditNotesApi.remove,
    onSuccess: () => { qc.invalidateQueries(['credit-notes']); qc.invalidateQueries(['credit-note-stats']); toast.success('Deleted') } })

  const reasonChartData = useMemo(() => (stats?.byReason || []).map(r => ({
    name: REASON_META[r.reason]?.label || r.reason,
    count: Number(r.count),
    value: Number(r.value),
    color: REASON_META[r.reason]?.color || '#9aa3b2',
  })), [stats])

  const filtered = useMemo(() => notes.filter(n => {
    const ms = statusF === 'all' || n.status === statusF
    const mr = reasonF === 'all' || n.reason === reasonF
    const ql = search.toLowerCase()
    const ms2 = !ql || n.number?.toLowerCase().includes(ql) || n.customer_name?.toLowerCase().includes(ql)
    return ms && mr && ms2
  }), [notes, statusF, reasonF, search])

  const pendingApproval = notes.filter(n => n.status === 'pending_review')
  const totalLeakage    = notes.reduce((s, n) => s + Number(n.total || 0), 0)

  useEffect(() => {
    setContext('Sales', 'Credit Notes — Revenue Protection')
    setActions(
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn btn-secondary btn-sm" onClick={() => setView(v => v === 'dashboard' ? 'list' : 'dashboard')}>
          {view === 'dashboard' ? <><BarChart3 size={13} /> List View</> : <><TrendingDown size={13} /> Dashboard</>}
        </button>
        <button className="btn btn-danger btn-sm" onClick={() => setShowForm(true)}>
          <Plus size={13} /> New Credit Note
        </button>
      </div>
    )
    return clear
  }, [view, setContext, setActions, clear]) // eslint-disable-line

  if (loadN || loadS) return <PageLoading />
  const t = stats?.totals || {}

  return (
    <div>
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(5,1fr)', marginBottom: 20 }}>
        <div className="kpi-card red">
          <div className="kpi-icon"><FileMinus size={18} /></div>
          <div className="kpi-label">Total Credit Notes</div>
          <div className="kpi-value" style={{ fontSize: 16 }}>{t.total || 0}</div>
          <div className="kpi-sub">{t.applied_count || 0} applied</div>
        </div>
        <div className="kpi-card red">
          <div className="kpi-icon"><DollarSign size={18} /></div>
          <div className="kpi-label">Revenue Leakage</div>
          <div className="kpi-value" style={{ fontSize: 16 }}>{fmt.currency(t.total_value || 0)}</div>
          <div className="kpi-sub">Total credit issued</div>
        </div>
        <div className="kpi-card orange">
          <div className="kpi-icon"><Clock size={18} /></div>
          <div className="kpi-label">Pending Approval</div>
          <div className="kpi-value" style={{ fontSize: 16 }}>{t.pending_approval || 0}</div>
          <div className="kpi-sub">{fmt.currency(t.pending_value || 0)}</div>
        </div>
        <div className="kpi-card orange">
          <div className="kpi-icon"><TrendingDown size={18} /></div>
          <div className="kpi-label">Refund Rate</div>
          <div className="kpi-value" style={{ fontSize: 16 }}>{t.refund_rate || 0}%</div>
          <div className="kpi-sub">Credits / invoices</div>
        </div>
        <div className="kpi-card purple">
          <div className="kpi-icon"><Users size={18} /></div>
          <div className="kpi-label">Top Returnee</div>
          <div className="kpi-value" style={{ fontSize: 13, letterSpacing: 0 }}>
            {stats?.topCustomers?.[0]?.customer_name?.split(' ')[0] || '—'}
          </div>
          <div className="kpi-sub">{fmt.currency(stats?.topCustomers?.[0]?.credit_value || 0)} credited</div>
        </div>
      </div>

      {view === 'dashboard' ? (
        <div>
          {pendingApproval.length > 0 && (
            <div style={{
              background: '#fef7e7', border: '1px solid #fcd34d', borderRadius: 10,
              padding: '12px 18px', marginBottom: 18,
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <AlertTriangle size={18} color="#c97b10" />
              <div style={{ flex: 1 }}>
                <span style={{ fontWeight: 700, color: '#c97b10' }}>{pendingApproval.length} credit note{pendingApproval.length > 1 ? 's' : ''} awaiting approval</span>
                <span style={{ color: 'var(--c-text2)', fontSize: 13, marginLeft: 8 }}>
                  {fmt.currency(pendingApproval.reduce((s,n) => s + Number(n.total||0), 0))} pending finance review
                </span>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => { setView('list'); setStatusF('pending_review') }}>
                Review Now →
              </button>
            </div>
          )}

          <div className="responsive-grid cols-2-1" style={{ marginBottom: 20 }}>
            <div className="card">
              <div className="card-header">
                <div className="card-title">Return Reason Intelligence</div>
                <span style={{ fontSize: 11, color: 'var(--c-text3)' }}>Credit value by root cause</span>
              </div>
              <div style={{ padding: '16px 20px 12px' }}>
                {reasonChartData.length === 0 ? (
                  <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--c-text3)', fontSize: 13 }}>
                    No credit note data yet
                  </div>
                ) : (
                  <>
                    <ResponsiveContainer width="100%" height={180}>
                      <BarChart data={reasonChartData} layout="vertical" margin={{ left: 8, right: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--c-border)" />
                        <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--c-text3)' }} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
                        <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: 'var(--c-text2)' }} width={90} />
                        <Tooltip formatter={(v) => [fmt.currency(v), 'Credit Value']} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                        <Bar dataKey="value" radius={[0,4,4,0]}>
                          {reasonChartData.map((d, i) => <Cell key={i} fill={d.color} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                    <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 5 }}>
                      {reasonChartData.map((r, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <div style={{ width: 10, height: 10, borderRadius: 2, background: r.color }} />
                            <span style={{ color: 'var(--c-text2)' }}>{r.name}</span>
                          </div>
                          <div style={{ display: 'flex', gap: 12 }}>
                            <span style={{ color: 'var(--c-text3)', fontFamily: 'monospace' }}>{r.count} notes</span>
                            <span style={{ fontWeight: 700, fontFamily: 'monospace', color: r.color }}>{fmt.currency(r.value)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <div className="card-title">Revenue Leakage Center</div>
              </div>
              <div style={{ padding: '14px 16px' }}>
                <div style={{ background: '#fdf0f0', borderRadius: 10, padding: '12px 14px', marginBottom: 14 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#d63d3d', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>
                    Total Revenue Leakage
                  </div>
                  <div style={{ fontSize: 26, fontWeight: 800, color: '#d63d3d', fontFamily: 'monospace' }}>
                    {fmt.currency(totalLeakage)}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--c-text2)', marginTop: 4 }}>
                    Across {notes.length} credit notes issued
                  </div>
                </div>

                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--c-text3)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>
                  Top Returning Customers
                </div>
                {(stats?.topCustomers || []).length === 0 ? (
                  <div style={{ fontSize: 13, color: 'var(--c-text3)', textAlign: 'center', padding: '16px 0' }}>No data yet</div>
                ) : (
                  (stats?.topCustomers || []).map((c, i) => (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '8px 0', borderBottom: '1px solid var(--c-border)', fontSize: 12,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 28, height: 28, borderRadius: 8, background: '#fdf0f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: '#d63d3d' }}>
                          {i + 1}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600 }}>{c.customer_name}</div>
                          <div style={{ fontSize: 10, color: 'var(--c-text3)' }}>{c.credit_count} notes</div>
                        </div>
                      </div>
                      <span style={{ fontWeight: 700, fontFamily: 'monospace', color: '#d63d3d' }}>
                        {fmt.currency(c.credit_value)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="card" style={{ marginBottom: 20 }}>
            <div className="card-header">
              <div className="card-title">Approval Workflow</div>
            </div>
            <div style={{ padding: '16px 20px', display: 'flex', gap: 0 }}>
              {WORKFLOW_STAGES.map((stage, i) => {
                const count = notes.filter(n => n.status === stage.id).length
                const Icon  = stage.icon
                return (
                  <div key={stage.id} style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
                    <div style={{ flex: 1, textAlign: 'center', cursor: 'pointer' }}
                      onClick={() => { setView('list'); setStatusF(stage.id) }}>
                      <div style={{
                        width: 44, height: 44, borderRadius: '50%', margin: '0 auto 8px',
                        background: count > 0 ? STATUS_META[stage.id]?.bg : 'var(--c-bg)',
                        border: `2px solid ${count > 0 ? STATUS_META[stage.id]?.color : 'var(--c-border)'}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Icon size={18} color={count > 0 ? STATUS_META[stage.id]?.color : 'var(--c-text3)'} />
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-text)', marginBottom: 2 }}>{stage.label}</div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: count > 0 ? STATUS_META[stage.id]?.color : 'var(--c-text3)' }}>{count}</div>
                    </div>
                    {i < WORKFLOW_STAGES.length - 1 && (
                      <div style={{ width: 32, height: 2, background: 'var(--c-border)', flexShrink: 0 }} />
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div className="card-title">Recent Credit Notes</div>
              <button className="btn btn-ghost btn-sm" onClick={() => setView('list')}>View All →</button>
            </div>
            <CreditNoteTable notes={notes.slice(0, 8)} onApprove={id => approveMut.mutate(id)} onApply={id => applyMut.mutate(id)} onReject={id => rejectMut.mutate(id)} onDelete={id => window.confirm('Delete?') && deleteMut.mutate(id)} />
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="filter-bar" style={{ padding: '14px 20px', borderBottom: '1px solid var(--c-border)' }}>
            <div className="search-wrap" style={{ width: 260 }}>
              <Search className="search-icon" size={15} />
              <input className="form-input" style={{ paddingLeft: 34 }} placeholder="Search credit note, customer…"
                value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <select className="form-select select-sm" value={statusF} onChange={e => setStatusF(e.target.value)} style={{ width: 160 }}>
              <option value="all">All Statuses</option>
              {Object.entries(STATUS_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            <select className="form-select select-sm" value={reasonF} onChange={e => setReasonF(e.target.value)} style={{ width: 160 }}>
              <option value="all">All Reasons</option>
              {Object.entries(REASON_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            <div className="spacer" />
            <span style={{ fontSize: 12, color: 'var(--c-text3)' }}>{filtered.length} notes</span>
          </div>
          <CreditNoteTable notes={filtered} onApprove={id => approveMut.mutate(id)} onApply={id => applyMut.mutate(id)} onReject={id => rejectMut.mutate(id)} onDelete={id => window.confirm('Delete?') && deleteMut.mutate(id)} />
        </div>
      )}

      {showForm && (
        <CreditNoteForm
          onClose={() => setShowForm(false)}
          onSave={data => { createMut.mutate(data); setShowForm(false) }}
        />
      )}
    </div>
  )
}
