import { useQuery } from '@tanstack/react-query'
import { reportsApi } from '@/api'
import { fmt } from '@/lib/utils'
import { PageLoading } from '@/components/ui'
import { TrendingUp, TrendingDown, BarChart2 } from 'lucide-react'

function BSRow({ label, value }) {
  return (
    <div style={{display:'flex',justifyContent:'space-between',padding:'11px 20px',borderBottom:'1px solid var(--c-border)',fontSize:13}}>
      <span style={{color:'var(--c-text2)'}}>{label}</span>
      <span style={{fontFamily:'monospace',fontWeight:600}}>{fmt.currency(value)}</span>
    </div>
  )
}
function BSCard({ title, color, rows, total }) {
  return (
    <div className="card" style={{padding:0,overflow:'hidden',marginBottom:16}}>
      <div style={{padding:'12px 20px',background:color+'22',borderBottom:'1px solid '+color+'44',fontWeight:800,fontSize:13,color}}>{title}</div>
      {rows.map(([label,val]) => <BSRow key={label} label={label} value={val}/>)}
      <div style={{display:'flex',justifyContent:'space-between',padding:'12px 20px',background:'var(--c-surface2)',fontWeight:800,fontSize:14}}>
        <span>Total {title}</span><span style={{fontFamily:'monospace',color}}>{fmt.currency(total)}</span>
      </div>
    </div>
  )
}

export default function BalanceSheetSection() {
  const { data, isLoading } = useQuery({ queryKey:['balance-sheet'], queryFn:reportsApi.balanceSheet })
  if (isLoading) return <PageLoading/>
  const a = data?.assets || {}; const l = data?.liabilities || {}
  const totalAssets = Number(a.accounts_receivable||0)+Number(a.cash_received||0)+Number(a.inventory_value||0)
  const totalLiab   = Number(l.accounts_payable||0)+Number(l.gst_payable||0)
  const equity      = totalAssets - totalLiab

  return (
    <div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16,marginBottom:24}}>
        <div className="kpi-card green"><div className="kpi-icon"><TrendingUp size={20}/></div><div className="kpi-label">Total Assets</div><div className="kpi-value">{fmt.currency(totalAssets)}</div></div>
        <div className="kpi-card red"><div className="kpi-icon"><TrendingDown size={20}/></div><div className="kpi-label">Total Liabilities</div><div className="kpi-value">{fmt.currency(totalLiab)}</div></div>
        <div className={`kpi-card ${equity>=0?'blue':'red'}`}><div className="kpi-icon"><BarChart2 size={20}/></div><div className="kpi-label">Owner's Equity</div><div className="kpi-value">{fmt.currency(equity)}</div></div>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
        <BSCard title="Assets" color="#10b981" total={totalAssets} rows={[
          ['Cash Received', Number(a.cash_received||0)],
          ['Accounts Receivable', Number(a.accounts_receivable||0)],
          ['Inventory Value', Number(a.inventory_value||0)],
        ]}/>
        <div>
          <BSCard title="Liabilities" color="#ef4444" total={totalLiab} rows={[
            ['Accounts Payable', Number(l.accounts_payable||0)],
            ['GST Payable', Number(l.gst_payable||0)],
          ]}/>
          <div className="card" style={{padding:0,overflow:'hidden'}}>
            <div style={{padding:'12px 20px',background:'#3b82f622',borderBottom:'1px solid #3b82f644',fontWeight:800,fontSize:13,color:'#3b82f6'}}>Owner's Equity</div>
            <BSRow label="Retained Earnings (Assets − Liabilities)" value={equity}/>
            <div style={{display:'flex',justifyContent:'space-between',padding:'12px 20px',background:'var(--c-surface2)',fontWeight:800,fontSize:14}}>
              <span>Total Liabilities + Equity</span><span style={{fontFamily:'monospace',color:'#3b82f6'}}>{fmt.currency(totalLiab+equity)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
