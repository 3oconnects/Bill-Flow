import { useState, useMemo, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus, Search, Edit2, Trash2, TrendingDown, Receipt, Tag,
  Download, Calendar, ChevronDown, AlertCircle, CheckSquare, Square
} from 'lucide-react'
import { expensesApi, vendorsApi } from '@/api'
import { fmt, EXPENSE_CATEGORIES } from '@/lib/utils'
import { PageLoading, EmptyState, Spinner } from '@/components/ui'
import { toast } from '@/store/toastStore'
import { useTopbarStore } from '@/store/topbarStore'
import Modal from '@/components/Modal'
import { useForm } from 'react-hook-form'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts'

const COLORS = ['#6366f1','#10b981','#f59e0b','#ef4444','#0ea5e9','#8b5cf6','#ec4899','#f97316','#14b8a6','#64748b']

const DATE_TABS = [
  { id: 'all',          label: 'All Time' },
  { id: 'this_week',    label: 'This Week' },
  { id: 'this_month',   label: 'This Month' },
  { id: 'last_month',   label: 'Last Month' },
  { id: 'this_quarter', label: 'This Quarter' },
  { id: 'this_year',    label: 'This Year' },
  { id: 'custom',       label: 'Custom' },
]

function getDateRange(tab) {
  const now = new Date()
  const startOfDay = d => { d.setHours(0,0,0,0); return d }
  switch(tab) {
    case 'this_week': {
      const s = new Date(now); s.setDate(now.getDate() - now.getDay()); return [startOfDay(s), now]
    }
    case 'this_month': {
      return [new Date(now.getFullYear(), now.getMonth(), 1), now]
    }
    case 'last_month': {
      const s = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const e = new Date(now.getFullYear(), now.getMonth(), 0)
      return [s, e]
    }
    case 'this_quarter': {
      const q = Math.floor(now.getMonth() / 3)
      return [new Date(now.getFullYear(), q * 3, 1), now]
    }
    case 'this_year': {
      return [new Date(now.getFullYear(), 0, 1), now]
    }
    default: return [null, null]
  }
}

// ── Expense Form ──────────────────────────────────────────────────────────
function ExpenseForm({ initial, vendors, onSuccess, onCancel }) {
  const { register, handleSubmit, watch, formState: { isSubmitting, errors } } = useForm({
    defaultValues: initial
      ? { ...initial, date: initial.date?.split('T')[0] }
      : { gst_rate: 0, currency: 'INR', date: new Date().toISOString().split('T')[0] },
  })
  const mutation = useMutation({
    mutationFn: (data) => initial ? expensesApi.update(initial.id, data) : expensesApi.create(data),
    onSuccess,
    onError: (e) => toast.error(e.message),
  })
  const amount = parseFloat(watch('amount') || 0)
  const gstRate = parseFloat(watch('gst_rate') || 0)
  const gstAmt = amount * gstRate / 100

  return (
    <form onSubmit={handleSubmit(d => mutation.mutate(d))} style={{ padding: '0 4px' }}>
      {/* Description */}
      <div className="form-group" style={{ marginBottom: 16 }}>
        <label className="form-label">Description *</label>
        <input className="form-input" {...register('description', { required: true })} placeholder="What was this expense for?" />
        {errors.description && <div style={{ fontSize: 11, color: 'var(--c-danger)', marginTop: 4 }}>Required</div>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
        <div className="form-group">
          <label className="form-label">Amount (₹) *</label>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--c-text3)', fontWeight: 600 }}>₹</span>
            <input className="form-input" type="number" step="0.01" min="0" {...register('amount', { required: true })} placeholder="0.00" style={{ paddingLeft: 28 }} />
          </div>
          {errors.amount && <div style={{ fontSize: 11, color: 'var(--c-danger)', marginTop: 4 }}>Required</div>}
        </div>
        <div className="form-group">
          <label className="form-label">Date *</label>
          <input className="form-input" type="date" {...register('date', { required: true })} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
        <div className="form-group">
          <label className="form-label">Category</label>
          <select className="form-select" {...register('category')}>
            {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c.replace(/_/g,' ').replace(/\b\w/g,l=>l.toUpperCase())}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">GST Rate</label>
          <select className="form-select" {...register('gst_rate')}>
            {[0,5,12,18,28].map(r => <option key={r} value={r}>{r}% GST{r===0?' (Exempt)':''}</option>)}
          </select>
        </div>
      </div>

      {gstRate > 0 && (
        <div style={{ padding: '10px 14px', background: 'var(--c-primary-lt)', borderRadius: 8, marginBottom: 16, fontSize: 12 }}>
          <span style={{ color: 'var(--c-text3)' }}>Taxable: </span><strong>{fmt.currency(amount)}</strong>
          <span style={{ margin: '0 8px', color: 'var(--c-text3)' }}>+</span>
          <span style={{ color: 'var(--c-text3)' }}>GST ({gstRate}%): </span><strong style={{ color: 'var(--c-primary)' }}>{fmt.currency(gstAmt)}</strong>
          <span style={{ margin: '0 8px', color: 'var(--c-text3)' }}>=</span>
          <strong>{fmt.currency(amount + gstAmt)}</strong>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
        <div className="form-group">
          <label className="form-label">Vendor</label>
          <select className="form-select" {...register('vendor_id')}>
            <option value="">No vendor</option>
            {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Payment Method</label>
          <select className="form-select" {...register('payment_method')}>
            {['Cash','UPI','NEFT','RTGS','Cheque','Card','Bank Transfer'].map(m => <option key={m} value={m.toLowerCase().replace(' ','_')}>{m}</option>)}
          </select>
        </div>
      </div>

      <div className="form-group" style={{ marginBottom: 16 }}>
        <label className="form-label">Reference / Invoice #</label>
        <input className="form-input" {...register('reference')} placeholder="Vendor invoice or receipt number" style={{ fontFamily: 'monospace' }} />
      </div>

      <div className="form-group" style={{ marginBottom: 20 }}>
        <label className="form-label">Notes</label>
        <textarea className="form-input" {...register('notes')} rows={2} placeholder="Internal notes..." style={{ resize: 'vertical' }} />
      </div>

      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 16, borderTop: '1px solid var(--c-border)' }}>
        <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={isSubmitting} style={{ minWidth: 140 }}>
          {isSubmitting ? <Spinner size={14} /> : initial ? 'Update Expense' : 'Add Expense'}
        </button>
      </div>
    </form>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────
export default function ExpensesPage() {
  const qc = useQueryClient()
  const { setActions, setContext, clear } = useTopbarStore()
  const [search,         setSearch]         = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [dateTab,        setDateTab]        = useState('this_month')
  const [customFrom,     setCustomFrom]     = useState('')
  const [customTo,       setCustomTo]       = useState('')
  const [formOpen,       setFormOpen]       = useState(false)
  const [editing,        setEditing]        = useState(null)
  const [selected,       setSelected]       = useState(new Set())
  const [showChart,      setShowChart]      = useState(true)

  const { data: expenses = [], isLoading } = useQuery({ queryKey: ['expenses'], queryFn: expensesApi.list })
  const { data: vendors  = [] }            = useQuery({ queryKey: ['vendors'],  queryFn: vendorsApi.list })

  useEffect(() => {
    setContext('Expenses', 'Business Expenditures')
    setActions(
      <button className="btn btn-primary" onClick={() => { setEditing(null); setFormOpen(true) }}>
        <Plus size={15} /> Add Expense
      </button>
    )
    return clear
  }, [setActions, setContext, clear])

  const deleteMut = useMutation({
    mutationFn: expensesApi.remove,
    onSuccess: () => { qc.invalidateQueries(['expenses']); toast.success('Expense deleted') },
    onError: e => toast.error(e.message),
  })

  const handleExport = () => {
    const headers = ['Description','Date','Category','Amount','GST Rate','GST Amount','Vendor','Reference','Notes']
    const rows = filtered.map(e => [
      e.description, e.date?.split('T')[0], e.category,
      e.amount, e.gst_rate, (Number(e.amount)*Number(e.gst_rate)/100).toFixed(2),
      e.vendor_name||'', e.reference||'', e.notes||''
    ].map(v => `"${String(v||'').replace(/"/g,'""')}"`).join(','))
    const csv = [headers.join(','), ...rows].join('\n')
    const a = document.createElement('a')
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv)
    a.download = `expenses_${dateTab}.csv`
    a.click()
  }

  const handleBulkDelete = () => {
    if (!selected.size) return
    if (!window.confirm(`Delete ${selected.size} expense(s)?`)) return
    Promise.all([...selected].map(id => deleteMut.mutateAsync(id))).then(() => {
      setSelected(new Set())
      qc.invalidateQueries(['expenses'])
    })
  }

  // Date filtering
  const filtered = useMemo(() => {
    let [from, to] = dateTab === 'custom' ? [customFrom ? new Date(customFrom) : null, customTo ? new Date(customTo) : null] : getDateRange(dateTab)
    return expenses.filter(e => {
      const matchSearch = !search || e.description?.toLowerCase().includes(search.toLowerCase()) || e.vendor_name?.toLowerCase().includes(search.toLowerCase()) || e.reference?.toLowerCase().includes(search.toLowerCase())
      const matchCat = categoryFilter === 'all' || e.category === categoryFilter
      const d = new Date(e.date)
      const matchDate = (!from || d >= from) && (!to || d <= to)
      return matchSearch && matchCat && matchDate
    })
  }, [expenses, search, categoryFilter, dateTab, customFrom, customTo])

  // KPI calculations
  const now = new Date()
  const thisMonthExp = expenses.filter(e => { const d = new Date(e.date); return d.getMonth()===now.getMonth() && d.getFullYear()===now.getFullYear() })
  const lastMonthExp = expenses.filter(e => { const d = new Date(e.date); const lm = new Date(now.getFullYear(), now.getMonth()-1,1); return d.getMonth()===lm.getMonth() && d.getFullYear()===lm.getFullYear() })
  const thisMonthTotal = thisMonthExp.reduce((s,e)=>s+Number(e.amount||0),0)
  const lastMonthTotal = lastMonthExp.reduce((s,e)=>s+Number(e.amount||0),0)
  const monthChange = lastMonthTotal > 0 ? (((thisMonthTotal - lastMonthTotal)/lastMonthTotal)*100).toFixed(1) : 0
  const filteredTotal = filtered.reduce((s,e)=>s+Number(e.amount||0),0)
  const filteredGST   = filtered.reduce((s,e)=>s+Number(e.amount||0)*Number(e.gst_rate||0)/100,0)
  const usedCategories = [...new Set(expenses.map(e=>e.category).filter(Boolean))]

  // Chart data — monthly breakdown of filtered expenses
  const chartData = useMemo(() => {
    const byMonth = {}
    filtered.forEach(e => {
      const m = e.date?.slice(0,7)
      if (m) { byMonth[m] = (byMonth[m]||0) + Number(e.amount||0) }
    })
    return Object.entries(byMonth).sort(([a],[b])=>a.localeCompare(b)).map(([month, total]) => ({ month, total }))
  }, [filtered])

  const catChartData = useMemo(() => {
    const byCat = {}
    filtered.forEach(e => { byCat[e.category||'other'] = (byCat[e.category||'other']||0) + Number(e.amount||0) })
    return Object.entries(byCat).sort(([,a],[,b])=>b-a).map(([category,total]) => ({ category: category.replace(/_/g,' '), total }))
  }, [filtered])

  const toggleSelect = id => setSelected(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n })
  const toggleAll   = () => setSelected(p => p.size === filtered.length ? new Set() : new Set(filtered.map(e=>e.id)))

  if (isLoading) return <PageLoading/>

  return (
    <div>
      {/* KPI Cards */}
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: 20 }}>
        <div className="kpi-card red">
          <div className="kpi-icon"><TrendingDown size={20}/></div>
          <div className="kpi-label">This Month</div>
          <div className="kpi-value">{fmt.currency(thisMonthTotal)}</div>
          <div className="kpi-sub" style={{ color: Number(monthChange) > 0 ? 'var(--c-danger)' : 'var(--c-green)' }}>
            {Number(monthChange) > 0 ? '↑' : '↓'} {Math.abs(monthChange)}% vs last month
          </div>
        </div>
        <div className="kpi-card orange">
          <div className="kpi-icon"><Calendar size={20}/></div>
          <div className="kpi-label">Last Month</div>
          <div className="kpi-value">{fmt.currency(lastMonthTotal)}</div>
          <div className="kpi-sub">{lastMonthExp.length} expenses</div>
        </div>
        <div className="kpi-card blue">
          <div className="kpi-icon"><Receipt size={20}/></div>
          <div className="kpi-label">GST Reclaimable</div>
          <div className="kpi-value">{fmt.currency(filteredGST)}</div>
          <div className="kpi-sub">Input tax credit (filtered)</div>
        </div>
        <div className="kpi-card purple">
          <div className="kpi-icon"><Tag size={20}/></div>
          <div className="kpi-label">Categories Used</div>
          <div className="kpi-value">{usedCategories.length}</div>
          <div className="kpi-sub">{expenses.length} total expenses</div>
        </div>
      </div>

      {/* Charts row */}
      {showChart && filtered.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16, marginBottom: 20 }}>
          <div className="card" style={{ padding: '18px 20px 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>Monthly Spend</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--c-red)' }}>{fmt.currency(filteredTotal)}</div>
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={chartData} margin={{ top: 0, right: 10, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--c-border)" vertical={false}/>
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--c-text3)' }} axisLine={false} tickLine={false} dy={6}/>
                <YAxis tick={{ fontSize: 10, fill: 'var(--c-text3)' }} tickFormatter={v=>`₹${(v/1000).toFixed(0)}k`} axisLine={false} tickLine={false}/>
                <Tooltip formatter={(v) => [fmt.currency(v), 'Expenses']} labelStyle={{ fontWeight: 700 }}/>
                <Bar dataKey="total" fill="#ef4444" radius={[4,4,0,0]} barSize={28}/>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="card" style={{ padding: '18px 20px 20px' }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14 }}>By Category</div>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={catChartData.slice(0,6)} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="total" nameKey="category" paddingAngle={3}>
                  {catChartData.map((_,i) => <Cell key={i} fill={COLORS[i%COLORS.length]} stroke="none"/>)}
                </Pie>
                <Tooltip formatter={(v) => fmt.currency(v)}/>
              </PieChart>
            </ResponsiveContainer>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 12px', marginTop: 6 }}>
              {catChartData.slice(0,6).map((c,i) => (
                <div key={c.category} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, fontWeight: 600, color: 'var(--c-text2)' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: COLORS[i%COLORS.length] }}/>
                  {c.category}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Filter bar */}
      <div className="tabs" style={{ marginBottom: 0 }}>
        {DATE_TABS.map(t => (
          <button key={t.id} className={'tab-btn' + (dateTab===t.id?' active':'')} onClick={() => setDateTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {dateTab === 'custom' && (
        <div style={{ display: 'flex', gap: 12, padding: '12px 0', alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: 'var(--c-text3)', fontWeight: 600 }}>From</span>
          <input type="date" className="form-input sm" style={{ width: 160 }} value={customFrom} onChange={e=>setCustomFrom(e.target.value)}/>
          <span style={{ fontSize: 12, color: 'var(--c-text3)', fontWeight: 600 }}>To</span>
          <input type="date" className="form-input sm" style={{ width: 160 }} value={customTo} onChange={e=>setCustomTo(e.target.value)}/>
        </div>
      )}

      <div className="card" style={{ marginTop: 16 }}>
        {/* Search + category + actions bar */}
        <div className="filter-bar" style={{ padding: '14px 20px', borderBottom: '1px solid var(--c-border)' }}>
          <div className="search-wrap" style={{ width: 300 }}>
            <Search className="search-icon" size={15}/>
            <input className="form-input" style={{ paddingLeft: 34 }} placeholder="Search description, vendor, ref..." value={search} onChange={e=>setSearch(e.target.value)}/>
          </div>
          <select className="form-select sm" style={{ width: 180 }} value={categoryFilter} onChange={e=>setCategoryFilter(e.target.value)}>
            <option value="all">All Categories</option>
            {usedCategories.map(c => <option key={c} value={c}>{c.replace(/_/g,' ').replace(/\b\w/g,l=>l.toUpperCase())}</option>)}
          </select>
          <div className="spacer"/>
          {selected.size > 0 && (
            <button className="btn btn-ghost" style={{ color: 'var(--c-danger)', border: '1px solid var(--c-danger)' }} onClick={handleBulkDelete}>
              <Trash2 size={14}/> Delete {selected.size} selected
            </button>
          )}
          <button className="btn btn-ghost" onClick={handleExport} title="Export CSV" style={{ gap: 6 }}>
            <Download size={15}/> Export
          </button>
          <button className="btn btn-ghost" onClick={() => setShowChart(s=>!s)} style={{ gap: 6 }}>
            {showChart ? 'Hide' : 'Show'} Chart
          </button>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon={<TrendingDown size={48}/>}
            title={expenses.length === 0 ? 'No expenses yet' : 'No expenses match your filters'}
            description={expenses.length === 0 ? 'Start tracking your business expenditures.' : 'Try changing the date range or category filter.'}
            action={expenses.length === 0 && <button className="btn btn-primary" onClick={() => { setEditing(null); setFormOpen(true) }}><Plus size={15}/> Add Expense</button>}
          />
        ) : (
          <div className="table-wrap">
            <table className="compact">
              <thead>
                <tr>
                  <th style={{ width: 40, textAlign: 'center' }}>
                    <button style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={toggleAll}>
                      {selected.size === filtered.length && filtered.length > 0 ? <CheckSquare size={15} color="var(--c-primary)"/> : <Square size={15} color="var(--c-text3)"/>}
                    </button>
                  </th>
                  <th>Description</th>
                  <th>Date</th>
                  <th>Category</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                  <th style={{ textAlign: 'right' }}>GST</th>
                  <th>Vendor</th>
                  <th>Method</th>
                  <th>Reference</th>
                  <th style={{ width: 70 }}></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((e, i) => {
                  const gstAmt = Number(e.amount) * Number(e.gst_rate||0) / 100
                  const isSelected = selected.has(e.id)
                  return (
                    <tr key={e.id} style={{ background: isSelected ? 'var(--c-primary-lt)' : i%2===0 ? 'transparent' : 'var(--c-surface2)', cursor: 'default' }}>
                      <td style={{ textAlign: 'center' }}>
                        <button style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => toggleSelect(e.id)}>
                          {isSelected ? <CheckSquare size={14} color="var(--c-primary)"/> : <Square size={14} color="var(--c-text3)"/>}
                        </button>
                      </td>
                      <td style={{ fontWeight: 600 }}>{e.description}</td>
                      <td style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--c-text2)' }}>{fmt.date(e.date)}</td>
                      <td>
                        <span style={{ padding: '3px 10px', borderRadius: 999, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', background: 'var(--c-surface2)', color: 'var(--c-text2)' }}>
                          {e.category?.replace(/_/g,' ')}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--c-red)', fontFamily: 'monospace' }}>{fmt.currency(e.amount)}</td>
                      <td style={{ textAlign: 'right', fontFamily: 'monospace', color: gstAmt > 0 ? 'var(--c-primary)' : 'var(--c-text3)' }}>
                        {gstAmt > 0 ? fmt.currency(gstAmt) : '—'}
                      </td>
                      <td style={{ color: 'var(--c-text2)', fontSize: 12 }}>{e.vendor_name || '—'}</td>
                      <td style={{ fontSize: 11, color: 'var(--c-text3)', textTransform: 'capitalize' }}>{e.payment_method?.replace(/_/g,' ') || '—'}</td>
                      <td style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--c-text3)' }}>{e.reference || '—'}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button className="topbar-icon-btn" onClick={() => { setEditing(e); setFormOpen(true) }} title="Edit"><Edit2 size={13}/></button>
                          <button className="topbar-icon-btn" style={{ color: 'var(--c-danger)' }} onClick={() => window.confirm('Delete?') && deleteMut.mutate(e.id)} title="Delete"><Trash2 size={13}/></button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              {/* Totals footer */}
              <tfoot>
                <tr style={{ borderTop: '2px solid var(--c-border)', background: 'var(--c-surface2)', fontWeight: 700 }}>
                  <td colSpan={4} style={{ padding: '10px 14px', fontSize: 12 }}>
                    {filtered.length} expense{filtered.length!==1?'s':''} {selected.size>0&&`(${selected.size} selected)`}
                  </td>
                  <td style={{ textAlign: 'right', padding: '10px 14px', fontFamily: 'monospace', color: 'var(--c-red)', fontSize: 14 }}>{fmt.currency(filteredTotal)}</td>
                  <td style={{ textAlign: 'right', padding: '10px 14px', fontFamily: 'monospace', color: 'var(--c-primary)', fontSize: 13 }}>{fmt.currency(filteredGST)}</td>
                  <td colSpan={4}/>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {formOpen && (
        <Modal title={editing ? 'Edit Expense' : 'Add Expense'} onClose={() => setFormOpen(false)} size="md">
          <ExpenseForm
            initial={editing}
            vendors={vendors}
            onSuccess={() => { setFormOpen(false); qc.invalidateQueries(['expenses']); toast.success(editing ? 'Expense updated' : 'Expense added') }}
            onCancel={() => setFormOpen(false)}
          />
        </Modal>
      )}
    </div>
  )
}
