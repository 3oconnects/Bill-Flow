import { useQuery } from '@tanstack/react-query'
import { reportsApi } from '@/api'
import { fmt } from '@/lib/utils'
import { PageLoading } from '@/components/ui'
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { Tip } from './ReportsShared'

export default function AgedSection() {
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
