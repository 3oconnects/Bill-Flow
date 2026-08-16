import { useState, useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { expensesApi } from '@/api'
import { fmt, EXPENSE_CATEGORIES } from '@/lib/utils'
import { PageLoading } from '@/components/ui'
import { useTopbarStore } from '@/store/topbarStore'
import { Target, TrendingDown, AlertCircle, CheckCircle2, Plus, Edit2, Check, X } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'

const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => {
  const d = new Date(); d.setMonth(d.getMonth() - 6 + i)
  return { value: `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`, label: d.toLocaleString('default',{month:'long', year:'numeric'}) }
})

const CAT_COLORS = {
  rent:'#6366f1', utilities:'#0ea5e9', salaries:'#10b981', marketing:'#f59e0b',
  transport:'#f97316', office_supplies:'#8b5cf6', travel:'#ec4899', maintenance:'#14b8a6',
  insurance:'#64748b', legal:'#ef4444', subscriptions:'#06b6d4', bank_charges:'#84cc16', other:'#94a3b8'
}

function BudgetRow({ category, budget, actual, onEdit }) {
  const pct = budget > 0 ? Math.min((actual / budget) * 100, 100) : 0
  const over = actual > budget && budget > 0
  const color = over ? '#ef4444' : pct > 80 ? '#f59e0b' : '#10b981'
  const catColor = CAT_COLORS[category] || '#6366f1'

  return (
    <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--c-border)', display: 'flex', alignItems: 'center', gap: 16 }}>
      {/* Category */}
      <div style={{ width: 160, display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: catColor, flexShrink: 0 }}/>
        <span style={{ fontWeight: 600, fontSize: 13, textTransform: 'capitalize' }}>{category.replace(/_/g,' ')}</span>
      </div>

      {/* Progress bar */}
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
          <span style={{ fontSize: 11, color: 'var(--c-text3)', fontWeight: 600 }}>
            {fmt.currency(actual)} spent {budget > 0 ? `of ${fmt.currency(budget)}` : '(no budget set)'}
          </span>
          {budget > 0 && (
            <span style={{ fontSize: 11, fontWeight: 700, color }}>
              {over ? `${((actual-budget)/budget*100).toFixed(0)}% over` : `${pct.toFixed(0)}% used`}
            </span>
          )}
        </div>
        <div style={{ height: 8, background: 'var(--c-border)', borderRadius: 4, overflow: 'hidden' }}>
          <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 4, transition: 'width 0.4s ease' }}/>
        </div>
      </div>

      {/* Status icon */}
      <div style={{ width: 28, flexShrink: 0, display: 'flex', justifyContent: 'center' }}>
        {budget === 0 ? <span style={{ fontSize: 11, color: 'var(--c-text3)' }}>—</span>
          : over ? <AlertCircle size={18} color="#ef4444"/>
          : pct >= 80 ? <AlertCircle size={18} color="#f59e0b"/>
          : <CheckCircle2 size={18} color="#10b981"/>}
      </div>

      {/* Budget amount + edit */}
      <div style={{ width: 120, textAlign: 'right', flexShrink: 0 }}>
        <button className="btn btn-ghost btn-sm" onClick={() => onEdit(category)} style={{ gap: 5, fontSize: 12 }}>
          <Edit2 size={12}/> {budget > 0 ? fmt.currency(budget) : 'Set Budget'}
        </button>
      </div>
    </div>
  )
}

function BudgetEditModal({ category, current, onSave, onClose }) {
  const [value, setValue] = useState(current || '')
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{ background: 'var(--c-surface)', borderRadius: 14, padding: 24, width: 340, boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>Set Monthly Budget</div>
        <div style={{ fontSize: 13, color: 'var(--c-text3)', marginBottom: 16, textTransform: 'capitalize' }}>{category?.replace(/_/g,' ')}</div>
        <div style={{ position: 'relative', marginBottom: 20 }}>
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--c-text3)', fontWeight: 600 }}>₹</span>
          <input
            className="form-input"
            type="number" step="100" min="0"
            value={value}
            onChange={e=>setValue(e.target.value)}
            placeholder="e.g. 50000"
            style={{ paddingLeft: 28, fontSize: 18, fontWeight: 700 }}
            autoFocus
            onKeyDown={e=>e.key==='Enter'&&onSave(category, parseFloat(value)||0)}
          />
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-ghost" style={{ flex: 1 }} onClick={onClose}><X size={14}/> Cancel</button>
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={()=>onSave(category, parseFloat(value)||0)}><Check size={14}/> Save</button>
        </div>
        {current > 0 && (
          <button style={{ width: '100%', marginTop: 10, background: 'none', border: 'none', color: 'var(--c-danger)', fontSize: 12, cursor: 'pointer', padding: '6px 0' }}
            onClick={()=>onSave(category, 0)}>Remove budget</button>
        )}
      </div>
    </div>
  )
}

export default function BudgetPage() {
  const { setActions, setContext, clear } = useTopbarStore()
  const now = new Date()
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`
  const [selectedMonth, setSelectedMonth] = useState(currentMonth)
  const [budgets, setBudgets] = useState(() => {
    try { return JSON.parse(localStorage.getItem('ozofibooks_budgets') || '{}') } catch { return {} }
  })
  const [editingCat, setEditingCat] = useState(null)

  const { data: expenses = [], isLoading } = useQuery({ queryKey: ['expenses'], queryFn: expensesApi.list })

  useEffect(() => {
    setContext('Finance', 'Budget Planner')
    setActions(null)
    return clear
  }, [setActions, setContext, clear])

  const saveBudget = (category, amount) => {
    const key = `${selectedMonth}_${category}`
    const updated = { ...budgets, [key]: amount }
    setBudgets(updated)
    localStorage.setItem('ozofibooks_budgets', JSON.stringify(updated))
    setEditingCat(null)
  }

  const getBudget = (category) => budgets[`${selectedMonth}_${category}`] || 0

  // Filter expenses to selected month
  const monthExpenses = useMemo(() =>
    expenses.filter(e => e.date?.slice(0,7) === selectedMonth),
    [expenses, selectedMonth])

  // Actual spend per category for selected month
  const actualByCategory = useMemo(() => {
    const acc = {}
    monthExpenses.forEach(e => { acc[e.category||'other'] = (acc[e.category||'other']||0) + Number(e.amount||0) })
    return acc
  }, [monthExpenses])

  const totalBudget = EXPENSE_CATEGORIES.reduce((s,c) => s + getBudget(c), 0)
  const totalActual = monthExpenses.reduce((s,e) => s + Number(e.amount||0), 0)
  const overBudget  = EXPENSE_CATEGORIES.filter(c => getBudget(c) > 0 && (actualByCategory[c]||0) > getBudget(c))
  const nearLimit   = EXPENSE_CATEGORIES.filter(c => getBudget(c) > 0 && (actualByCategory[c]||0) / getBudget(c) >= 0.8 && (actualByCategory[c]||0) <= getBudget(c))

  const chartData = EXPENSE_CATEGORIES
    .filter(c => getBudget(c) > 0 || (actualByCategory[c]||0) > 0)
    .map(c => ({ name: c.replace(/_/g,' '), budget: getBudget(c), actual: actualByCategory[c]||0 }))
    .sort((a,b) => b.budget - a.budget)

  if (isLoading) return <PageLoading/>

  return (
    <div>
      {/* Header + month picker */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>Budget Planner</div>
          <div style={{ fontSize: 13, color: 'var(--c-text3)', marginTop: 2 }}>Set monthly spending limits per category and track actuals</div>
        </div>
        <select className="form-select" style={{ width: 200 }} value={selectedMonth} onChange={e=>setSelectedMonth(e.target.value)}>
          {MONTH_OPTIONS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>
      </div>

      {/* KPI strip */}
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: 20 }}>
        <div className="kpi-card blue">
          <div className="kpi-icon"><Target size={20}/></div>
          <div className="kpi-label">Total Budget</div>
          <div className="kpi-value">{totalBudget > 0 ? fmt.currency(totalBudget) : '—'}</div>
          <div className="kpi-sub">{EXPENSE_CATEGORIES.filter(c=>getBudget(c)>0).length} categories set</div>
        </div>
        <div className="kpi-card red">
          <div className="kpi-icon"><TrendingDown size={20}/></div>
          <div className="kpi-label">Actual Spend</div>
          <div className="kpi-value">{fmt.currency(totalActual)}</div>
          <div className="kpi-sub">{monthExpenses.length} expenses</div>
        </div>
        <div className={`kpi-card ${totalBudget > 0 && totalActual > totalBudget ? 'red' : 'green'}`}>
          <div className="kpi-icon"><CheckCircle2 size={20}/></div>
          <div className="kpi-label">{totalActual > totalBudget ? 'Over Budget' : 'Remaining'}</div>
          <div className="kpi-value">{totalBudget > 0 ? fmt.currency(Math.abs(totalBudget - totalActual)) : '—'}</div>
          <div className="kpi-sub">{totalBudget > 0 ? `${((totalActual/totalBudget)*100).toFixed(0)}% of budget used` : 'No budget set'}</div>
        </div>
        <div className={`kpi-card ${overBudget.length > 0 ? 'red' : 'orange'}`}>
          <div className="kpi-icon"><AlertCircle size={20}/></div>
          <div className="kpi-label">Alerts</div>
          <div className="kpi-value">{overBudget.length + nearLimit.length}</div>
          <div className="kpi-sub">{overBudget.length} over • {nearLimit.length} near limit</div>
        </div>
      </div>

      {/* Alerts */}
      {overBudget.length > 0 && (
        <div style={{ padding: '12px 16px', background: '#fee2e2', borderRadius: 10, marginBottom: 16, border: '1px solid #fca5a5', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <AlertCircle size={18} color="#ef4444" style={{ flexShrink: 0, marginTop: 1 }}/>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13, color: '#991b1b' }}>Over budget in {overBudget.length} categor{overBudget.length===1?'y':'ies'}</div>
            <div style={{ fontSize: 12, color: '#7f1d1d', marginTop: 2 }}>
              {overBudget.map(c => `${c.replace(/_/g,' ')} (+${fmt.currency((actualByCategory[c]||0)-getBudget(c))})`).join(' · ')}
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 16, alignItems: 'flex-start' }}>
        {/* Budget rows */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--c-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>Category Budgets</div>
            <div style={{ fontSize: 11, color: 'var(--c-text3)' }}>Click "Set Budget" to configure</div>
          </div>
          {EXPENSE_CATEGORIES.map(cat => (
            <BudgetRow
              key={cat}
              category={cat}
              budget={getBudget(cat)}
              actual={actualByCategory[cat]||0}
              onEdit={setEditingCat}
            />
          ))}
        </div>

        {/* Chart */}
        <div className="card" style={{ padding: '18px 20px 20px' }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 16 }}>Budget vs Actual</div>
          {chartData.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--c-text3)' }}>
              <Target size={32} style={{ margin: '0 auto 8px', display: 'block', opacity: 0.3 }}/>
              <div style={{ fontSize: 13 }}>Set budgets to see comparison</div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={chartData} layout="vertical" margin={{ left: 0, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--c-border)" horizontal={false}/>
                <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--c-text3)' }} tickFormatter={v=>`₹${(v/1000).toFixed(0)}k`} axisLine={false} tickLine={false}/>
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: 'var(--c-text3)' }} width={80} axisLine={false} tickLine={false}/>
                <Tooltip formatter={(v,n) => [fmt.currency(v), n==='budget'?'Budget':'Actual']}/>
                <Bar dataKey="budget" name="Budget" fill="#e0e7ff" radius={[0,4,4,0]} barSize={10}/>
                <Bar dataKey="actual" name="Actual" radius={[0,4,4,0]} barSize={10}>
                  {chartData.map((d,i) => <Cell key={i} fill={d.actual > d.budget && d.budget > 0 ? '#ef4444' : '#6366f1'}/>)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {editingCat && (
        <BudgetEditModal
          category={editingCat}
          current={getBudget(editingCat)}
          onSave={saveBudget}
          onClose={() => setEditingCat(null)}
        />
      )}
    </div>
  )
}
