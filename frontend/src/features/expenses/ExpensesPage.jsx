import { useState, useMemo, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Search, Edit2, Trash2, TrendingDown, Landmark, Receipt, Tag } from 'lucide-react'
import { expensesApi, vendorsApi } from '@/api'
import { fmt, EXPENSE_CATEGORIES } from '@/lib/utils'
import { PageLoading, EmptyState, Spinner } from '@/components/ui'
import { toast } from '@/store/toastStore'
import { useTopbarStore } from '@/store/topbarStore'
import Modal from '@/components/Modal'
import { useForm } from 'react-hook-form'

function ExpenseForm({ initial, vendors, onSuccess, onCancel }) {
  const { register, handleSubmit, formState: { isSubmitting } } = useForm({
    defaultValues: initial
      ? { ...initial, date: initial.date?.split('T')[0] }
      : { gst_rate: 0, currency: 'INR', date: new Date().toISOString().split('T')[0] },
  })
  const mutation = useMutation({
    mutationFn: (data) => initial ? expensesApi.update(initial.id, data) : expensesApi.create(data),
    onSuccess,
    onError: (e) => toast.error(e.message),
  })

  return (
    <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="expense-form-compact">
      <div className="form-group">
        <label className="form-label">DESCRIPTION *</label>
        <input className="form-input input-sm" {...register('description', { required: true })} placeholder="What was this expense for?" />
      </div>

      <div className="form-row cols-2 compact" style={{ marginTop: 12 }}>
        <div className="form-group">
          <label className="form-label">AMOUNT (₹) *</label>
          <div style={{ position: 'relative' }}>
             <input className="form-input input-sm" type="number" step="0.01" {...register('amount', { required: true })} placeholder="0.00" style={{ paddingLeft: 28 }} />
             <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: 'var(--c-text3)' }}>₹</span>
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">DATE *</label>
          <input className="form-input input-sm" type="date" {...register('date', { required: true })} />
        </div>
      </div>

      <div className="form-row cols-2 compact" style={{ marginTop: 12 }}>
        <div className="form-group">
          <label className="form-label">CATEGORY</label>
          <select className="form-select select-sm" {...register('category')}>
            {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{c.replace(/_/g, ' ').toUpperCase()}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">GST RATE (%)</label>
          <select className="form-select select-sm" {...register('gst_rate')}>
            {[0, 5, 12, 18, 28].map((r) => <option key={r} value={r}>{r}% GST</option>)}
          </select>
        </div>
      </div>

      <div className="form-row cols-2 compact" style={{ marginTop: 12 }}>
        <div className="form-group">
          <label className="form-label">VENDOR</label>
          <select className="form-select select-sm" {...register('vendor_id')}>
            <option value="">No vendor</option>
            {vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">REFERENCE #</label>
          <input className="form-input input-sm mono" {...register('reference')} placeholder="Invoice / receipt number" />
        </div>
      </div>

      <div className="form-group" style={{ marginTop: 12 }}>
        <label className="form-label">INTERNAL NOTES</label>
        <textarea className="form-textarea input-sm" {...register('notes')} rows={2} placeholder="Add any private notes here..." />
      </div>

      <div className="modal-footer-actions" style={{ marginTop: 24, padding: '16px 0 0', borderTop: '1px solid var(--c-border)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn btn-primary" style={{ minWidth: 140, fontWeight: 700 }} disabled={isSubmitting}>
          {isSubmitting ? <Spinner size={14} /> : initial ? 'Update Expense' : 'Add Expense'}
        </button>
      </div>
    </form>
  )
}

export default function ExpensesPage() {
  const qc = useQueryClient()
  const { setActions, setContext, clear } = useTopbarStore()
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)

  const { data: expenses = [], isLoading } = useQuery({ queryKey: ['expenses'], queryFn: expensesApi.list })
  const { data: vendors = [] } = useQuery({ queryKey: ['vendors'], queryFn: vendorsApi.list })

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
    onError: (e) => toast.error(e.message),
  })

  const filtered = useMemo(() => expenses.filter((e) => {
    const matchCat = categoryFilter === 'all' || e.category === categoryFilter
    const matchSearch = !search || e.description?.toLowerCase().includes(search.toLowerCase()) ||
      e.vendor_name?.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  }), [expenses, search, categoryFilter])

  const total = filtered.reduce((s, e) => s + Number(e.amount || 0), 0)
  const usedCategories = [...new Set(expenses.map((e) => e.category).filter(Boolean))]

  if (isLoading) return <PageLoading />

  return (
    <div className="expenses-container">
      {/* KPI Grid */}
      <div className="kpi-grid">
        <div className="kpi-card red">
          <div className="kpi-icon"><TrendingDown size={20} /></div>
          <div className="kpi-label">Total Expenses</div>
          <div className="kpi-value">{fmt.currency(total)}</div>
          <div className="kpi-sub">{filtered.length} records in view</div>
        </div>
        <div className="kpi-card blue">
          <div className="kpi-icon"><Receipt size={20} /></div>
          <div className="kpi-label">GST Reclaimable</div>
          <div className="kpi-value">{fmt.currency(filtered.reduce((s, e) => s + (Number(e.amount) * (Number(e.gst_rate) / 100)), 0))}</div>
          <div className="kpi-sub">Estimated tax credits</div>
        </div>
        <div className="kpi-card purple">
          <div className="kpi-icon"><Tag size={20} /></div>
          <div className="kpi-label">Categories</div>
          <div className="kpi-value">{usedCategories.length}</div>
          <div className="kpi-sub">Expense classifications</div>
        </div>
      </div>

      <div className="card">
        <div className="filter-bar" style={{ padding: '16px 20px', borderBottom: '1px solid var(--c-border)' }}>
          <div className="search-wrap" style={{ width: 320 }}>
            <Search className="search-icon" />
            <input className="form-input" style={{ paddingLeft: 34 }} placeholder="Search expenses..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="spacer" />
          <div className="form-group m0">
             <select className="form-select select-sm" style={{ width: 180 }} value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                <option value="all">All Categories</option>
                {usedCategories.map((c) => <option key={c} value={c}>{c.replace(/_/g, ' ').toUpperCase()}</option>)}
             </select>
          </div>
          <button className="btn btn-ghost" style={{ gap: 8 }} onClick={() => { setEditing(null); setFormOpen(true) }}>
             <Plus size={15} /> Add Expense
          </button>
        </div>

        {filtered.length === 0 ? (
          <EmptyState 
            icon={<TrendingDown size={48} />} 
            title="No expenses found"
            action={<button className="btn btn-primary" onClick={() => { setEditing(null); setFormOpen(true) }}><Plus size={15} /> Add Expense</button>} 
          />
        ) : (
          <div className="table-wrap">
            <table className="compact">
              <thead>
                <tr>
                  <th>DESCRIPTION</th>
                  <th>DATE</th>
                  <th>CATEGORY</th>
                  <th className="right">AMOUNT</th>
                  <th className="right">GST AMT</th>
                  <th>VENDOR</th>
                  <th>REFERENCE</th>
                  <th style={{ width: 80 }}></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((e) => {
                  const gstAmt = Number(e.amount) * (Number(e.gst_rate) / 100)
                  return (
                    <tr key={e.id}>
                      <td style={{ fontWeight: 600 }}>{e.description}</td>
                      <td className="mono" style={{ fontSize: 12 }}>{fmt.date(e.date)}</td>
                      <td>
                        <span className="badge badge-neutral" style={{ textTransform: 'uppercase', fontSize: 10 }}>
                          {e.category?.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="right" style={{ fontWeight: 700, color: 'var(--c-red)' }}>{fmt.currency(e.amount)}</td>
                      <td className="right" style={{ color: 'var(--c-text3)' }}>{e.gst_rate > 0 ? fmt.currency(gstAmt) : '—'}</td>
                      <td style={{ color: 'var(--c-text2)' }}>{e.vendor_name || '—'}</td>
                      <td className="mono" style={{ fontSize: 11, color: 'var(--c-text3)' }}>{e.reference || '—'}</td>
                      <td>
                        <div className="tbl-actions">
                          <button className="topbar-icon-btn" onClick={() => { setEditing(e); setFormOpen(true) }} title="Edit">
                            <Edit2 size={13} />
                          </button>
                          <button className="topbar-icon-btn red" title="Delete"
                            onClick={() => window.confirm('Delete this expense?') && deleteMut.mutate(e.id)}>
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {formOpen && (
        <Modal title={editing ? 'Edit Expense' : 'Add Expense'} onClose={() => setFormOpen(false)} size="md">
          <ExpenseForm
            initial={editing}
            vendors={vendors}
            onSuccess={() => {
              setFormOpen(false)
              qc.invalidateQueries(['expenses'])
              toast.success(editing ? 'Expense updated' : 'Expense added')
            }}
            onCancel={() => setFormOpen(false)}
          />
        </Modal>
      )}
    </div>
  )
}
