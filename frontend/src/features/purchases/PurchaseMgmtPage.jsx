import { useEffect, useState } from 'react'
import { useTopbarStore } from '@/store/topbarStore'
import { EmptyState } from '@/components/ui'
import { 
  ShoppingBag, Plus, ClipboardList, FileCheck, ShieldCheck,
  ChevronLeft, Search
} from 'lucide-react'
import PurchaseOrderModal from './PurchaseOrderModal'

const PUR_NAV = [
  { label: 'Blanket Agreements', icon: ShieldCheck, id: 'blanket' },
  { label: 'Purchase Requests', icon: ClipboardList, id: 'requests' },
  { label: 'Purchase Quotations', icon: FileCheck, id: 'quotes' },
  { label: 'Purchase Orders', icon: ShoppingBag, id: 'orders' },
]

const HEADER_CONFIG = {
  blanket: ['AGREEMENT NO', 'VENDOR', 'START DATE', 'END DATE', 'TOTAL AMOUNT', 'STATUS'],
  requests: ['REQUEST NO', 'REQUESTER', 'POSTING DATE', 'REQUIRED DATE', 'STATUS'],
  quotes: ['QUOTATION NO', 'VENDOR', 'VALID UNTIL', 'TOTAL AMOUNT', 'STATUS'],
  orders: ['ORDER NO', 'VENDOR', 'POSTING DATE', 'DELIVERY DATE', 'TOTAL AMOUNT', 'STATUS'],
}

const STATUS_OPTS = ['all', 'draft', 'open', 'closed']

export default function PurchaseMgmtPage() {
  const { setActions, setContext, clear } = useTopbarStore()
  const [activeTab, setActiveTab] = useState('orders')
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [collapsed, setCollapsed] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)

  const data = []
  const headers = HEADER_CONFIG[activeTab] || []

  useEffect(() => {
    const activeLabel = PUR_NAV.find(n => n.id === activeTab)?.label || 'Purchasing'
    setContext('Purchase Management', activeLabel)
    setActions(
      <button className="btn btn-primary" onClick={() => setModalOpen(true)}>
        <Plus size={15} /> New {activeLabel.replace(/s$/, '')}
      </button>
    )
    return clear
  }, [setActions, setContext, clear, activeTab])

  return (
    <div className="secondary-layout">
      <aside className={`secondary-sidebar${collapsed ? ' collapsed' : ''}`}>
        <div className="secondary-sidebar-title">
          <span>Strategic Sourcing</span>
          <button className="secondary-header-toggle" onClick={() => setCollapsed(!collapsed)} title={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}>
            <ChevronLeft size={16} />
          </button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {PUR_NAV.map((item) => (
            <div 
              key={item.id} 
              className={`secondary-nav-item${activeTab === item.id ? ' active' : ''}`}
              onClick={() => { setActiveTab(item.id); setSearch(''); setFilter('all'); }}
              title={collapsed ? item.label : ''}
            >
              <item.icon size={16} />
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      </aside>

      <main className="secondary-content">
        <div className="filter-bar" style={{ marginBottom: 20 }}>
          <div className="search-wrap" style={{ width: 320 }}>
            <Search className="search-icon" />
            <input 
              className="form-input" 
              style={{ paddingLeft: 34 }} 
              placeholder={`Search ${PUR_NAV.find(n => n.id === activeTab)?.label.toLowerCase()}...`} 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="spacer" />
          <div className="pill-tabs">
            {STATUS_OPTS.map(s => (
              <button 
                key={s} 
                className={`pill-tab${filter === s ? ' active' : ''}`}
                onClick={() => setFilter(s)}
              >
                {s.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-wrap">
            <table className="compact">
              <thead>
                <tr>
                  {headers.map(h => <th key={h}>{h}</th>)}
                  <th style={{ width: 40 }}></th>
                </tr>
              </thead>
              <tbody>
                {data.length === 0 ? (
                  <tr>
                    <td colSpan={headers.length + 1} style={{ padding: '80px 0' }}>
                      <EmptyState 
                        icon={<ShoppingBag size={48} />} 
                        title={`No ${PUR_NAV.find(n => n.id === activeTab)?.label.toLowerCase()} found`}
                        description={search || filter !== 'all' ? "Try adjusting your filters or search terms." : `Manage your ${PUR_NAV.find(n => n.id === activeTab)?.label.toLowerCase()} and procurement lifecycle here.`}
                        action={
                          <button className="btn btn-primary" onClick={() => setModalOpen(true)}>
                            <Plus size={15} /> Create {PUR_NAV.find(n => n.id === activeTab)?.label.replace(/s$/, '')}
                          </button>
                        }
                      />
                    </td>
                  </tr>
                ) : (
                  data.map(item => <tr key={item.id}></tr>)
                )}
              </tbody>
            </table>
          </div>
        </div>

        <PurchaseOrderModal 
          isOpen={modalOpen} 
          onClose={() => setModalOpen(false)} 
          onSave={() => setModalOpen(false)} 
        />
      </main>
    </div>
  )
}
