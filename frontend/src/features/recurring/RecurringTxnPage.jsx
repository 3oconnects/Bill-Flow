import { useEffect, useState } from 'react'
import { useTopbarStore } from '@/store/topbarStore'
import { EmptyState } from '@/components/ui'
import { RefreshCw, Plus, ChevronLeft } from 'lucide-react'

const REC_NAV = [
  { label: 'Purchase Templates', icon: RefreshCw, id: 'pur_tpl' },
  { label: 'Automated Payments', icon: RefreshCw, id: 'auto_pay' },
]

export default function RecurringTxnPage() {
  const { setActions, setContext, clear } = useTopbarStore()
  const [activeTab, setActiveTab] = useState('pur_tpl')
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    const activeLabel = REC_NAV.find(n => n.id === activeTab)?.label || 'Recurring'
    setContext('Recurring Transactions', activeLabel)
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
          <span>Automation</span>
          <button className="secondary-header-toggle" onClick={() => setCollapsed(!collapsed)} title={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}>
            <ChevronLeft size={16} />
          </button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {REC_NAV.map((item) => (
            <div 
              key={item.id} 
              className={`secondary-nav-item${activeTab === item.id ? ' active' : ''}`}
              onClick={() => setActiveTab(item.id)}
              title={collapsed ? item.label : ''}
            >
              <item.icon size={16} />
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      </aside>

      <main className="secondary-content">
        <div className="card">
          <EmptyState 
            icon={<RefreshCw size={48} />} 
            title={`No ${REC_NAV.find(n => n.id === activeTab)?.label.toLowerCase()} found`}
            description={`Set up and manage your automated financial workflows.`}
            action={
              <button className="btn btn-primary" onClick={() => {}}>
                <Plus size={15} /> New {REC_NAV.find(n => n.id === activeTab)?.label.replace(/s$/, '')}
              </button>
            }
          />
        </div>
      </main>
    </div>
  )
}
