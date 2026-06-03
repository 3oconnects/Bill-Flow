import { useQuery } from '@tanstack/react-query'
import { reportsApi } from '@/api'
import { fmt } from '@/lib/utils'
import { PageLoading } from '@/components/ui'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { Tip } from './ReportsShared'
import { ShieldCheck, ShieldAlert, FileText, CheckCircle } from 'lucide-react'

export default function GSTSection() {
  const { data, isLoading } = useQuery({ queryKey: ['gst-summary'], queryFn: reportsApi.gstSummary })
  if (isLoading) return <PageLoading/>
  const d = data || { sales: [], purchases: [] }

  const months = [...new Set([...d.sales.map(s=>s.month), ...d.purchases.map(p=>p.month)])].sort()
  const rows = months.map(m => {
    const s = d.sales.find(x=>x.month===m)
    const p = d.purchases.find(x=>x.month===m)
    return { 
      month: m, 
      collected: Number(s?.gst_collected||0), 
      paid: Number(p?.gst_paid||0), 
      liability: Number(s?.gst_collected||0) - Number(p?.gst_paid||0) 
    }
  })

  const totColl = rows.reduce((s,r)=>s+r.collected,0)
  const totPaid = rows.reduce((s,r)=>s+r.paid,0)
  const totLiab = rows.reduce((s,r)=>s+r.liability,0)

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 24 }}>
        <div className="kpi-card blue"><div className="kpi-icon"><ShieldCheck size={20}/></div><div className="kpi-label">GST Collected (Output)</div><div className="kpi-value">{fmt.currency(totColl)}</div></div>
        <div className="kpi-card green"><div className="kpi-icon"><CheckCircle size={20}/></div><div className="kpi-label">GST Paid (Input ITC)</div><div className="kpi-value">{fmt.currency(totPaid)}</div></div>
        <div className={`kpi-card ${totLiab>=0?'orange':'green'}`}><div className="kpi-icon"><ShieldAlert size={20}/></div><div className="kpi-label">Net GST Liability</div><div className="kpi-value">{fmt.currency(totLiab)}</div><div className="kpi-sub">Payable to Govt</div></div>
        <div className="kpi-card purple"><div className="kpi-icon"><FileText size={20}/></div><div className="kpi-label">Filing Status</div><div className="kpi-value">Pending</div><div className="kpi-sub">Current Month</div></div>
      </div>

      <div className="card" style={{ marginBottom: 16, padding: '20px 20px 24px' }}>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 20 }}>Monthly GST Position</div>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={rows} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--c-border)" vertical={false}/>
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--c-text3)' }} axisLine={false} tickLine={false} dy={8}/>
            <YAxis tick={{ fontSize: 11, fill: 'var(--c-text3)' }} tickFormatter={v=>`₹${(v/1000).toFixed(0)}k`} axisLine={false} tickLine={false}/>
            <Tooltip content={<Tip/>} cursor={{ fill: 'var(--c-surface2)', opacity: 0.5 }}/>
            <Legend wrapperStyle={{ fontSize: 12, fontWeight: 600, marginTop: 16 }} iconType="square"/>
            <Bar dataKey="collected" name="GST Collected (Output)" fill="#3b82f6" radius={[4,4,0,0]} barSize={24}/>
            <Bar dataKey="paid" name="GST Paid (Input ITC)" fill="#10b981" radius={[4,4,0,0]} barSize={24}/>
            <Bar dataKey="liability" name="Net Liability" fill="#f59e0b" radius={[4,4,0,0]} barSize={24}/>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--c-border)', fontWeight: 700, fontSize: 14 }}>GST Liability Register</div>
        <div className="table-wrap"><table>
          <thead><tr><th>Month</th><th style={{ textAlign: 'right' }}>GST Collected</th><th style={{ textAlign: 'right' }}>Input Tax Credit (ITC)</th><th style={{ textAlign: 'right' }}>Net Payable / (Refundable)</th></tr></thead>
          <tbody>
            {rows.map((r,i) => (
              <tr key={r.month} style={{ background: i%2===0?'transparent':'var(--c-surface2)' }}>
                <td style={{ fontWeight: 600 }}>{r.month}</td>
                <td style={{ textAlign: 'right', fontFamily: 'monospace', color: 'var(--c-blue)' }}>{fmt.currency(r.collected)}</td>
                <td style={{ textAlign: 'right', fontFamily: 'monospace', color: 'var(--c-green)' }}>{fmt.currency(r.paid)}</td>
                <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: r.liability>=0?'var(--c-orange)':'var(--c-green)' }}>{fmt.currency(r.liability)}</td>
              </tr>
            ))}
            {rows.length===0 && <tr><td colSpan={4} style={{ textAlign:'center', padding:48, color:'var(--c-text3)' }}>No GST data available</td></tr>}
          </tbody>
        </table></div>
      </div>
    </div>
  )
}
