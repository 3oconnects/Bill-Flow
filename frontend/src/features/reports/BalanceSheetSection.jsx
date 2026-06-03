import { useQuery } from '@tanstack/react-query'
import { reportsApi } from '@/api'
import { fmt } from '@/lib/utils'
import { PageLoading } from '@/components/ui'

export default function BalanceSheetSection() {
  const { data, isLoading } = useQuery({ queryKey: ['balance-sheet'], queryFn: reportsApi.balanceSheet })
  if (isLoading) return <PageLoading/>
  const d = data || { assets: [], liabilities: [], equity: [] }

  const totalAssets = d.assets.reduce((s,r) => s + Number(r.balance), 0)
  const totalLiab = d.liabilities.reduce((s,r) => s + Number(r.balance), 0)
  const totalEquity = d.equity.reduce((s,r) => s + Number(r.balance), 0)

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--c-border)', fontWeight: 700, fontSize: 14, background: '#f8fafc' }}>Assets</div>
        <div className="table-wrap"><table>
          <thead><tr><th>Account Name</th><th style={{ textAlign: 'right' }}>Balance</th></tr></thead>
          <tbody>
            {d.assets.map((r,i) => (
              <tr key={r.account_name} style={{ background: i%2===0?'transparent':'var(--c-surface2)' }}>
                <td style={{ fontWeight: 600 }}>{r.account_name}</td>
                <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{fmt.currency(r.balance)}</td>
              </tr>
            ))}
            {d.assets.length===0 && <tr><td colSpan={2} style={{ textAlign:'center', padding:24, color:'var(--c-text3)' }}>No asset accounts found</td></tr>}
          </tbody>
          <tfoot>
            <tr style={{ background: '#f1f5f9', borderTop: '2px solid var(--c-border)' }}>
              <td style={{ fontWeight: 700 }}>Total Assets</td>
              <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 800, color: 'var(--c-indigo)' }}>{fmt.currency(totalAssets)}</td>
            </tr>
          </tfoot>
        </table></div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--c-border)', fontWeight: 700, fontSize: 14, background: '#f8fafc' }}>Liabilities</div>
          <div className="table-wrap"><table>
            <thead><tr><th>Account Name</th><th style={{ textAlign: 'right' }}>Balance</th></tr></thead>
            <tbody>
              {d.liabilities.map((r,i) => (
                <tr key={r.account_name} style={{ background: i%2===0?'transparent':'var(--c-surface2)' }}>
                  <td style={{ fontWeight: 600 }}>{r.account_name}</td>
                  <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{fmt.currency(r.balance)}</td>
                </tr>
              ))}
              {d.liabilities.length===0 && <tr><td colSpan={2} style={{ textAlign:'center', padding:24, color:'var(--c-text3)' }}>No liability accounts found</td></tr>}
            </tbody>
            <tfoot>
              <tr style={{ background: '#f1f5f9', borderTop: '2px solid var(--c-border)' }}>
                <td style={{ fontWeight: 700 }}>Total Liabilities</td>
                <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 800, color: 'var(--c-rose)' }}>{fmt.currency(totalLiab)}</td>
              </tr>
            </tfoot>
          </table></div>
        </div>

        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--c-border)', fontWeight: 700, fontSize: 14, background: '#f8fafc' }}>Equity</div>
          <div className="table-wrap"><table>
            <thead><tr><th>Account Name</th><th style={{ textAlign: 'right' }}>Balance</th></tr></thead>
            <tbody>
              {d.equity.map((r,i) => (
                <tr key={r.account_name} style={{ background: i%2===0?'transparent':'var(--c-surface2)' }}>
                  <td style={{ fontWeight: 600 }}>{r.account_name}</td>
                  <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{fmt.currency(r.balance)}</td>
                </tr>
              ))}
              {d.equity.length===0 && <tr><td colSpan={2} style={{ textAlign:'center', padding:24, color:'var(--c-text3)' }}>No equity accounts found</td></tr>}
            </tbody>
            <tfoot>
              <tr style={{ background: '#f1f5f9', borderTop: '2px solid var(--c-border)' }}>
                <td style={{ fontWeight: 700 }}>Total Equity</td>
                <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 800 }}>{fmt.currency(totalEquity)}</td>
              </tr>
            </tfoot>
          </table></div>
        </div>

        <div className="card" style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--c-surface)' }}>
          <div style={{ fontWeight: 700, fontSize: 14 }}>Total Liabilities & Equity</div>
          <div style={{ fontSize: 18, fontFamily: 'monospace', fontWeight: 800, color: totalAssets === (totalLiab + totalEquity) ? 'var(--c-emerald)' : 'var(--c-amber)' }}>
            {fmt.currency(totalLiab + totalEquity)}
          </div>
        </div>
      </div>
    </div>
  )
}
