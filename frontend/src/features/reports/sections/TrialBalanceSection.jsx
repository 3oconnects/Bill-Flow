import { useQuery } from '@tanstack/react-query'
import { reportsApi } from '@/api'
import { fmt } from '@/lib/utils'
import { PageLoading } from '@/components/ui'
import { TrendingUp, TrendingDown, ShieldCheck } from 'lucide-react'

const TYPE_COLORS = { Asset:'#10b981', Revenue:'#6366f1', Expense:'#ef4444', Liability:'#f59e0b', Equity:'#0ea5e9' }

export default function TrialBalanceSection() {
  const { data=[], isLoading } = useQuery({ queryKey:['trial-balance'], queryFn:reportsApi.trialBalance })
  if (isLoading) return <PageLoading/>
  const totalDebit  = data.reduce((s,r)=>s+Number(r.debit||0),0)
  const totalCredit = data.reduce((s,r)=>s+Number(r.credit||0),0)
  const balanced    = Math.abs(totalDebit-totalCredit)<1

  return (
    <div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16,marginBottom:24}}>
        <div className="kpi-card blue"><div className="kpi-icon"><TrendingUp size={20}/></div><div className="kpi-label">Total Debits</div><div className="kpi-value">{fmt.currency(totalDebit)}</div></div>
        <div className="kpi-card green"><div className="kpi-icon"><TrendingDown size={20}/></div><div className="kpi-label">Total Credits</div><div className="kpi-value">{fmt.currency(totalCredit)}</div></div>
        <div className={`kpi-card ${balanced?'green':'red'}`}><div className="kpi-icon"><ShieldCheck size={20}/></div><div className="kpi-label">Balance Status</div><div className="kpi-value" style={{fontSize:16}}>{balanced?'✓ Balanced':'⚠ Unbalanced'}</div></div>
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
