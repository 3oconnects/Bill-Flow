import { useQuery } from '@tanstack/react-query'
import { reportsApi } from '@/api'
import { fmt } from '@/lib/utils'
import { PageLoading } from '@/components/ui'

export default function TrialBalanceSection() {
  const { data, isLoading } = useQuery({ queryKey: ['trial-balance'], queryFn: reportsApi.trialBalance })
  if (isLoading) return <PageLoading/>
  const d = data || []

  const totalDebit = d.reduce((s,r) => s + Number(r.debit), 0)
  const totalCredit = d.reduce((s,r) => s + Number(r.credit), 0)
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--c-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontWeight: 700, fontSize: 14 }}>Trial Balance</div>
        {!isBalanced && <div style={{ fontSize: 12, fontWeight: 700, color: '#fff', background: 'var(--c-red)', padding: '4px 10px', borderRadius: 6 }}>Unbalanced (Difference: {fmt.currency(Math.abs(totalDebit - totalCredit))})</div>}
        {isBalanced && <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--c-emerald)', background: 'var(--c-emerald-lt)', padding: '4px 10px', borderRadius: 6 }}>Balanced</div>}
      </div>
      <div className="table-wrap"><table>
        <thead><tr><th>Account Name</th><th>Account Type</th><th style={{ textAlign: 'right' }}>Debit</th><th style={{ textAlign: 'right' }}>Credit</th></tr></thead>
        <tbody>
          {d.map((r,i) => (
            <tr key={r.account_name} style={{ background: i%2===0?'transparent':'var(--c-surface2)' }}>
              <td style={{ fontWeight: 600 }}>{r.account_name}</td>
              <td><span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11, background: 'var(--c-surface2)', color: 'var(--c-text3)', textTransform: 'uppercase' }}>{r.account_type}</span></td>
              <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{Number(r.debit) > 0 ? fmt.currency(r.debit) : '—'}</td>
              <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{Number(r.credit) > 0 ? fmt.currency(r.credit) : '—'}</td>
            </tr>
          ))}
          {d.length===0 && <tr><td colSpan={4} style={{ textAlign:'center', padding:48, color:'var(--c-text3)' }}>No data available</td></tr>}
        </tbody>
        <tfoot>
          <tr style={{ background: '#f1f5f9', borderTop: '2px solid var(--c-border)' }}>
            <td colSpan={2} style={{ fontWeight: 700, textAlign: 'right' }}>Totals</td>
            <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 800 }}>{fmt.currency(totalDebit)}</td>
            <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 800 }}>{fmt.currency(totalCredit)}</td>
          </tr>
        </tfoot>
      </table></div>
    </div>
  )
}
