import { useEffect, useState } from 'react'
import { useTopbarStore } from '@/store/topbarStore'
import {
  ShoppingBag, ClipboardList, FileCheck, ShieldCheck,
  ChevronLeft, Construction, Sparkles,
} from 'lucide-react'

const PUR_NAV = [
  {
    id: 'blanket',  label: 'Blanket Agreements', icon: ShieldCheck,
    summary: 'Long-term price contracts with vendors. Release POs against the agreement as needed.',
    useCase: 'A multi-year supply contract with Acme — fix the unit price, draw POs whenever stock dips.',
  },
  {
    id: 'requests', label: 'Purchase Requests',  icon: ClipboardList,
    summary: 'Internal requests from a department or warehouse that procurement approves into a PO.',
    useCase: 'Warehouse: "Need 50 SKU-1002" → Approver: review → convert to PO.',
  },
  {
    id: 'quotes',   label: 'Purchase Quotations', icon: FileCheck,
    summary: 'RFQs sent to vendors to compare prices before committing to a Purchase Order.',
    useCase: 'Send an RFQ to 3 vendors, compare quotes, pick the lowest, convert to a PO.',
  },
  {
    id: 'orders',   label: 'Purchase Orders',     icon: ShoppingBag,
    summary: 'Formal commitments to a vendor. Goods Receipts and AP Invoices flow off of these.',
    useCase: 'Acme PO-0124, 50 units @ ₹820, expected delivery Jul 15 → receipt → AP invoice → pay.',
  },
]

export default function PurchaseMgmtPage() {
  const { setActions, setContext, clear } = useTopbarStore()
  const [activeTab, setActiveTab] = useState('orders')
  const [collapsed, setCollapsed] = useState(false)

  const current = PUR_NAV.find(n => n.id === activeTab)

  useEffect(() => {
    setContext('Purchase Management', current?.label || 'Strategic Sourcing')
    setActions(null)
    return clear
  }, [setActions, setContext, clear, activeTab]) // eslint-disable-line

  return (
    <div className="secondary-layout">
      <aside className={`secondary-sidebar${collapsed ? ' collapsed' : ''}`}>
        <div className="secondary-sidebar-title">
          <span>Strategic Sourcing</span>
          <button className="secondary-header-toggle"
            onClick={() => setCollapsed(!collapsed)}
            title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}>
            <ChevronLeft size={16} />
          </button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {PUR_NAV.map((item) => (
            <div key={item.id}
              className={`secondary-nav-item${activeTab === item.id ? ' active' : ''}`}
              onClick={() => setActiveTab(item.id)}
              title={collapsed ? item.label : ''}>
              <item.icon size={16} />
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      </aside>

      <main className="secondary-content">
        <div style={{
          maxWidth: 720, margin: '60px auto', padding: 32,
          background: 'var(--c-surface)', border: '1px solid var(--c-border)',
          borderRadius: 14, textAlign: 'center',
        }}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%',
            background: 'var(--c-primary-lt)', color: 'var(--c-primary)',
            margin: '0 auto 18px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Construction size={32} />
          </div>

          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: '#f3effe', color: '#6b3fd4',
            padding: '4px 12px', borderRadius: 99, fontSize: 11,
            fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase',
            marginBottom: 14,
          }}>
            <Sparkles size={11} /> Coming Soon
          </div>

          <h2 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 8px', color: 'var(--c-text)' }}>
            {current?.label}
          </h2>

          <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--c-text2)', margin: '0 0 22px' }}>
            {current?.summary}
          </p>

          <div style={{
            background: 'var(--c-surface2, var(--c-bg))',
            border: '1px solid var(--c-border)', borderRadius: 10,
            padding: '14px 18px', textAlign: 'left',
            fontSize: 12, color: 'var(--c-text2)', marginBottom: 22,
          }}>
            <div style={{
              fontSize: 10, fontWeight: 700, color: 'var(--c-text3)',
              textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6,
            }}>
              Example scenario
            </div>
            {current?.useCase}
          </div>

          <p style={{ fontSize: 12, color: 'var(--c-text3)', margin: 0 }}>
            This module is being built out. In the meantime, you can still manage AP invoices,
            vendor payments, goods receipts and returns from the rest of the Purchasing area.
          </p>
        </div>
      </main>
    </div>
  )
}
