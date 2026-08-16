import { useEffect, useState } from 'react'
import { useTopbarStore } from '@/store/topbarStore'
import {
  ShoppingBag, ClipboardList, FileCheck, ShieldCheck,
  ChevronLeft, Construction, Sparkles,
} from 'lucide-react'
import PurchaseQuotationsTab from './PurchaseQuotationsTab'
import PurchaseOrdersTab from './PurchaseOrdersTab'
import BlanketAgreementsTab from './BlanketAgreementsTab'
import PurchaseRequestsTab from './PurchaseRequestsTab'

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

      <main className="secondary-content" style={{ display: 'flex', flexDirection: 'column' }}>
        {activeTab === 'blanket' && <BlanketAgreementsTab />}
        {activeTab === 'requests' && <PurchaseRequestsTab />}
        {activeTab === 'quotes' && <PurchaseQuotationsTab />}
        {activeTab === 'orders' && <PurchaseOrdersTab />}
      </main>
    </div>
  )
}
