import { Package, TrendingUp, AlertTriangle, BarChart2, DollarSign, Activity } from 'lucide-react'
import { fmt } from '@/lib/utils'

const Card = ({ icon: Icon, label, value, sub, color, bg }) => (
  <div style={{ background: bg, borderRadius: 12, padding: '14px 16px', border: `1px solid ${color}22` }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
      <div style={{ width: 26, height: 26, borderRadius: 7, background: color + '22', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={13} color={color} />
      </div>
      <span style={{ fontSize: 11, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
    </div>
    <div style={{ fontSize: 21, fontWeight: 800, color, lineHeight: 1, marginBottom: 4 }}>{value}</div>
    <div style={{ fontSize: 11, color: '#64748b' }}>{sub}</div>
  </div>
)

export default function ProcurementKPIs({ data }) {
  const { total, active, totalStockValue, totalRetailValue, lowStock, zeroStock, potentialProfit, avgMargin } = data
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 24 }}>
      <Card icon={Package}      label="Total Products"    value={total}                                       sub={`${active} active · ${total - active} inactive`}            color="#6366f1" bg="#eef2ff" />
      <Card icon={DollarSign}   label="Inventory Value"   value={fmt.currency(totalStockValue)}               sub={`Retail: ${fmt.currency(totalRetailValue)}`}                 color="#f59e0b" bg="#fffbeb" />
      <Card icon={TrendingUp}   label="Potential Profit"  value={fmt.currency(potentialProfit)}               sub={`Avg margin: ${avgMargin.toFixed(1)}%`}                      color="#10b981" bg="#ecfdf5" />
      <Card icon={AlertTriangle} label="Stock Alerts"     value={lowStock.length}                             sub={`${zeroStock.length} out of stock`}                          color={lowStock.length > 0 ? '#ef4444' : '#10b981'} bg={lowStock.length > 0 ? '#fef2f2' : '#ecfdf5'} />
    </div>
  )
}
