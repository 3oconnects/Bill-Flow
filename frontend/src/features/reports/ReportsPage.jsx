import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { reportsApi } from '@/api'
import { useTopbarStore } from '@/store/topbarStore'
import { PageLoading } from '@/components/ui'
import {
  BarChart2, FileText, Clock, TrendingUp, ShieldCheck, Tag, Target, CalendarDays, ChevronLeft
} from 'lucide-react'
import OverviewSection from './sections/OverviewSection'
import PLSection from './sections/PLSection'
import AgedSection from './sections/AgedSection'
import CashFlowSection from './sections/CashFlowSection'
import GSTSection from './sections/GSTSection'
import ExpenseAnalyticsSection from './sections/ExpenseAnalyticsSection'
import APAgingSection from './sections/APAgingSection'
import BalanceSheetSection from './sections/BalanceSheetSection'
import TrialBalanceSection from './sections/TrialBalanceSection'

const NAV = [
  { id: 'overview', label: 'Financial Overview', icon: BarChart2,   group: 'Dashboards' },
  { id: 'expenses', label: 'Expense Analytics',  icon: Tag,         group: 'Dashboards' },
  { id: 'pl',       label: 'Profit & Loss',      icon: TrendingUp,  group: 'Financial Statements' },
  { id: 'balance',  label: 'Balance Sheet',      icon: Target,      group: 'Financial Statements' },
  { id: 'cashflow', label: 'Cash Flow',          icon: CalendarDays,group: 'Financial Statements' },
  { id: 'trial',    label: 'Trial Balance',      icon: FileText,    group: 'Financial Statements' },
  { id: 'aged',     label: 'Aged Receivables (AR)',icon: Clock,     group: 'Ledgers' },
  { id: 'apaging',  label: 'Aged Payables (AP)',   icon: Clock,     group: 'Ledgers' },
  { id: 'gst',      label: 'GST Summary',        icon: ShieldCheck, group: 'Tax' },
]

export default function ReportsPage() {
  const { setActions, setContext, clear } = useTopbarStore()
  const [activeSection, setActiveSection] = useState('overview')
  const [collapsed, setCollapsed] = useState(false)

  const { data, isLoading } = useQuery({ queryKey: ['reports-summary'], queryFn: reportsApi.summary })

  useEffect(() => {
    const nav = NAV.find(n => n.id === activeSection)
    setContext('Finance', nav?.label || 'Reports')
    setActions(null)
    return clear
  }, [setActions, setContext, clear, activeSection])

  if (isLoading && activeSection === 'overview') return <PageLoading/>

  const groups = [...new Set(NAV.map(n => n.group))]
  const s = data || {}

  return (
    <div className="secondary-layout">
      {/* Sidebar */}
      <aside className={'secondary-sidebar' + (collapsed ? ' collapsed' : '')}>
        <div className="secondary-sidebar-title">
          <span>Finance</span>
          <button className="secondary-header-toggle" onClick={() => setCollapsed(c => !c)} title={collapsed ? 'Expand' : 'Collapse'}>
            <ChevronLeft size={16}/>
          </button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {groups.map(group => (
            <div key={group}>
              {!collapsed && (
                <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--c-text3)', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '10px 12px 4px', marginTop: 4 }}>
                  {group}
                </div>
              )}
              {NAV.filter(n => n.group === group).map(item => (
                <div key={item.id}
                  className={'secondary-nav-item' + (activeSection === item.id ? ' active' : '')}
                  onClick={() => setActiveSection(item.id)}
                  title={collapsed ? item.label : ''}
                >
                  <item.icon size={16}/>
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </aside>

      {/* Main content */}
      <main className="secondary-content">
        {activeSection === 'overview'  && <OverviewSection s={s}/>}
        {activeSection === 'pl'        && <PLSection/>}
        {activeSection === 'aged'      && <AgedSection/>}
        {activeSection === 'cashflow'  && <CashFlowSection/>}
        {activeSection === 'gst'       && <GSTSection/>}
        {activeSection === 'expenses'  && <ExpenseAnalyticsSection/>}
        {activeSection === 'balance'   && <BalanceSheetSection/>}
        {activeSection === 'trial'     && <TrialBalanceSection/>}
        {activeSection === 'apaging'   && <APAgingSection/>}
      </main>
    </div>
  )
}
