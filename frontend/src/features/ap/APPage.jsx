import { useState, useEffect, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import { useTopbarStore } from '@/store/topbarStore'
import { ChevronLeft, Plus, CreditCard, FileText, FileMinus, FileCheck } from 'lucide-react'
import { Modal } from '@/components/ui'
import APDownPaymentsTab    from './tabs/APDownPaymentsTab'
import APInvoicesTab        from './tabs/APInvoicesTab'
import APCreditMemosTab     from './tabs/APCreditMemosTab'
import APReserveInvoicesTab from './tabs/APReserveInvoicesTab'
import APForm               from './APForm'
import APDetail             from './APDetail'

const AP_NAV = [
  { label: 'A/P Invoices',         id: 'invoices',         icon: FileText,   type: 'invoices' },
  { label: 'A/P Down Payments',    id: 'down-payments',    icon: CreditCard, type: 'down-payments' },
  { label: 'A/P Credit Memos',     id: 'credit-memos',     icon: FileMinus,  type: 'credit-memos' },
  { label: 'A/P Reserve Invoices', id: 'reserve-invoices', icon: FileCheck,  type: 'reserve-invoices' },
]

const MODAL_TITLES = {
  'invoices':         { create: 'New A/P Invoice',         edit: 'Edit A/P Invoice' },
  'down-payments':    { create: 'New A/P Down Payment',    edit: 'Edit A/P Down Payment' },
  'credit-memos':     { create: 'New A/P Credit Memo',     edit: 'Edit A/P Credit Memo' },
  'reserve-invoices': { create: 'New A/P Reserve Invoice', edit: 'Edit A/P Reserve Invoice' },
}

const CLOSED = { open: false, mode: null, docId: null }

export default function APPage() {
  const location = useLocation()
  const { setActions, setContext, clear } = useTopbarStore()
  const [collapsed, setCollapsed] = useState(false)
  const [modal, setModal]         = useState(CLOSED)
  const [modalFooter, setModalFooter] = useState(null)

  const hash      = location.hash.replace('#', '') || 'invoices'
  const activeTab = AP_NAV.find(n => n.id === hash)?.id || 'invoices'
  const activeNav = AP_NAV.find(n => n.id === activeTab)

  const openCreate  = useCallback(() => { setModalFooter(null); setModal({ open: true, mode: 'create', docId: null }) }, [])
  const openDetail  = useCallback((docId) => { setModalFooter(null); setModal({ open: true, mode: 'detail', docId }) }, [])
  const openEdit    = useCallback((docId) => { setModalFooter(null); setModal({ open: true, mode: 'edit', docId }) }, [])
  const closeModal  = useCallback(() => { setModal(CLOSED); setModalFooter(null) }, [])

  useEffect(() => { setModal(CLOSED); setModalFooter(null) }, [activeTab])

  useEffect(() => {
    setContext('Purchase & A/P', activeNav?.label || 'A/P Handle')
    setActions(
      <button className="btn btn-primary" onClick={openCreate}>
        <Plus size={15} /> New {activeNav?.label?.replace('A/P ', '') || 'Document'}
      </button>
    )
    return clear
  }, [activeTab])

  const TAB_MAP = {
    'invoices':         APInvoicesTab,
    'down-payments':    APDownPaymentsTab,
    'credit-memos':     APCreditMemosTab,
    'reserve-invoices': APReserveInvoicesTab,
  }
  const TabContent = TAB_MAP[activeTab] || APInvoicesTab

  const titles = MODAL_TITLES[activeTab] || {}
  const modalTitle = modal.mode === 'create' ? titles.create
    : modal.mode === 'edit'   ? titles.edit
    : activeNav?.label || 'Document'

  return (
    <div className="secondary-layout">

      {/* Sidebar */}
      <aside className={`secondary-sidebar${collapsed ? ' collapsed' : ''}`}>
        <div className="secondary-sidebar-title">
          <span>Accounts Payable</span>
          <button className="secondary-header-toggle"
            onClick={() => setCollapsed(c => !c)}
            title={collapsed ? 'Expand' : 'Collapse'}>
            <ChevronLeft size={16} style={{ transform: collapsed ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
          </button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {AP_NAV.map(item => {
            const Icon = item.icon
            return (
              <a key={item.id} href={`#${item.id}`}
                className={`secondary-nav-item${activeTab === item.id ? ' active' : ''}`}
                title={collapsed ? item.label : ''}
                style={{ textDecoration: 'none' }}>
                <Icon size={16} />
                {!collapsed && <span>{item.label}</span>}
              </a>
            )
          })}
        </div>
      </aside>

      {/* Main */}
      <main className="secondary-content">
        <TabContent type={activeTab} onRowClick={openDetail} />
      </main>

      {/* Popup Modal */}
      <Modal
        isOpen={modal.open}
        onClose={closeModal}
        title={modalTitle}
        size="xl"
        footer={modalFooter}
      >
        {(modal.mode === 'create' || modal.mode === 'edit') && (
          <APForm
            type={activeTab}
            docId={modal.mode === 'edit' ? modal.docId : null}
            onClose={closeModal}
            onSuccess={(id) => setModal({ open: true, mode: 'detail', docId: id })}
            onSetFooter={setModalFooter}
          />
        )}
        {modal.mode === 'detail' && modal.docId && (
          <APDetail
            type={activeTab}
            docId={modal.docId}
            onClose={closeModal}
            onEdit={(docId) => { setModalFooter(null); setModal({ open: true, mode: 'edit', docId }) }}
            onSetFooter={setModalFooter}
          />
        )}
      </Modal>
    </div>
  )
}
