import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { reportsApi } from '@/api'
import { fmt } from '@/lib/utils'
import { PageLoading, Badge } from '@/components/ui'
import { useTopbarStore } from '@/store/topbarStore'
import {
  TrendingUp, TrendingDown, BarChart2, ChevronLeft,
  FileText, Clock, DollarSign, ShieldCheck, Receipt, PieChart as PieIcon, AlertCircle
} from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, Legend, AreaChart, Area
} from 'recharts'

const COLORS = ['#2563eb','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#ec4899','#f97316']

const NAV = [
  { id: 'overview',   label: 'Overview',           icon: BarChart2,   group: 'Summary' },
  { id: 'pl',         label: 'P&L Statement',      icon: TrendingUp,  group: 'Financial Statements' },
  { id: 'balance',    label: 'Balance Sheet',      icon: PieIcon,     group: 'Financial Statements' },
  { id: 'trial',      label: 'Trial Balance',      icon: FileText,    group: 'Financial Statements' },
  { id: 'aged',       label: 'Aged Receivables',   icon: Clock,       group: 'Receivables & Payables' },
  { id: 'apaging',    label: 'A/P Aging',          icon: AlertCircle, group: 'Receivables & Payables' },
  { id: 'cashflow',   label: 'Cash Flow',          icon: DollarSign,  group: 'Cash Reports' },
  { id: 'gst',        label: 'GST Summary',        icon: ShieldCheck, group: 'Tax Reports' },
  { id: 'expenses',   label: 'Expense Analytics',  icon: Receipt,     group: 'Expense Reports' },
]

const Tip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: 8, padding: '10px 14px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
      <div style={{ fontSize: 11, color: 'var(--c-text3)', marginBottom: 6, fontWeight: 700 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ fontSize: 12, color: p.color, fontWeight: 700, marginBottom: 2 }}>
          {p.name}: {typeof p.value === 'number' && p.value > 100 ? fmt.currency(p.value) : p.value}
        </div>
      ))}
    </div>
  )
}

// ── OVERVIEW ─────────────────────────────────────────────────────────────
function OverviewSection({ s }) {
  const totalRev = Number(s.totalRevenue || 0)
  const totalExp = Number(s.totalExpenses || 0)
  const netProfit = totalRev - totalExp
  const outstanding = Number(s.outstanding || 0)

  const chartData = (s.monthlyRevenue || []).map(r => {
    const exp = (s.monthlyExpenses || []).find(e => e.month === r.month)
    return { month: r.month?.slice(0,7), revenue: Number(r.total||0), expenses: Number(exp?.total||0), profit: Number(r.total||0) - Number(exp?.total||0) }
  }).reverse()

  const pieData = (s.invoicesByStatus || []).map(r => ({ name: r.status, value: Number(r.count||0) }))

  return (
    <div>
      {/* KPI cards */}
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: 24 }}>
        <div className="kpi-card green"><div className="kpi-icon"><TrendingUp size={20}/></div><div className="kpi-label">Total Revenue</div><div className="kpi-value">{fmt.currency(totalRev)}</div><div className="kpi-sub">{s.invoiceCount} invoices</div></div>
        <div className="kpi-card red"><div className="kpi-icon"><TrendingDown size={20}/></div><div className="kpi-label">Total Expenses</div><div className="kpi-value">{fmt.currency(totalExp)}</div><div className="kpi-sub">All time</div></div>
        <div className={`kpi-card ${netProfit>=0?'blue':'red'}`}><div className="kpi-icon"><BarChart2 size={20}/></div><div className="kpi-label">Net Profit</div><div className="kpi-value">{fmt.currency(netProfit)}</div><div className="kpi-sub">{totalRev > 0 ? ((netProfit/totalRev)*100).toFixed(1) : 0}% margin</div></div>
        <div className="kpi-card orange"><div className="kpi-icon"><Clock size={20}/></div><div className="kpi-label">Outstanding</div><div className="kpi-value">{fmt.currency(outstanding)}</div><div className="kpi-sub">Uncollected</div></div>
      </div>

      {/* Revenue vs Expenses area chart */}
      <div className="card" style={{ marginBottom: 16, padding: '20px 20px 24px' }}>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 20 }}>Monthly Revenue vs Expenses</div>
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
            <defs>
              <linearGradient id="gradRev" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.15}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient>
              <linearGradient id="gradExp" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ef4444" stopOpacity={0.12}/><stop offset="95%" stopColor="#ef4444" stopOpacity={0}/></linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--c-border)" vertical={false}/>
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--c-text3)' }} axisLine={false} tickLine={false} dy={8}/>
            <YAxis tick={{ fontSize: 11, fill: 'var(--c-text3)' }} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} axisLine={false} tickLine={false}/>
            <Tooltip content={<Tip/>} cursor={{ stroke: 'var(--c-border)', strokeDasharray: '4 4' }}/>
            <Legend wrapperStyle={{ fontSize: 12, fontWeight: 600, marginTop: 16 }} iconType="circle"/>
            <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#10b981" strokeWidth={2.5} fill="url(#gradRev)"/>
            <Area type="monotone" dataKey="expenses" name="Expenses" stroke="#ef4444" strokeWidth={2.5} fill="url(#gradExp)"/>
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        {/* Invoice status */}
        <div className="card" style={{ padding: '20px 20px 24px' }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 20 }}>Invoice Status Breakdown</div>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart><Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value" nameKey="name" paddingAngle={4}>
              {pieData.map((_,i) => <Cell key={i} fill={COLORS[i%COLORS.length]} stroke="none"/>)}
            </Pie><Tooltip content={<Tip/>}/><Legend wrapperStyle={{ fontSize: 12, fontWeight: 600 }} iconType="circle"/></PieChart>
          </ResponsiveContainer>
        </div>

        {/* Expense by category */}
        <div className="card" style={{ padding: '20px 20px 24px' }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 20 }}>Expenses by Category</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={(s.expenseByCategory||[]).slice(0,8)} layout="vertical" margin={{ left: 0, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--c-border)" horizontal={false}/>
              <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--c-text3)' }} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} axisLine={false} tickLine={false}/>
              <YAxis type="category" dataKey="category" tick={{ fontSize: 10, fill: 'var(--c-text3)' }} width={90} axisLine={false} tickLine={false}/>
              <Tooltip content={<Tip/>} cursor={{ fill: 'var(--c-surface2)' }}/>
              <Bar dataKey="total" name="Expense" fill="#6366f1" radius={[0,6,6,0]} barSize={18}/>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top customers */}
      <div className="card">
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--c-border)', fontWeight: 700, fontSize: 14 }}>Top Customers by Revenue</div>
        <div className="table-wrap">
          <table><thead><tr><th style={{ width: 48, textAlign: 'center' }}>#</th><th>Customer</th><th style={{ textAlign: 'right' }}>Revenue</th><th style={{ textAlign: 'center' }}>Invoices</th></tr></thead>
            <tbody>{(s.topCustomers||[]).map((c,i) => (
              <tr key={i}><td style={{ textAlign: 'center', fontWeight: 700, color: 'var(--c-text3)' }}>#{i+1}</td>
                <td style={{ fontWeight: 600 }}>{c.customer_name}</td>
                <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--c-green)' }}>{fmt.currency(c.total)}</td>
                <td style={{ textAlign: 'center', color: 'var(--c-text2)' }}>{c.count}</td></tr>
            ))}{!s.topCustomers?.length && <tr><td colSpan={4} style={{ textAlign: 'center', padding: 32, color: 'var(--c-text3)' }}>No data yet</td></tr>}</tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ── P&L STATEMENT ────────────────────────────────────────────────────────
function PLSection() {
  const { data, isLoading } = useQuery({ queryKey: ['pl-statement'], queryFn: reportsApi.plStatement })
  if (isLoading) return <PageLoading/>
  const d = data || { revenue: [], expenses: [] }

  const months = [...new Set([...d.revenue.map(r=>r.month), ...d.expenses.map(e=>e.month)])].sort()
  const rows = months.map(m => {
    const rev = d.revenue.find(r=>r.month===m)
    const exps = d.expenses.filter(e=>e.month===m)
    const totalRev = Number(rev?.revenue||0)
    const totalExp = exps.reduce((s,e)=>s+Number(e.total||0),0)
    return { month: m, revenue: totalRev, expenses: totalExp, profit: totalRev - totalExp, gstCollected: Number(rev?.gst_collected||0) }
  })

  const totRev = rows.reduce((s,r)=>s+r.revenue,0)
  const totExp = rows.reduce((s,r)=>s+r.expenses,0)
  const totGST = rows.reduce((s,r)=>s+r.gstCollected,0)
  const totProfit = totRev - totExp

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 24 }}>
        <div className="kpi-card green"><div className="kpi-icon"><TrendingUp size={20}/></div><div className="kpi-label">Gross Revenue</div><div className="kpi-value">{fmt.currency(totRev)}</div></div>
        <div className="kpi-card red"><div className="kpi-icon"><TrendingDown size={20}/></div><div className="kpi-label">Total Expenses</div><div className="kpi-value">{fmt.currency(totExp)}</div></div>
        <div className={`kpi-card ${totProfit>=0?'blue':'red'}`}><div className="kpi-icon"><BarChart2 size={20}/></div><div className="kpi-label">Net Profit / Loss</div><div className="kpi-value">{fmt.currency(totProfit)}</div></div>
        <div className="kpi-card orange"><div className="kpi-icon"><ShieldCheck size={20}/></div><div className="kpi-label">GST Collected</div><div className="kpi-value">{fmt.currency(totGST)}</div></div>
      </div>

      <div className="card" style={{ marginBottom: 16, padding: '20px 20px 24px' }}>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 20 }}>Monthly Profit / Loss</div>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={rows} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--c-border)" vertical={false}/>
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--c-text3)' }} axisLine={false} tickLine={false} dy={8}/>
            <YAxis tick={{ fontSize: 11, fill: 'var(--c-text3)' }} tickFormatter={v=>`₹${(v/1000).toFixed(0)}k`} axisLine={false} tickLine={false}/>
            <Tooltip content={<Tip/>} cursor={{ fill: 'var(--c-surface2)', opacity: 0.5 }}/>
            <Legend wrapperStyle={{ fontSize: 12, fontWeight: 600, marginTop: 16 }} iconType="square"/>
            <Bar dataKey="revenue" name="Revenue" fill="#10b981" radius={[4,4,0,0]} barSize={20}/>
            <Bar dataKey="expenses" name="Expenses" fill="#ef4444" radius={[4,4,0,0]} barSize={20}/>
            <Bar dataKey="profit" name="Net Profit" fill="#6366f1" radius={[4,4,0,0]} barSize={20}/>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--c-border)', fontWeight: 700, fontSize: 14 }}>Monthly P&L Statement</div>
        <div className="table-wrap"><table>
          <thead><tr><th>Month</th><th style={{ textAlign: 'right' }}>Revenue</th><th style={{ textAlign: 'right' }}>Expenses</th><th style={{ textAlign: 'right' }}>GST Collected</th><th style={{ textAlign: 'right' }}>Net Profit</th><th style={{ textAlign: 'center' }}>Margin</th></tr></thead>
          <tbody>
            {rows.map((r,i) => (
              <tr key={r.month} style={{ background: i%2===0?'transparent':'var(--c-surface2)' }}>
                <td style={{ fontWeight: 600 }}>{r.month}</td>
                <td style={{ textAlign: 'right', fontFamily: 'monospace', color: 'var(--c-green)', fontWeight: 700 }}>{fmt.currency(r.revenue)}</td>
                <td style={{ textAlign: 'right', fontFamily: 'monospace', color: 'var(--c-red)' }}>{fmt.currency(r.expenses)}</td>
                <td style={{ textAlign: 'right', fontFamily: 'monospace', color: 'var(--c-text2)' }}>{fmt.currency(r.gstCollected)}</td>
                <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: r.profit>=0?'var(--c-primary)':'var(--c-red)' }}>{fmt.currency(r.profit)}</td>
                <td style={{ textAlign: 'center' }}>
                  <span style={{ padding: '2px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700, background: r.profit>=0?'var(--c-green-lt)':'var(--c-red-lt)', color: r.profit>=0?'var(--c-green)':'var(--c-red)' }}>
                    {r.revenue>0?((r.profit/r.revenue)*100).toFixed(1):0}%
                  </span>
                </td>
              </tr>
            ))}
            {rows.length===0 && <tr><td colSpan={6} style={{ textAlign:'center', padding:48, color:'var(--c-text3)' }}>No revenue data yet</td></tr>}
            {rows.length>0 && (
              <tr style={{ borderTop: '2px solid var(--c-border)', background: 'var(--c-surface2)', fontWeight: 700 }}>
                <td>TOTAL</td>
                <td style={{ textAlign:'right', fontFamily:'monospace', color:'var(--c-green)' }}>{fmt.currency(totRev)}</td>
                <td style={{ textAlign:'right', fontFamily:'monospace', color:'var(--c-red)' }}>{fmt.currency(totExp)}</td>
                <td style={{ textAlign:'right', fontFamily:'monospace' }}>{fmt.currency(totGST)}</td>
                <td style={{ textAlign:'right', fontFamily:'monospace', color:totProfit>=0?'var(--c-primary)':'var(--c-red)' }}>{fmt.currency(totProfit)}</td>
                <td style={{ textAlign:'center' }}>
                  <span style={{ padding:'2px 10px', borderRadius:999, fontSize:11, fontWeight:700, background:totProfit>=0?'var(--c-green-lt)':'var(--c-red-lt)', color:totProfit>=0?'var(--c-green)':'var(--c-red)' }}>
                    {totRev>0?((totProfit/totRev)*100).toFixed(1):0}%
                  </span>
                </td>
              </tr>
            )}
          </tbody>
        </table></div>
      </div>
    </div>
  )
}

// ── AGED RECEIVABLES ────────────────────────────────────────────────────
function AgedSection() {
  const { data = [], isLoading } = useQuery({ queryKey: ['aged-receivables'], queryFn: reportsApi.agedReceivables })
  if (isLoading) return <PageLoading/>

  const totals = { current_amt:0, days_1_30:0, days_31_60:0, days_61_90:0, days_90_plus:0, total_outstanding:0 }
  data.forEach(r => { Object.keys(totals).forEach(k => { totals[k] += Number(r[k]||0) }) })

  const buckets = [
    { key: 'current_amt', label: 'Current (Not Due)', color: '#10b981', bg: '#d1fae5' },
    { key: 'days_1_30',   label: '1–30 Days',         color: '#f59e0b', bg: '#fef3c7' },
    { key: 'days_31_60',  label: '31–60 Days',        color: '#f97316', bg: '#ffedd5' },
    { key: 'days_61_90',  label: '61–90 Days',        color: '#ef4444', bg: '#fee2e2' },
    { key: 'days_90_plus',label: '90+ Days',           color: '#7f1d1d', bg: '#fecaca' },
  ]
  const pieData = buckets.map(b => ({ name: b.label, value: totals[b.key], color: b.color }))

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 12, marginBottom: 24 }}>
        {buckets.map(b => (
          <div key={b.key} style={{ background: b.bg, borderRadius: 12, padding: '16px 18px', border: `1px solid ${b.color}33` }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: b.color, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>{b.label}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: b.color }}>{fmt.currency(totals[b.key])}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16, marginBottom: 16, alignItems: 'flex-start' }}>
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--c-border)', fontWeight: 700, fontSize: 14 }}>
            Customer Ageing Detail
            {data.length > 0 && <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 600, color: 'var(--c-red)', background: 'var(--c-red-lt)', padding: '2px 8px', borderRadius: 999 }}>{data.length} customers</span>}
          </div>
          <div className="table-wrap"><table>
            <thead><tr><th>Customer</th><th style={{ textAlign:'right' }}>Current</th><th style={{ textAlign:'right' }}>1–30d</th><th style={{ textAlign:'right' }}>31–60d</th><th style={{ textAlign:'right' }}>61–90d</th><th style={{ textAlign:'right' }}>90d+</th><th style={{ textAlign:'right' }}>Total</th></tr></thead>
            <tbody>
              {data.map((r,i) => (
                <tr key={i} style={{ background: i%2===0?'transparent':'var(--c-surface2)' }}>
                  <td><div style={{ fontWeight: 600 }}>{r.customer_name}</div>{r.customer_email&&<div style={{ fontSize:11, color:'var(--c-text3)' }}>{r.customer_email}</div>}</td>
                  <td style={{ textAlign:'right', fontFamily:'monospace', color:'#10b981' }}>{fmt.currency(r.current_amt)}</td>
                  <td style={{ textAlign:'right', fontFamily:'monospace', color:Number(r.days_1_30)>0?'#f59e0b':'var(--c-text3)' }}>{fmt.currency(r.days_1_30)}</td>
                  <td style={{ textAlign:'right', fontFamily:'monospace', color:Number(r.days_31_60)>0?'#f97316':'var(--c-text3)' }}>{fmt.currency(r.days_31_60)}</td>
                  <td style={{ textAlign:'right', fontFamily:'monospace', color:Number(r.days_61_90)>0?'#ef4444':'var(--c-text3)' }}>{fmt.currency(r.days_61_90)}</td>
                  <td style={{ textAlign:'right', fontFamily:'monospace', color:Number(r.days_90_plus)>0?'#7f1d1d':'var(--c-text3)', fontWeight:Number(r.days_90_plus)>0?700:400 }}>{fmt.currency(r.days_90_plus)}</td>
                  <td style={{ textAlign:'right', fontFamily:'monospace', fontWeight:700 }}>{fmt.currency(r.total_outstanding)}</td>
                </tr>
              ))}
              {data.length===0 && <tr><td colSpan={7} style={{ textAlign:'center', padding:48, color:'var(--c-text3)' }}>No outstanding receivables</td></tr>}
            </tbody>
          </table></div>
        </div>
        <div className="card" style={{ padding: '20px 20px 24px' }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 16 }}>Ageing Distribution</div>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart><Pie data={pieData.filter(p=>p.value>0)} cx="50%" cy="50%" innerRadius={50} outerRadius={90} dataKey="value" nameKey="name" paddingAngle={3}>
              {pieData.map((p,i) => <Cell key={i} fill={p.color} stroke="none"/>)}
            </Pie><Tooltip content={<Tip/>}/><Legend wrapperStyle={{ fontSize: 11, fontWeight: 600 }} iconType="circle"/></PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

// ── CASH FLOW ───────────────────────────────────────────────────────────
function CashFlowSection() {
  const { data, isLoading } = useQuery({ queryKey: ['cash-flow'], queryFn: reportsApi.cashFlow })
  if (isLoading) return <PageLoading/>
  const d = data || { inflows: [], outflows: [] }

  const months = [...new Set([...d.inflows.map(r=>r.month), ...d.outflows.map(r=>r.month)])].sort()
  const rows = months.map(m => {
    const inflow  = d.inflows.filter(r=>r.month===m).reduce((s,r)=>s+Number(r.total||0),0)
    const outflow = d.outflows.filter(r=>r.month===m).reduce((s,r)=>s+Number(r.total||0),0)
    return { month: m, inflow, outflow, net: inflow - outflow }
  })
  const totIn  = rows.reduce((s,r)=>s+r.inflow,0)
  const totOut = rows.reduce((s,r)=>s+r.outflow,0)
  const totNet = totIn - totOut

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 24 }}>
        <div className="kpi-card green"><div className="kpi-icon"><TrendingUp size={20}/></div><div className="kpi-label">Total Inflows (Payments)</div><div className="kpi-value">{fmt.currency(totIn)}</div></div>
        <div className="kpi-card red"><div className="kpi-icon"><TrendingDown size={20}/></div><div className="kpi-label">Total Outflows (Expenses)</div><div className="kpi-value">{fmt.currency(totOut)}</div></div>
        <div className={`kpi-card ${totNet>=0?'blue':'red'}`}><div className="kpi-icon"><DollarSign size={20}/></div><div className="kpi-label">Net Cash Flow</div><div className="kpi-value">{fmt.currency(totNet)}</div></div>
      </div>

      <div className="card" style={{ marginBottom: 16, padding: '20px 20px 24px' }}>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 20 }}>Monthly Cash Flow</div>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={rows} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--c-border)" vertical={false}/>
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--c-text3)' }} axisLine={false} tickLine={false} dy={8}/>
            <YAxis tick={{ fontSize: 11, fill: 'var(--c-text3)' }} tickFormatter={v=>`₹${(v/1000).toFixed(0)}k`} axisLine={false} tickLine={false}/>
            <Tooltip content={<Tip/>} cursor={{ fill: 'var(--c-surface2)', opacity: 0.5 }}/>
            <Legend wrapperStyle={{ fontSize: 12, fontWeight: 600, marginTop: 16 }} iconType="square"/>
            <Bar dataKey="inflow"  name="Cash In"  fill="#10b981" radius={[4,4,0,0]} barSize={22}/>
            <Bar dataKey="outflow" name="Cash Out" fill="#ef4444" radius={[4,4,0,0]} barSize={22}/>
            <Line dataKey="net" name="Net" stroke="#6366f1" strokeWidth={2.5} dot={{ r:4 }}/>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--c-border)', fontWeight: 700, fontSize: 14 }}>Monthly Cash Flow Statement</div>
        <div className="table-wrap"><table>
          <thead><tr><th>Month</th><th style={{ textAlign:'right' }}>Cash In</th><th style={{ textAlign:'right' }}>Cash Out</th><th style={{ textAlign:'right' }}>Net</th><th style={{ textAlign:'center' }}>Status</th></tr></thead>
          <tbody>
            {rows.map((r,i)=>(
              <tr key={r.month} style={{ background: i%2===0?'transparent':'var(--c-surface2)' }}>
                <td style={{ fontWeight:600 }}>{r.month}</td>
                <td style={{ textAlign:'right', fontFamily:'monospace', color:'var(--c-green)', fontWeight:700 }}>{fmt.currency(r.inflow)}</td>
                <td style={{ textAlign:'right', fontFamily:'monospace', color:'var(--c-red)' }}>{fmt.currency(r.outflow)}</td>
                <td style={{ textAlign:'right', fontFamily:'monospace', fontWeight:700, color:r.net>=0?'var(--c-primary)':'var(--c-red)' }}>{fmt.currency(r.net)}</td>
                <td style={{ textAlign:'center' }}><span style={{ padding:'2px 10px', borderRadius:999, fontSize:11, fontWeight:700, background:r.net>=0?'var(--c-green-lt)':'var(--c-red-lt)', color:r.net>=0?'var(--c-green)':'var(--c-red)' }}>{r.net>=0?'Positive':'Negative'}</span></td>
              </tr>
            ))}
            {rows.length===0&&<tr><td colSpan={5} style={{ textAlign:'center', padding:48, color:'var(--c-text3)' }}>No cash flow data yet</td></tr>}
          </tbody>
        </table></div>
      </div>
    </div>
  )
}

// ── GST SUMMARY ────────────────────────────────────────────────────────
function GSTSection() {
  const { data, isLoading } = useQuery({ queryKey: ['gst-summary'], queryFn: reportsApi.gstSummary })
  if (isLoading) return <PageLoading/>
  const d = data || { collected: [], paid: [] }

  const totCollected = d.collected.reduce((s,r)=>s+Number(r.tax_amount||0),0)
  const totPaid      = d.paid.reduce((s,r)=>s+Number(r.tax_amount||0),0)
  const netGST       = totCollected - totPaid

  const rateGroups = [0,5,12,18,28]
  const byRate = rateGroups.map(rate => ({
    rate,
    collected: d.collected.filter(r=>Number(r.rate)===rate).reduce((s,r)=>s+Number(r.tax_amount||0),0),
    paid:      d.paid.filter(r=>Number(r.rate)===rate).reduce((s,r)=>s+Number(r.tax_amount||0),0),
  })).filter(r=>r.collected>0||r.paid>0)

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 24 }}>
        <div className="kpi-card green"><div className="kpi-icon"><ShieldCheck size={20}/></div><div className="kpi-label">GST Collected (Output)</div><div className="kpi-value">{fmt.currency(totCollected)}</div><div className="kpi-sub">From sales invoices</div></div>
        <div className="kpi-card orange"><div className="kpi-icon"><Receipt size={20}/></div><div className="kpi-label">GST Paid (Input ITC)</div><div className="kpi-value">{fmt.currency(totPaid)}</div><div className="kpi-sub">From expenses</div></div>
        <div className={`kpi-card ${netGST>=0?'blue':'green'}`}><div className="kpi-icon"><DollarSign size={20}/></div><div className="kpi-label">Net GST Payable</div><div className="kpi-value">{fmt.currency(Math.abs(netGST))}</div><div className="kpi-sub">{netGST>=0?'Payable to Govt':'ITC Credit'}</div></div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--c-border)', fontWeight: 700, fontSize: 14 }}>GST by Slab</div>
          <div className="table-wrap"><table>
            <thead><tr><th>GST Rate</th><th style={{ textAlign:'right' }}>Output (Collected)</th><th style={{ textAlign:'right' }}>Input (ITC)</th><th style={{ textAlign:'right' }}>Net Payable</th></tr></thead>
            <tbody>
              {byRate.map(r=>(
                <tr key={r.rate}>
                  <td><span style={{ padding:'3px 12px', borderRadius:999, background:'var(--c-primary-lt)', color:'var(--c-primary)', fontWeight:700, fontSize:12 }}>{r.rate}%</span></td>
                  <td style={{ textAlign:'right', fontFamily:'monospace', color:'var(--c-green)', fontWeight:700 }}>{fmt.currency(r.collected)}</td>
                  <td style={{ textAlign:'right', fontFamily:'monospace', color:'var(--c-orange)' }}>{fmt.currency(r.paid)}</td>
                  <td style={{ textAlign:'right', fontFamily:'monospace', fontWeight:700, color:r.collected-r.paid>=0?'var(--c-primary)':'var(--c-green)' }}>{fmt.currency(r.collected-r.paid)}</td>
                </tr>
              ))}
              {byRate.length===0&&<tr><td colSpan={4} style={{ textAlign:'center', padding:40, color:'var(--c-text3)' }}>No GST transactions yet</td></tr>}
            </tbody>
          </table></div>
        </div>

        <div className="card" style={{ padding: '20px 20px 24px' }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 16 }}>Output vs Input GST</div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={byRate} margin={{ top: 5, right: 16, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--c-border)" vertical={false}/>
              <XAxis dataKey="rate" tickFormatter={v=>`${v}%`} tick={{ fontSize: 11, fill: 'var(--c-text3)' }} axisLine={false} tickLine={false}/>
              <YAxis tick={{ fontSize: 11, fill: 'var(--c-text3)' }} tickFormatter={v=>`₹${(v/1000).toFixed(0)}k`} axisLine={false} tickLine={false}/>
              <Tooltip content={<Tip/>} cursor={{ fill: 'var(--c-surface2)', opacity: 0.5 }}/>
              <Legend wrapperStyle={{ fontSize: 12, fontWeight: 600, marginTop: 16 }} iconType="square"/>
              <Bar dataKey="collected" name="Output GST" fill="#10b981" radius={[4,4,0,0]} barSize={24}/>
              <Bar dataKey="paid"      name="Input ITC"  fill="#f97316" radius={[4,4,0,0]} barSize={24}/>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

// ── EXPENSE ANALYTICS ────────────────────────────────────────────────────
function ExpenseAnalyticsSection() {
  const { data, isLoading } = useQuery({ queryKey: ['expense-analytics'], queryFn: reportsApi.expenseAnalytics })
  if (isLoading) return <PageLoading/>
  const d = data || { topVendors: [], trend: [], byCategory: [] }

  const trendData = d.trend.map(r=>({ month: r.month, total: Number(r.total||0), count: Number(r.count||0) })).reverse()
  const catData = Object.entries(
    d.byCategory.reduce((acc,r)=>{ acc[r.category]=(acc[r.category]||0)+Number(r.total||0); return acc }, {})
  ).map(([category,total])=>({ category, total })).sort((a,b)=>b.total-a.total)

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div className="card" style={{ padding: '20px 20px 24px' }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 20 }}>Expense Trend</div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={trendData} margin={{ top: 5, right: 16, bottom: 5, left: 0 }}>
              <defs><linearGradient id="gradExpA" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ef4444" stopOpacity={0.15}/><stop offset="95%" stopColor="#ef4444" stopOpacity={0}/></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--c-border)" vertical={false}/>
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'var(--c-text3)' }} axisLine={false} tickLine={false} dy={6}/>
              <YAxis tick={{ fontSize: 10, fill: 'var(--c-text3)' }} tickFormatter={v=>`₹${(v/1000).toFixed(0)}k`} axisLine={false} tickLine={false}/>
              <Tooltip content={<Tip/>}/>
              <Area type="monotone" dataKey="total" name="Expenses" stroke="#ef4444" strokeWidth={2.5} fill="url(#gradExpA)"/>
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="card" style={{ padding: '20px 20px 24px' }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 16 }}>Expense by Category</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={catData.slice(0,8)} layout="vertical" margin={{ left: 0, right: 16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--c-border)" horizontal={false}/>
              <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--c-text3)' }} tickFormatter={v=>`₹${(v/1000).toFixed(0)}k`} axisLine={false} tickLine={false}/>
              <YAxis type="category" dataKey="category" tick={{ fontSize: 10, fill: 'var(--c-text3)' }} width={90} axisLine={false} tickLine={false}/>
              <Tooltip content={<Tip/>} cursor={{ fill: 'var(--c-surface2)' }}/>
              <Bar dataKey="total" name="Amount" fill="#6366f1" radius={[0,6,6,0]} barSize={16}/>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--c-border)', fontWeight: 700, fontSize: 14 }}>Top Vendors by Spend</div>
        <div className="table-wrap"><table>
          <thead><tr><th style={{ width:40, textAlign:'center' }}>#</th><th>Vendor</th><th style={{ textAlign:'right' }}>Total Spend</th><th style={{ textAlign:'center' }}>Transactions</th><th>Spend Bar</th></tr></thead>
          <tbody>
            {d.topVendors.map((v,i)=>{
              const pct = d.topVendors[0]?.total>0?(Number(v.total)/Number(d.topVendors[0].total)*100).toFixed(0):0
              return (
                <tr key={i} style={{ background: i%2===0?'transparent':'var(--c-surface2)' }}>
                  <td style={{ textAlign:'center', fontWeight:700, color:'var(--c-text3)' }}>#{i+1}</td>
                  <td style={{ fontWeight:600 }}>{v.vendor_name}</td>
                  <td style={{ textAlign:'right', fontFamily:'monospace', fontWeight:700, color:'var(--c-red)' }}>{fmt.currency(v.total)}</td>
                  <td style={{ textAlign:'center', color:'var(--c-text2)' }}>{v.count}</td>
                  <td style={{ width:160 }}>
                    <div style={{ background:'var(--c-border)', borderRadius:4, height:8 }}>
                      <div style={{ width:`${pct}%`, height:'100%', background:'var(--c-primary)', borderRadius:4, transition:'width 0.4s ease' }}/>
                    </div>
                  </td>
                </tr>
              )
            })}
            {d.topVendors.length===0&&<tr><td colSpan={5} style={{ textAlign:'center', padding:48, color:'var(--c-text3)' }}>No vendor expense data yet</td></tr>}
          </tbody>
        </table></div>
      </div>
    </div>
  )
}


// ── A/P AGING ───────────────────────────────────────────────────────────
function APAgingSection() {
  const { data = [], isLoading } = useQuery({ queryKey: ['ap-aging'], queryFn: reportsApi.apAging })
  if (isLoading) return <PageLoading/>

  const totals = { current_amt:0, days_1_30:0, days_31_60:0, days_61_90:0, days_90_plus:0, total_outstanding:0 }
  data.forEach(r => { Object.keys(totals).forEach(k => { totals[k] += Number(r[k]||0) }) })

  const buckets = [
    { key:'current_amt',  label:'Current (Not Due)', color:'#10b981', bg:'#d1fae5' },
    { key:'days_1_30',    label:'1–30 Days',          color:'#f59e0b', bg:'#fef3c7' },
    { key:'days_31_60',   label:'31–60 Days',         color:'#f97316', bg:'#ffedd5' },
    { key:'days_61_90',   label:'61–90 Days',         color:'#ef4444', bg:'#fee2e2' },
    { key:'days_90_plus', label:'90+ Days',            color:'#7f1d1d', bg:'#fecaca' },
  ]

  return (
    <div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:12, marginBottom:24 }}>
        {buckets.map(b=>(
          <div key={b.key} style={{ background:b.bg, borderRadius:12, padding:'16px 18px', border:`1px solid ${b.color}33` }}>
            <div style={{ fontSize:10, fontWeight:800, color:b.color, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:8 }}>{b.label}</div>
            <div style={{ fontSize:20, fontWeight:800, color:b.color }}>{fmt.currency(totals[b.key])}</div>
          </div>
        ))}
      </div>
      <div className="card" style={{ padding:0, overflow:'hidden' }}>
        <div style={{ padding:'14px 20px', borderBottom:'1px solid var(--c-border)', fontWeight:700, fontSize:14 }}>
          Vendor A/P Aging Detail
          {data.length>0 && <span style={{ marginLeft:8, fontSize:11, fontWeight:600, color:'var(--c-orange)', background:'var(--c-yellow-lt)', padding:'2px 8px', borderRadius:999 }}>{data.length} vendors</span>}
        </div>
        <div className="table-wrap"><table>
          <thead><tr><th>Vendor</th><th style={{textAlign:'right'}}>Current</th><th style={{textAlign:'right'}}>1–30d</th><th style={{textAlign:'right'}}>31–60d</th><th style={{textAlign:'right'}}>61–90d</th><th style={{textAlign:'right'}}>90d+</th><th style={{textAlign:'right'}}>Total Payable</th></tr></thead>
          <tbody>
            {data.map((r,i)=>(
              <tr key={i} style={{background:i%2===0?'transparent':'var(--c-surface2)'}}>
                <td><div style={{fontWeight:600}}>{r.vendor_name}</div>{r.vendor_email&&<div style={{fontSize:11,color:'var(--c-text3)'}}>{r.vendor_email}</div>}</td>
                <td style={{textAlign:'right',fontFamily:'monospace',color:'#10b981'}}>{fmt.currency(r.current_amt)}</td>
                <td style={{textAlign:'right',fontFamily:'monospace',color:Number(r.days_1_30)>0?'#f59e0b':'var(--c-text3)'}}>{fmt.currency(r.days_1_30)}</td>
                <td style={{textAlign:'right',fontFamily:'monospace',color:Number(r.days_31_60)>0?'#f97316':'var(--c-text3)'}}>{fmt.currency(r.days_31_60)}</td>
                <td style={{textAlign:'right',fontFamily:'monospace',color:Number(r.days_61_90)>0?'#ef4444':'var(--c-text3)'}}>{fmt.currency(r.days_61_90)}</td>
                <td style={{textAlign:'right',fontFamily:'monospace',color:Number(r.days_90_plus)>0?'#7f1d1d':'var(--c-text3)',fontWeight:Number(r.days_90_plus)>0?700:400}}>{fmt.currency(r.days_90_plus)}</td>
                <td style={{textAlign:'right',fontFamily:'monospace',fontWeight:700}}>{fmt.currency(r.total_outstanding)}</td>
              </tr>
            ))}
            {data.length===0&&<tr><td colSpan={7} style={{textAlign:'center',padding:48,color:'var(--c-text3)'}}>No outstanding payables</td></tr>}
          </tbody>
        </table></div>
      </div>
    </div>
  )
}

// ── BALANCE SHEET ────────────────────────────────────────────────────────
function BalanceSheetSection() {
  const { data, isLoading } = useQuery({ queryKey:['balance-sheet'], queryFn: reportsApi.balanceSheet })
  if (isLoading) return <PageLoading/>
  const d = data || { assets:{}, liabilities:{} }
  const a = d.assets || {}
  const l = d.liabilities || {}

  const totalAssets = (Number(a.accounts_receivable||0) + Number(a.cash_received||0) + Number(a.inventory_value||0))
  const totalLiab   = (Number(l.accounts_payable||0) + Number(l.gst_payable||0))
  const equity      = totalAssets - totalLiab

  const Section = ({title, color, rows, total}) => (
    <div className="card" style={{padding:0,overflow:'hidden',marginBottom:16}}>
      <div style={{padding:'12px 20px',background:color+'22',borderBottom:'1px solid '+color+'44',fontWeight:800,fontSize:13,color}}>
        {title}
      </div>
      {rows.map(([label,value])=>(
        <div key={label} style={{display:'flex',justifyContent:'space-between',padding:'11px 20px',borderBottom:'1px solid var(--c-border)',fontSize:13}}>
          <span style={{color:'var(--c-text2)'}}>{label}</span>
          <span style={{fontFamily:'monospace',fontWeight:600}}>{fmt.currency(value)}</span>
        </div>
      ))}
      <div style={{display:'flex',justifyContent:'space-between',padding:'12px 20px',background:'var(--c-surface2)',fontWeight:800,fontSize:14}}>
        <span>Total {title}</span>
        <span style={{fontFamily:'monospace',color}}>{fmt.currency(total)}</span>
      </div>
    </div>
  )

  return (
    <div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16,marginBottom:24}}>
        <div className="kpi-card green"><div className="kpi-icon"><TrendingUp size={20}/></div><div className="kpi-label">Total Assets</div><div className="kpi-value">{fmt.currency(totalAssets)}</div></div>
        <div className="kpi-card red"><div className="kpi-icon"><TrendingDown size={20}/></div><div className="kpi-label">Total Liabilities</div><div className="kpi-value">{fmt.currency(totalLiab)}</div></div>
        <div className={`kpi-card ${equity>=0?'blue':'red'}`}><div className="kpi-icon"><BarChart2 size={20}/></div><div className="kpi-label">Owner's Equity</div><div className="kpi-value">{fmt.currency(equity)}</div></div>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
        <div>
          <Section title="Assets" color="#10b981" total={totalAssets} rows={[
            ['Cash Received (Payments)', Number(a.cash_received||0)],
            ['Accounts Receivable', Number(a.accounts_receivable||0)],
            ['Inventory Value', Number(a.inventory_value||0)],
          ]}/>
        </div>
        <div>
          <Section title="Liabilities" color="#ef4444" total={totalLiab} rows={[
            ['Accounts Payable (AP)', Number(l.accounts_payable||0)],
            ['GST Payable (Output)', Number(l.gst_payable||0)],
          ]}/>
          <div className="card" style={{padding:0,overflow:'hidden'}}>
            <div style={{padding:'12px 20px',background:'#3b82f622',borderBottom:'1px solid #3b82f644',fontWeight:800,fontSize:13,color:'#3b82f6'}}>Owner's Equity</div>
            <div style={{display:'flex',justifyContent:'space-between',padding:'11px 20px',borderBottom:'1px solid var(--c-border)',fontSize:13}}>
              <span style={{color:'var(--c-text2)'}}>Retained Earnings (Assets – Liabilities)</span>
              <span style={{fontFamily:'monospace',fontWeight:600,color:equity>=0?'var(--c-green)':'var(--c-red)'}}>{fmt.currency(equity)}</span>
            </div>
            <div style={{display:'flex',justifyContent:'space-between',padding:'12px 20px',background:'var(--c-surface2)',fontWeight:800,fontSize:14}}>
              <span>Total Liabilities + Equity</span>
              <span style={{fontFamily:'monospace',color:'#3b82f6'}}>{fmt.currency(totalLiab + equity)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── TRIAL BALANCE ────────────────────────────────────────────────────────
function TrialBalanceSection() {
  const { data=[], isLoading } = useQuery({ queryKey:['trial-balance'], queryFn: reportsApi.trialBalance })
  if (isLoading) return <PageLoading/>

  const totalDebit  = data.reduce((s,r)=>s+Number(r.debit||0),0)
  const totalCredit = data.reduce((s,r)=>s+Number(r.credit||0),0)
  const balanced    = Math.abs(totalDebit - totalCredit) < 1

  const TYPE_COLORS = { Asset:'#10b981', Revenue:'#6366f1', Expense:'#ef4444', Liability:'#f59e0b', Equity:'#0ea5e9' }

  return (
    <div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16,marginBottom:24}}>
        <div className="kpi-card blue"><div className="kpi-icon"><TrendingUp size={20}/></div><div className="kpi-label">Total Debits</div><div className="kpi-value">{fmt.currency(totalDebit)}</div></div>
        <div className="kpi-card green"><div className="kpi-icon"><TrendingDown size={20}/></div><div className="kpi-label">Total Credits</div><div className="kpi-value">{fmt.currency(totalCredit)}</div></div>
        <div className={`kpi-card ${balanced?'green':'red'}`}>
          <div className="kpi-icon"><ShieldCheck size={20}/></div>
          <div className="kpi-label">Balance Status</div>
          <div className="kpi-value" style={{fontSize:16}}>{balanced?'✓ Balanced':'⚠ Unbalanced'}</div>
        </div>
      </div>
      <div className="card" style={{padding:0,overflow:'hidden'}}>
        <div style={{padding:'14px 20px',borderBottom:'1px solid var(--c-border)',fontWeight:700,fontSize:14}}>Trial Balance</div>
        <div className="table-wrap"><table>
          <thead><tr><th>Account</th><th>Type</th><th style={{textAlign:'right'}}>Debit (Dr)</th><th style={{textAlign:'right'}}>Credit (Cr)</th></tr></thead>
          <tbody>
            {data.map((r,i)=>(
              <tr key={i} style={{background:i%2===0?'transparent':'var(--c-surface2)'}}>
                <td style={{fontWeight:600}}>{r.account}</td>
                <td><span style={{padding:'2px 10px',borderRadius:999,fontSize:11,fontWeight:700,background:(TYPE_COLORS[r.type]||'#6366f1')+'18',color:TYPE_COLORS[r.type]||'#6366f1'}}>{r.type}</span></td>
                <td style={{textAlign:'right',fontFamily:'monospace',color:Number(r.debit)>0?'var(--c-text)':'var(--c-text3)',fontWeight:Number(r.debit)>0?600:400}}>{Number(r.debit)>0?fmt.currency(r.debit):'—'}</td>
                <td style={{textAlign:'right',fontFamily:'monospace',color:Number(r.credit)>0?'var(--c-text)':'var(--c-text3)',fontWeight:Number(r.credit)>0?600:400}}>{Number(r.credit)>0?fmt.currency(r.credit):'—'}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{borderTop:'2px solid var(--c-border)',background:'var(--c-surface2)',fontWeight:800}}>
              <td colSpan={2} style={{padding:'12px 14px'}}>TOTAL</td>
              <td style={{textAlign:'right',padding:'12px 14px',fontFamily:'monospace',fontSize:14,color:'var(--c-primary)'}}>{fmt.currency(totalDebit)}</td>
              <td style={{textAlign:'right',padding:'12px 14px',fontFamily:'monospace',fontSize:14,color:'var(--c-green)'}}>{fmt.currency(totalCredit)}</td>
            </tr>
          </tfoot>
        </table></div>
      </div>
    </div>
  )
}

// ── MAIN PAGE ────────────────────────────────────────────────────────────
export default function ReportsPage() {
  const { setActions, setContext, clear } = useTopbarStore()
  const [activeSection, setActiveSection] = useState('overview')
  const [collapsed, setCollapsed] = useState(false)

  const { data, isLoading } = useQuery({ queryKey: ['reports-summary'], queryFn: reportsApi.summary })

  useEffect(() => {
    const nav = NAV.find(n => n.id === activeSection)
    setContext('Finance', nav?.label || 'Reports')
    setActions(null)
    return clear
  }, [setActions, setContext, clear, activeSection])

  if (isLoading && activeSection === 'overview') return <PageLoading/>

  const groups = [...new Set(NAV.map(n => n.group))]
  const s = data || {}

  return (
    <div className="secondary-layout">
      {/* Sidebar */}
      <aside className={'secondary-sidebar' + (collapsed ? ' collapsed' : '')}>
        <div className="secondary-sidebar-title">
          <span>Finance</span>
          <button className="secondary-header-toggle" onClick={() => setCollapsed(c => !c)} title={collapsed ? 'Expand' : 'Collapse'}>
            <ChevronLeft size={16}/>
          </button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {groups.map(group => (
            <div key={group}>
              {!collapsed && (
                <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--c-text3)', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '10px 12px 4px', marginTop: 4 }}>
                  {group}
                </div>
              )}
              {NAV.filter(n => n.group === group).map(item => (
                <div key={item.id}
                  className={'secondary-nav-item' + (activeSection === item.id ? ' active' : '')}
                  onClick={() => setActiveSection(item.id)}
                  title={collapsed ? item.label : ''}
                >
                  <item.icon size={16}/>
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </aside>

      {/* Main content */}
      <main className="secondary-content">
        {activeSection === 'overview'  && <OverviewSection s={s}/>}
        {activeSection === 'pl'        && <PLSection/>}
        {activeSection === 'aged'      && <AgedSection/>}
        {activeSection === 'cashflow'  && <CashFlowSection/>}
        {activeSection === 'gst'       && <GSTSection/>}
        {activeSection === 'expenses'  && <ExpenseAnalyticsSection/>}
        {activeSection === 'balance'   && <BalanceSheetSection/>}
        {activeSection === 'trial'     && <TrialBalanceSection/>}
        {activeSection === 'apaging'   && <APAgingSection/>}
      </main>
    </div>
  )
}
