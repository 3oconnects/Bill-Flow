import { useQuery } from '@tanstack/react-query'
import { reportsApi } from '@/api'
import { fmt } from '@/lib/utils'
import { PageLoading } from '@/components/ui'
import { ShieldCheck, Receipt, DollarSign } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { Tip } from './shared'

export default function GSTSection() {
  const { data, isLoading } = useQuery({ queryKey: ['gst-summary'], queryFn: reportsApi.gstSummary })
  if (isLoading) return <PageLoading/>
  const d = data || { collected: [], paid: [] }
  const totCollected = d.collected.reduce((s,r)=>s+Number(r.tax_amount||0),0)
  const totPaid      = d.paid.reduce((s,r)=>s+Number(r.tax_amount||0),0)
  const netGST       = totCollected - totPaid
  const rateGroups   = [0,5,12,18,28]
  const byRate = rateGroups.map(rate => ({
    rate,
    collected: d.collected.filter(r=>Number(r.rate)===rate).reduce((s,r)=>s+Number(r.tax_amount||0),0),
    paid:      d.paid.filter(r=>Number(r.rate)===rate).reduce((s,r)=>s+Number(r.tax_amount||0),0),
  })).filter(r=>r.collected>0||r.paid>0)

  return (
    <div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16, marginBottom:24 }}>
        <div className="kpi-card green"><div className="kpi-icon"><ShieldCheck size={20}/></div><div className="kpi-label">GST Collected (Output)</div><div className="kpi-value">{fmt.currency(totCollected)}</div><div className="kpi-sub">From sales invoices</div></div>
        <div className="kpi-card orange"><div className="kpi-icon"><Receipt size={20}/></div><div className="kpi-label">GST Paid (Input ITC)</div><div className="kpi-value">{fmt.currency(totPaid)}</div><div className="kpi-sub">From expenses</div></div>
        <div className={`kpi-card ${netGST>=0?'blue':'green'}`}><div className="kpi-icon"><DollarSign size={20}/></div><div className="kpi-label">Net GST Payable</div><div className="kpi-value">{fmt.currency(Math.abs(netGST))}</div><div className="kpi-sub">{netGST>=0?'Payable to Govt':'ITC Credit'}</div></div>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
        <div className="card" style={{ padding:0, overflow:'hidden' }}>
          <div style={{ padding:'14px 20px', borderBottom:'1px solid var(--c-border)', fontWeight:700, fontSize:14 }}>GST by Slab</div>
          <div className="table-wrap"><table>
            <thead><tr><th>Rate</th><th style={{textAlign:'right'}}>Output</th><th style={{textAlign:'right'}}>Input ITC</th><th style={{textAlign:'right'}}>Net Payable</th></tr></thead>
            <tbody>
              {byRate.map(r=>(
                <tr key={r.rate}>
                  <td><span style={{padding:'3px 12px',borderRadius:999,background:'var(--c-primary-lt)',color:'var(--c-primary)',fontWeight:700,fontSize:12}}>{r.rate}%</span></td>
                  <td style={{textAlign:'right',fontFamily:'monospace',color:'var(--c-green)',fontWeight:700}}>{fmt.currency(r.collected)}</td>
                  <td style={{textAlign:'right',fontFamily:'monospace',color:'var(--c-orange)'}}>{fmt.currency(r.paid)}</td>
                  <td style={{textAlign:'right',fontFamily:'monospace',fontWeight:700,color:r.collected-r.paid>=0?'var(--c-primary)':'var(--c-green)'}}>{fmt.currency(r.collected-r.paid)}</td>
                </tr>
              ))}
              {!byRate.length&&<tr><td colSpan={4} style={{textAlign:'center',padding:40,color:'var(--c-text3)'}}>No GST transactions yet</td></tr>}
            </tbody>
          </table></div>
        </div>
        <div className="card" style={{ padding:'20px 20px 24px' }}>
          <div style={{ fontWeight:700, fontSize:14, marginBottom:16 }}>Output vs Input GST</div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={byRate}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--c-border)" vertical={false}/>
              <XAxis dataKey="rate" tickFormatter={v=>`${v}%`} tick={{ fontSize:11, fill:'var(--c-text3)' }} axisLine={false} tickLine={false}/>
              <YAxis tick={{ fontSize:11, fill:'var(--c-text3)' }} tickFormatter={v=>`₹${(v/1000).toFixed(0)}k`} axisLine={false} tickLine={false}/>
              <Tooltip content={<Tip/>} cursor={{ fill:'var(--c-surface2)', opacity:0.5 }}/>
              <Legend wrapperStyle={{ fontSize:12, fontWeight:600, marginTop:16 }} iconType="square"/>
              <Bar dataKey="collected" name="Output GST" fill="#10b981" radius={[4,4,0,0]} barSize={24}/>
              <Bar dataKey="paid"      name="Input ITC"  fill="#f97316" radius={[4,4,0,0]} barSize={24}/>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
