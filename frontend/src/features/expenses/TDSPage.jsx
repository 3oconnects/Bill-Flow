import { useState, useEffect } from 'react'
import { useTopbarStore } from '@/store/topbarStore'
import { fmt } from '@/lib/utils'
import { ShieldCheck, Plus, Edit2, Trash2, CheckCircle2, Clock, AlertCircle, Download } from 'lucide-react'
import Modal from '@/components/Modal'

const TDS_SECTIONS = [
  { code:'192', desc:'Salary',                            rate:10 },
  { code:'194A',desc:'Interest (other than securities)',  rate:10 },
  { code:'194C',desc:'Contractor / Sub-contractor',       rate:1  },
  { code:'194H',desc:'Commission / Brokerage',            rate:5  },
  { code:'194I',desc:'Rent',                              rate:10 },
  { code:'194J',desc:'Professional / Technical fees',     rate:10 },
  { code:'194Q',desc:'Purchase of goods',                 rate:0.1},
  { code:'206C',desc:'TCS on sale of goods',              rate:0.1},
]

const STATUS_COLORS = {
  deducted: { bg:'#dbeafe', color:'#1d4ed8', label:'Deducted' },
  deposited: { bg:'#d1fae5', color:'#065f46', label:'Deposited' },
  pending:   { bg:'#fef3c7', color:'#92400e', label:'Pending'   },
  overdue:   { bg:'#fee2e2', color:'#991b1b', label:'Overdue'   },
}

const INITIAL_ENTRIES = [
  { id:1, deductee:'ABC Consultants',  pan:'ABCDE1234F', section:'194J', amount:50000, tds_rate:10, tds_amount:5000,  date:'2024-01-15', quarter:'Q3 FY24', status:'deposited', challan:'CHL001', remarks:'Professional fees Jan' },
  { id:2, deductee:'XYZ Contractors',  pan:'XYZAB5678G', section:'194C', amount:200000,tds_rate:1,  tds_amount:2000,  date:'2024-02-20', quarter:'Q3 FY24', status:'deposited', challan:'CHL002', remarks:'Construction work' },
  { id:3, deductee:'PQR Rentals',       pan:'PQRST9012H', section:'194I', amount:30000, tds_rate:10, tds_amount:3000,  date:'2024-03-05', quarter:'Q4 FY24', status:'deducted',  challan:'',       remarks:'Office rent Mar' },
  { id:4, deductee:'LMN Agency',        pan:'LMNOP3456I', section:'194H', amount:80000, tds_rate:5,  tds_amount:4000,  date:'2024-03-18', quarter:'Q4 FY24', status:'pending',   challan:'',       remarks:'Commission Q4' },
]

function TDSForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(initial || {
    deductee:'', pan:'', section:'194J', amount:'', tds_rate:10, tds_amount:'',
    date: new Date().toISOString().split('T')[0], quarter:'', status:'deducted', challan:'', remarks:''
  })

  const set = (k,v) => setForm(p => {
    const next = { ...p, [k]: v }
    if (k === 'amount' || k === 'tds_rate') {
      next.tds_amount = ((parseFloat(next.amount)||0) * (parseFloat(next.tds_rate)||0) / 100).toFixed(2)
    }
    if (k === 'section') {
      const sec = TDS_SECTIONS.find(s=>s.code===v)
      if (sec) { next.tds_rate = sec.rate; next.tds_amount = ((parseFloat(next.amount)||0)*sec.rate/100).toFixed(2) }
    }
    return next
  })

  return (
    <div style={{ padding:'0 4px' }}>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 }}>
        <div className="form-group">
          <label className="form-label">Deductee Name *</label>
          <input className="form-input" placeholder="Vendor / contractor name" value={form.deductee} onChange={e=>set('deductee',e.target.value)}/>
        </div>
        <div className="form-group">
          <label className="form-label">PAN Number *</label>
          <input className="form-input" placeholder="ABCDE1234F" style={{ fontFamily:'monospace', textTransform:'uppercase' }} value={form.pan} onChange={e=>set('pan',e.target.value.toUpperCase())}/>
        </div>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 }}>
        <div className="form-group">
          <label className="form-label">TDS Section</label>
          <select className="form-select" value={form.section} onChange={e=>set('section',e.target.value)}>
            {TDS_SECTIONS.map(s=><option key={s.code} value={s.code}>Sec {s.code} — {s.desc} ({s.rate}%)</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Date of Deduction *</label>
          <input type="date" className="form-input" value={form.date} onChange={e=>set('date',e.target.value)}/>
        </div>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:14, marginBottom:14 }}>
        <div className="form-group">
          <label className="form-label">Gross Amount (₹)</label>
          <input type="number" className="form-input" placeholder="0.00" value={form.amount} onChange={e=>set('amount',e.target.value)}/>
        </div>
        <div className="form-group">
          <label className="form-label">TDS Rate (%)</label>
          <input type="number" className="form-input" step="0.01" value={form.tds_rate} onChange={e=>set('tds_rate',e.target.value)}/>
        </div>
        <div className="form-group">
          <label className="form-label">TDS Amount (₹)</label>
          <input type="number" className="form-input" value={form.tds_amount} onChange={e=>set('tds_amount',e.target.value)} style={{ fontWeight:700, color:'var(--c-primary)' }}/>
        </div>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:14, marginBottom:14 }}>
        <div className="form-group">
          <label className="form-label">Quarter</label>
          <select className="form-select" value={form.quarter} onChange={e=>set('quarter',e.target.value)}>
            {['Q1 FY25','Q2 FY25','Q3 FY25','Q4 FY25','Q1 FY24','Q2 FY24','Q3 FY24','Q4 FY24'].map(q=><option key={q}>{q}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Status</label>
          <select className="form-select" value={form.status} onChange={e=>set('status',e.target.value)}>
            {Object.entries(STATUS_COLORS).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Challan No.</label>
          <input className="form-input" style={{ fontFamily:'monospace' }} placeholder="e.g. CHL001" value={form.challan} onChange={e=>set('challan',e.target.value)}/>
        </div>
      </div>
      <div className="form-group" style={{ marginBottom:20 }}>
        <label className="form-label">Remarks</label>
        <input className="form-input" placeholder="Nature of payment" value={form.remarks} onChange={e=>set('remarks',e.target.value)}/>
      </div>
      <div style={{ display:'flex', gap:10, justifyContent:'flex-end', paddingTop:16, borderTop:'1px solid var(--c-border)' }}>
        <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>
        <button className="btn btn-primary" disabled={!form.deductee||!form.pan||!form.amount} onClick={()=>onSave(form)} style={{ minWidth:140 }}>
          {initial ? 'Update Entry' : 'Add TDS Entry'}
        </button>
      </div>
    </div>
  )
}

export default function TDSPage() {
  const { setActions, setContext, clear } = useTopbarStore()
  const [entries, setEntries]   = useState(INITIAL_ENTRIES)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing]   = useState(null)
  const [statusFilter, setStatusFilter] = useState('all')
  const [quarterFilter, setQuarterFilter] = useState('all')

  useEffect(() => {
    setContext('Finance', 'TDS Tracker')
    setActions(
      <button className="btn btn-primary" onClick={()=>{ setEditing(null); setFormOpen(true) }}>
        <Plus size={15}/> Add TDS Entry
      </button>
    )
    return clear
  }, [setActions, setContext, clear])

  const handleSave = (data) => {
    if (editing) {
      setEntries(p => p.map(e => e.id===editing.id ? {...data, id:editing.id} : e))
    } else {
      setEntries(p => [...p, { ...data, id: Date.now() }])
    }
    setFormOpen(false); setEditing(null)
  }

  const handleExport = () => {
    const headers = ['Deductee','PAN','Section','Date','Gross Amount','TDS Rate','TDS Amount','Quarter','Status','Challan','Remarks']
    const rows = filtered.map(e=>[e.deductee,e.pan,e.section,e.date,e.amount,`${e.tds_rate}%`,e.tds_amount,e.quarter,e.status,e.challan,e.remarks]
      .map(v=>`"${String(v||'').replace(/"/g,'""')}"`).join(','))
    const csv = [headers.join(','),...rows].join('\n')
    const a = document.createElement('a'); a.href='data:text/csv;charset=utf-8,'+encodeURIComponent(csv); a.download='tds_tracker.csv'; a.click()
  }

  const quarters = [...new Set(entries.map(e=>e.quarter).filter(Boolean))]
  const filtered = entries.filter(e => {
    const matchStatus  = statusFilter  === 'all' || e.status  === statusFilter
    const matchQuarter = quarterFilter === 'all' || e.quarter === quarterFilter
    return matchStatus && matchQuarter
  })

  const totalDeducted  = filtered.reduce((s,e)=>s+Number(e.tds_amount||0),0)
  const totalDeposited = filtered.filter(e=>e.status==='deposited').reduce((s,e)=>s+Number(e.tds_amount||0),0)
  const totalPending   = filtered.filter(e=>['pending','deducted'].includes(e.status)).reduce((s,e)=>s+Number(e.tds_amount||0),0)

  return (
    <div>
      {/* KPIs */}
      <div className="kpi-grid" style={{ gridTemplateColumns:'repeat(4,1fr)', marginBottom:20 }}>
        <div className="kpi-card blue"><div className="kpi-icon"><ShieldCheck size={20}/></div><div className="kpi-label">Total TDS Deducted</div><div className="kpi-value">{fmt.currency(totalDeducted)}</div><div className="kpi-sub">{filtered.length} entries</div></div>
        <div className="kpi-card green"><div className="kpi-icon"><CheckCircle2 size={20}/></div><div className="kpi-label">Deposited to Govt</div><div className="kpi-value">{fmt.currency(totalDeposited)}</div><div className="kpi-sub">{filtered.filter(e=>e.status==='deposited').length} challans</div></div>
        <div className="kpi-card orange"><div className="kpi-icon"><Clock size={20}/></div><div className="kpi-label">Pending Deposit</div><div className="kpi-value">{fmt.currency(totalPending)}</div><div className="kpi-sub">{filtered.filter(e=>['pending','deducted'].includes(e.status)).length} entries</div></div>
        <div className="kpi-card red"><div className="kpi-icon"><AlertCircle size={20}/></div><div className="kpi-label">Overdue</div><div className="kpi-value">{fmt.currency(filtered.filter(e=>e.status==='overdue').reduce((s,e)=>s+Number(e.tds_amount||0),0))}</div><div className="kpi-sub">{filtered.filter(e=>e.status==='overdue').length} entries</div></div>
      </div>

      {/* TDS Section Reference */}
      <div className="card" style={{ marginBottom:20, padding:'16px 20px' }}>
        <div style={{ fontWeight:700, fontSize:13, marginBottom:12 }}>TDS Section Reference (Common Sections)</div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))', gap:8 }}>
          {TDS_SECTIONS.map(s=>(
            <div key={s.code} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 12px', background:'var(--c-surface2)', borderRadius:8, border:'1px solid var(--c-border)' }}>
              <span style={{ padding:'2px 8px', borderRadius:6, background:'var(--c-primary)', color:'white', fontSize:10, fontWeight:800, flexShrink:0 }}>Sec {s.code}</span>
              <span style={{ fontSize:12, flex:1, color:'var(--c-text2)' }}>{s.desc}</span>
              <span style={{ fontSize:11, fontWeight:700, color:'var(--c-primary)', flexShrink:0 }}>{s.rate}%</span>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        {/* Filter bar */}
        <div className="filter-bar" style={{ padding:'14px 20px', borderBottom:'1px solid var(--c-border)' }}>
          <div className="pill-tabs">
            {[{id:'all',label:'ALL'},{id:'deducted',label:'DEDUCTED'},{id:'deposited',label:'DEPOSITED'},{id:'pending',label:'PENDING'},{id:'overdue',label:'OVERDUE'}].map(t=>(
              <button key={t.id} className={'pill-tab'+(statusFilter===t.id?' active':'')} onClick={()=>setStatusFilter(t.id)}>{t.label}</button>
            ))}
          </div>
          <div className="spacer"/>
          <select className="form-select sm" style={{ width:140 }} value={quarterFilter} onChange={e=>setQuarterFilter(e.target.value)}>
            <option value="all">All Quarters</option>
            {quarters.map(q=><option key={q} value={q}>{q}</option>)}
          </select>
          <button className="btn btn-ghost" onClick={handleExport} style={{ gap:6 }}><Download size={14}/> Export</button>
        </div>

        <div className="table-wrap"><table>
          <thead><tr><th>Deductee</th><th>PAN</th><th>Section</th><th>Date</th><th style={{textAlign:'right'}}>Gross Amt</th><th style={{textAlign:'right'}}>Rate</th><th style={{textAlign:'right'}}>TDS Amount</th><th>Quarter</th><th>Challan</th><th>Status</th><th style={{width:80}}></th></tr></thead>
          <tbody>
            {filtered.map((e,i)=>{
              const s = STATUS_COLORS[e.status]||STATUS_COLORS.pending
              return (
                <tr key={e.id} style={{background:i%2===0?'transparent':'var(--c-surface2)'}}>
                  <td><div style={{fontWeight:600}}>{e.deductee}</div><div style={{fontSize:11,color:'var(--c-text3)'}}>{e.remarks}</div></td>
                  <td style={{fontFamily:'monospace',fontSize:12,fontWeight:600,color:'var(--c-text2)'}}>{e.pan}</td>
                  <td><span style={{padding:'2px 8px',borderRadius:6,background:'var(--c-primary-lt)',color:'var(--c-primary)',fontSize:10,fontWeight:700}}>Sec {e.section}</span></td>
                  <td style={{fontSize:12,color:'var(--c-text2)'}}>{e.date}</td>
                  <td style={{textAlign:'right',fontFamily:'monospace'}}>{fmt.currency(e.amount)}</td>
                  <td style={{textAlign:'right',fontSize:12,fontWeight:600}}>{e.tds_rate}%</td>
                  <td style={{textAlign:'right',fontFamily:'monospace',fontWeight:700,color:'var(--c-primary)'}}>{fmt.currency(e.tds_amount)}</td>
                  <td style={{fontSize:12,color:'var(--c-text2)'}}>{e.quarter}</td>
                  <td style={{fontFamily:'monospace',fontSize:11,color:e.challan?'var(--c-green)':'var(--c-text3)'}}>{e.challan||'—'}</td>
                  <td><span style={{padding:'3px 10px',borderRadius:999,fontSize:10,fontWeight:700,background:s.bg,color:s.color}}>{s.label}</span></td>
                  <td>
                    <div style={{display:'flex',gap:4}}>
                      <button className="topbar-icon-btn" onClick={()=>{setEditing(e);setFormOpen(true)}}><Edit2 size={13}/></button>
                      <button className="topbar-icon-btn" style={{color:'var(--c-danger)'}} onClick={()=>setEntries(p=>p.filter(x=>x.id!==e.id))}><Trash2 size={13}/></button>
                    </div>
                  </td>
                </tr>
              )
            })}
            {filtered.length===0&&<tr><td colSpan={11} style={{textAlign:'center',padding:48,color:'var(--c-text3)'}}>No TDS entries found</td></tr>}
          </tbody>
          {filtered.length>0&&(
            <tfoot>
              <tr style={{borderTop:'2px solid var(--c-border)',background:'var(--c-surface2)',fontWeight:800}}>
                <td colSpan={6} style={{padding:'10px 14px',fontSize:12}}>{filtered.length} entries</td>
                <td style={{textAlign:'right',padding:'10px 14px',fontFamily:'monospace',fontSize:14,color:'var(--c-primary)'}}>{fmt.currency(totalDeducted)}</td>
                <td colSpan={4}/>
              </tr>
            </tfoot>
          )}
        </table></div>
      </div>

      {formOpen && (
        <Modal title={editing?'Edit TDS Entry':'New TDS Entry'} onClose={()=>{setFormOpen(false);setEditing(null)}} size="lg">
          <TDSForm initial={editing} onSave={handleSave} onCancel={()=>{setFormOpen(false);setEditing(null)}}/>
        </Modal>
      )}
    </div>
  )
}
