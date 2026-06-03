import { useState, useMemo, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { quotationsApi } from '@/api'
import { fmt } from '@/lib/utils'
import { useTopbarStore } from '@/store/topbarStore'
import { toast } from '@/store/toastStore'
import { PageLoading } from '@/components/ui'
import {
  TrendingUp, Clock, CheckCircle2, Plus,
  Search, AlertTriangle, BarChart3, DollarSign, Target,
  ChevronRight, Zap,
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'

import { STATUS_META, FUNNEL_STAGES, FUNNEL_COLORS } from './QuotationsShared'
import { AICard } from './QuotationsComponents'
import QuotationForm from './QuotationForm'
import QuoteTable from './QuoteTable'

export default function QuotationsPage() {
  const { setContext, setActions, clear } = useTopbarStore()
  const navigate   = useNavigate()
  const qc         = useQueryClient()
  const [view,     setView]     = useState('dashboard')
  const [search,   setSearch]   = useState('')
  const [statusF,  setStatusF]  = useState('all')
  const [showForm, setShowForm] = useState(false)

  const { data: quotes = [], isLoading: loadQ } = useQuery({ queryKey: ['quotations'],      queryFn: quotationsApi.list })
  const { data: stats,        isLoading: loadS } = useQuery({ queryKey: ['quotation-stats'], queryFn: quotationsApi.stats })

  const createMut  = useMutation({ mutationFn: quotationsApi.create,
    onSuccess: () => { qc.invalidateQueries(['quotations']); qc.invalidateQueries(['quotation-stats']); toast.success('Quotation created') },
    onError: e => toast.error(e.message) })
  const statusMut  = useMutation({ mutationFn: ({ id, status }) => quotationsApi.status(id, status),
    onSuccess: () => { qc.invalidateQueries(['quotations']); qc.invalidateQueries(['quotation-stats']) },
    onError: e => toast.error(e.message) })
  const convertMut = useMutation({ mutationFn: quotationsApi.convert,
    onSuccess: data => { qc.invalidateQueries(['quotations']); toast.success(`Converted → Invoice ${data.invoice_number}`); navigate(`/invoices/${data.invoice_id}`) },
    onError: e => toast.error(e.message) })
  const deleteMut  = useMutation({ mutationFn: quotationsApi.remove,
    onSuccess: () => { qc.invalidateQueries(['quotations']); qc.invalidateQueries(['quotation-stats']); toast.success('Deleted') } })

  const funnelData = useMemo(() => {
    const byStatus = {}
    quotes.forEach(q => {
      if (!byStatus[q.status]) byStatus[q.status] = { count: 0, value: 0 }
      byStatus[q.status].count++
      byStatus[q.status].value += Number(q.total || 0)
    })
    return FUNNEL_STAGES.map(s => ({
      stage: STATUS_META[s]?.label || s,
      count: byStatus[s]?.count || 0,
      value: byStatus[s]?.value || 0,
    }))
  }, [quotes])

  const filtered = useMemo(() => quotes.filter(q => {
    const matchStatus = statusF === 'all' || q.status === statusF
    const ql = search.toLowerCase()
    const matchSearch = !ql || q.number?.toLowerCase().includes(ql) ||
      q.customer_name?.toLowerCase().includes(ql) || q.salesperson?.toLowerCase().includes(ql)
    return matchStatus && matchSearch
  }), [quotes, statusF, search])

  const expiringSoon   = quotes.filter(q => q.valid_until && !['converted','rejected','expired'].includes(q.status) && new Date(q.valid_until) <= new Date(Date.now() + 7*86400000))
  const highProb       = quotes.filter(q => q.win_probability >= 70 && !['converted','rejected'].includes(q.status))
  const forecastValue  = quotes.filter(q => !['converted','rejected','expired'].includes(q.status))
    .reduce((s, q) => s + (Number(q.total||0) * (q.win_probability||50) / 100), 0)

  useEffect(() => {
    setContext('Sales', 'Quotations — Quote-to-Cash Pipeline')
    setActions(
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn btn-secondary btn-sm" onClick={() => setView(v => v === 'dashboard' ? 'list' : 'dashboard')}>
          {view === 'dashboard' ? <><BarChart3 size={13} /> List View</> : <><Target size={13} /> Dashboard</>}
        </button>
        <button className="btn btn-primary btn-sm" onClick={() => setShowForm(true)}>
          <Plus size={13} /> New Quotation
        </button>
      </div>
    )
    return clear
  }, [view, setContext, setActions, clear]) // eslint-disable-line

  if (loadQ || loadS) return <PageLoading />
  const t = stats?.totals || {}

  return (
    <div>
      {/* KPIs */}
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(6,1fr)', marginBottom: 20 }}>
        <div className="kpi-card blue">
          <div className="kpi-icon"><DollarSign size={18} /></div>
          <div className="kpi-label">Total Pipeline</div>
          <div className="kpi-value" style={{ fontSize: 16 }}>{fmt.currency(t.total_value || 0)}</div>
          <div className="kpi-sub">{t.total || 0} quotations</div>
        </div>
        <div className="kpi-card orange">
          <div className="kpi-icon"><Clock size={18} /></div>
          <div className="kpi-label">Pending Value</div>
          <div className="kpi-value" style={{ fontSize: 16 }}>{fmt.currency(t.pending_value || 0)}</div>
          <div className="kpi-sub">{t.pending_count || 0} open</div>
        </div>
        <div className="kpi-card green">
          <div className="kpi-icon"><CheckCircle2 size={18} /></div>
          <div className="kpi-label">Approved</div>
          <div className="kpi-value" style={{ fontSize: 16 }}>{t.approved_count || 0}</div>
          <div className="kpi-sub">Ready to convert</div>
        </div>
        <div className="kpi-card purple">
          <div className="kpi-icon"><Target size={18} /></div>
          <div className="kpi-label">Conversion Rate</div>
          <div className="kpi-value" style={{ fontSize: 16 }}>{t.conversion_rate || 0}%</div>
          <div className="kpi-sub">{t.converted_count || 0} converted</div>
        </div>
        <div className="kpi-card red">
          <div className="kpi-icon"><AlertTriangle size={18} /></div>
          <div className="kpi-label">Expiring ≤7d</div>
          <div className="kpi-value" style={{ fontSize: 16 }}>{stats?.expiring?.count || 0}</div>
          <div className="kpi-sub">{fmt.currency(stats?.expiring?.value || 0)}</div>
        </div>
        <div className="kpi-card green">
          <div className="kpi-icon"><TrendingUp size={18} /></div>
          <div className="kpi-label">AI Forecast</div>
          <div className="kpi-value" style={{ fontSize: 16 }}>{fmt.currency(forecastValue)}</div>
          <div className="kpi-sub">Weighted pipeline</div>
        </div>
      </div>

      {view === 'dashboard' ? (
        <div>
          <div className="responsive-grid cols-2-1" style={{ marginBottom: 20 }}>
            {/* Funnel chart */}
            <div className="card">
              <div className="card-header">
                <div className="card-title">Quote-to-Cash Funnel</div>
                <span style={{ fontSize: 11, color: 'var(--c-text3)' }}>Counts by pipeline stage</span>
              </div>
              <div style={{ padding: '16px 20px 12px' }}>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={funnelData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--c-border)" />
                    <XAxis dataKey="stage" tick={{ fontSize: 10, fill: 'var(--c-text3)' }} />
                    <YAxis tick={{ fontSize: 10, fill: 'var(--c-text3)' }} allowDecimals={false} />
                    <Tooltip formatter={(v) => [`${v} quotes`]} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    <Bar dataKey="count" radius={[4,4,0,0]}>
                      {funnelData.map((_, i) => <Cell key={i} fill={FUNNEL_COLORS[i]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
                  {funnelData.map((s, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'var(--c-bg)', border: '1px solid var(--c-border)', borderRadius: 8, padding: '4px 10px', fontSize: 11 }}>
                      <div style={{ width: 8, height: 8, borderRadius: 2, background: FUNNEL_COLORS[i] }} />
                      <span style={{ fontWeight: 600 }}>{s.stage}</span>
                      <ChevronRight size={10} color="var(--c-text3)" />
                      <span style={{ color: 'var(--c-text2)' }}>{s.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* AI Insights */}
            <div className="card">
              <div className="card-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#0a8754' }} />
                  <div className="card-title">AI Sales Insights</div>
                </div>
                <span style={{ fontSize: 9, fontWeight: 700, background: '#f3effe', color: '#6b3fd4', padding: '2px 8px', borderRadius: 99 }}>LIVE</span>
              </div>
              <div style={{ padding: '12px 16px' }}>
                {highProb.length > 0 && (
                  <AICard icon={Zap} color="#0a8754"
                    title={`${highProb.length} quote${highProb.length > 1 ? 's' : ''} likely to close`}
                    body={`${fmt.currency(highProb.reduce((s,q) => s + Number(q.total||0), 0))} in high-probability pipeline (win score ≥70%)`}
                    action="Review"
                  />
                )}
                {expiringSoon.length > 0 && (
                  <AICard icon={AlertTriangle} color="#d63d3d"
                    title={`${expiringSoon.length} quote${expiringSoon.length > 1 ? 's' : ''} expiring within 7 days`}
                    body={`${fmt.currency(expiringSoon.reduce((s,q) => s + Number(q.total||0), 0))} at risk — send follow-up reminders now`}
                    action="Follow Up"
                  />
                )}
                <AICard icon={TrendingUp} color="#1a6be8"
                  title="Weighted Revenue Forecast"
                  body={`${fmt.currency(forecastValue)} expected from active pipeline (probability-adjusted across all open quotes)`}
                />
                {(t.conversion_rate || 0) < 30 && quotes.length > 3 && (
                  <AICard icon={Target} color="#c97b10"
                    title="Conversion rate below benchmark"
                    body={`Current ${t.conversion_rate || 0}% vs industry avg 35% — review pricing strategy or follow-up frequency`}
                    action="Analyse"
                  />
                )}
                {quotes.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--c-text3)', fontSize: 13 }}>
                    Create your first quotation to unlock AI insights
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Recent table */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">Recent Quotations</div>
              <button className="btn btn-ghost btn-sm" onClick={() => setView('list')}>
                View All →
              </button>
            </div>
            <QuoteTable quotes={quotes.slice(0, 8)}
              onStatus={(id, s) => statusMut.mutate({ id, status: s })}
              onConvert={id => convertMut.mutate(id)}
              onDelete={id => window.confirm('Delete?') && deleteMut.mutate(id)}
            />
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="filter-bar" style={{ padding: '14px 20px', borderBottom: '1px solid var(--c-border)' }}>
            <div className="search-wrap" style={{ width: 280 }}>
              <Search className="search-icon" size={15} />
              <input className="form-input" style={{ paddingLeft: 34 }} placeholder="Search quote, customer…"
                value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div className="pill-tabs">
              {['all',...Object.keys(STATUS_META)].map(s => (
                <button key={s} className={`pill-tab${statusF === s ? ' active' : ''}`} onClick={() => setStatusF(s)}>
                  {s === 'all' ? 'ALL' : STATUS_META[s].label}
                </button>
              ))}
            </div>
            <div className="spacer" />
            <span style={{ fontSize: 12, color: 'var(--c-text3)' }}>{filtered.length} quotes</span>
          </div>
          <QuoteTable quotes={filtered}
            onStatus={(id, s) => statusMut.mutate({ id, status: s })}
            onConvert={id => convertMut.mutate(id)}
            onDelete={id => window.confirm('Delete?') && deleteMut.mutate(id)}
          />
        </div>
      )}

      {showForm && (
        <QuotationForm
          onClose={() => setShowForm(false)}
          onSave={data => { createMut.mutate(data); setShowForm(false) }}
        />
      )}
    </div>
  )
}
