import { useEffect, useState } from 'react'
import { useTopbarStore } from '@/store/topbarStore'
import { EmptyState } from '@/components/ui'
import { Truck, RotateCcw, Plus, Package, ChevronLeft, Search } from 'lucide-react'
import GoodsReceiptModal from './GoodsReceiptModal'
import GoodsReturnModal from './GoodsReturnModal'

const GOODS_NAV = [
  { label: 'Goods Receipt PO', icon: Truck, id: 'grpo' },
  { label: 'Goods Return Request', icon: RotateCcw, id: 'return_req' },
  { label: 'Goods Return', icon: RotateCcw, id: 'returns' },
]

const HEADER_CONFIG = {
  grpo: ['RECEIPT NO', 'VENDOR', 'BASE PO NO', 'POSTING DATE', 'WAREHOUSE', 'STATUS'],
  return_req: ['REQUEST NO', 'VENDOR', 'BASE RECEIPT', 'REASON', 'DATE', 'STATUS'],
  returns: ['RETURN NO', 'VENDOR', 'BASE RECEIPT NO', 'REASON', 'DATE', 'STATUS'],
}

const STATUS_OPTS = ['all', 'draft', 'open', 'closed']

export default function GoodsMgmtPage() {
  const { setActions, setContext, clear } = useTopbarStore()
  const [activeTab, setActiveTab] = useState('grpo')
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [collapsed, setCollapsed] = useState(false)
  const [grpoModalOpen, setGrpoModalOpen] = useState(false)
  const [returnModalOpen, setReturnModalOpen] = useState(false)

  const data = []
  const headers = HEADER_CONFIG[activeTab] || []

  useEffect(() => {
    const activeLabel = GOODS_NAV.find(n => n.id === activeTab)?.label || 'Inventory'
    setContext('Goods Management', activeLabel)
    
    const handleAction = () => {
      if (activeTab === 'grpo') setGrpoModalOpen(true)
      else setReturnModalOpen(true)
    }

    setActions(
      <button className="btn btn-primary" onClick={handleAction}>
        <Plus size={15} /> New {activeLabel.replace(/s$/, '')}
      </button>
    )
    return clear
  }, [setActions, setContext, clear, activeTab])

  return (
    <div className="secondary-layout">
      <aside className={`secondary-sidebar${collapsed ? ' collapsed' : ''}`}>
        <div className="secondary-sidebar-title">
          <span>Inventory Operations</span>
          <button className="secondary-header-toggle" onClick={() => setCollapsed(!collapsed)} title={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}>
            <ChevronLeft size={16} />
          </button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {GOODS_NAV.map((item) => (
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
              placeholder={`Search ${GOODS_NAV.find(n => n.id === activeTab)?.label.toLowerCase()}...`} 
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
                        icon={activeTab === 'grpo' ? <Truck size={48} /> : <RotateCcw size={48} />} 
                        title={`No ${GOODS_NAV.find(n => n.id === activeTab)?.label.toLowerCase()} found`}
                        description={search || filter !== 'all' ? "Try adjusting your filters or search terms." : `Track your incoming goods and manage returns.`}
                        action={
                          <button className="btn btn-primary" onClick={() => {
                            if (activeTab === 'grpo') setGrpoModalOpen(true)
                            else setReturnModalOpen(true)
                          }}>
                            <Plus size={15} /> Create {GOODS_NAV.find(n => n.id === activeTab)?.label.replace(/s$/, '')}
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

        <GoodsReceiptModal 
          isOpen={grpoModalOpen} 
          onClose={() => setGrpoModalOpen(false)} 
          onSave={() => setGrpoModalOpen(false)} 
        />

        <GoodsReturnModal 
          isOpen={returnModalOpen} 
          onClose={() => setReturnModalOpen(false)} 
          onSave={() => setReturnModalOpen(false)} 
        />
      </main>
    </div>
  )
}
