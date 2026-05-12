import { useEffect, useState } from 'react'
import { useTopbarStore } from '@/store/topbarStore'
import { EmptyState } from '@/components/ui'
import { FileText, CreditCard, Plus, ChevronLeft, Search } from 'lucide-react'

const AP_NAV = [
  { label: 'A/P Down Payments', icon: CreditCard, id: 'ap_down' },
  { label: 'A/P Invoices', icon: FileText, id: 'ap_inv' },
  { label: 'A/P Credit Memos', icon: FileText, id: 'ap_credit' },
  { label: 'A/P Reserve Invoices', icon: FileText, id: 'ap_reserve' },
]

const HEADER_CONFIG = {
  ap_down: ['REQUEST NO', 'VENDOR', 'DATE', 'TOTAL AMOUNT', 'STATUS'],
  ap_inv: ['INVOICE NO', 'VENDOR', 'POSTING DATE', 'DUE DATE', 'TOTAL DUE', 'STATUS'],
  ap_credit: ['MEMO NO', 'VENDOR', 'DATE', 'REF NO', 'TOTAL AMOUNT', 'STATUS'],
  ap_reserve: ['RESERVE NO', 'VENDOR', 'DATE', 'DUE DATE', 'TOTAL', 'STATUS'],
}

const STATUS_OPTS = ['all', 'draft', 'open', 'closed', 'paid']

export default function APHandlePage() {
  const { setActions, setContext, clear } = useTopbarStore()
  const [activeTab, setActiveTab] = useState('ap_inv')
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [collapsed, setCollapsed] = useState(false)

  const data = []
  const headers = HEADER_CONFIG[activeTab] || []

  useEffect(() => {
    const activeLabel = AP_NAV.find(n => n.id === activeTab)?.label || 'A/P'
    setContext('A/P Handle', activeLabel)
    setActions(
      <button className="btn btn-primary" onClick={() => {}}>
        <Plus size={15} /> New {activeLabel.replace(/s$/, '')}
      </button>
    )
    return clear
  }, [setActions, setContext, clear, activeTab])

  return (
    <div className="secondary-layout">
      <aside className={`secondary-sidebar${collapsed ? ' collapsed' : ''}`}>
        <div className="secondary-sidebar-title">
          <span>Financial Payables</span>
          <button className="secondary-header-toggle" onClick={() => setCollapsed(!collapsed)} title={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}>
            <ChevronLeft size={16} />
          </button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {AP_NAV.map((item) => (
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
              placeholder={`Search ${AP_NAV.find(n => n.id === activeTab)?.label.toLowerCase()}...`} 
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
                        icon={<FileText size={48} />} 
                        title={`No ${AP_NAV.find(n => n.id === activeTab)?.label.toLowerCase()} found`}
                        description={search || filter !== 'all' ? "Try adjusting your filters or search terms." : `Manage your vendor liabilities and accounts payable.`}
                        action={
                          <button className="btn btn-primary" onClick={() => {}}>
                            <Plus size={15} /> Create {AP_NAV.find(n => n.id === activeTab)?.label.replace(/s$/, '')}
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
      </main>
    </div>
  )
}
