import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTopbarStore } from '@/store/topbarStore'
import { EmptyState, Badge, PageLoading, Modal } from '@/components/ui'
import { Truck, RotateCcw, Plus, Package, ChevronLeft, Search, Eye, Trash2, Pencil } from 'lucide-react'
import { toast } from '@/store/toastStore'
import GoodsReceiptModal from './GoodsReceiptModal'
import GoodsReturnModal from './GoodsReturnModal'
import { goodsReceiptsApi, goodsReturnsApi } from '@/api'
import { fmt } from '@/lib/utils'

const GOODS_NAV = [
  { label: 'Goods Receipt PO', icon: Truck, id: 'grpo' },
  { label: 'Goods Return', icon: RotateCcw, id: 'returns' },
]

const HEADER_CONFIG = {
  grpo: ['RECEIPT NO', 'VENDOR', 'BASE PO NO', 'POSTING DATE', 'WAREHOUSE', 'STATUS'],
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
  const [viewingItem, setViewingItem] = useState(null)
  const [viewingReturnItem, setViewingReturnItem] = useState(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState(null)
  const qc = useQueryClient()

  const deleteMut = useMutation({
    mutationFn: (id) => goodsReturnsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['goodsReturns'] })
      toast.success('Goods return deleted')
    },
    onError: (err) => toast.error(err?.response?.data?.error || 'Failed to delete return')
  })

  const { data: goodsReceipts = [], isLoading: isLoadingGR } = useQuery({ 
    queryKey: ['goodsReceipts'], 
    queryFn: goodsReceiptsApi.list 
  })

  const { data: goodsReturns = [], isLoading: isLoadingReturns } = useQuery({
    queryKey: ['goodsReturns'],
    queryFn: goodsReturnsApi.list
  })

  let data = []
  if (activeTab === 'grpo') {
    data = goodsReceipts
  } else if (activeTab === 'returns') {
    data = goodsReturns
  }
  
  if (filter !== 'all') {
    data = data.filter(d => d.status === filter)
  }
  if (search) {
    const s = search.toLowerCase()
    data = data.filter(d => 
      (d.receipt_number || '').toLowerCase().includes(s) ||
      (d.vendor_name || '').toLowerCase().includes(s)
    )
  }

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
                  data.map(item => (
                    <tr key={item.id}>
                        {activeTab === 'grpo' && (
                          <>
                            <td style={{ fontWeight: 600, color: 'var(--accent)' }}>{item.receipt_number}</td>
                            <td style={{ fontWeight: 500 }}>{item.vendor_name}</td>
                            <td style={{ color: 'var(--text-2)' }}>{item.base_po_no || '-'}</td>
                            <td style={{ color: 'var(--text-2)' }}>{item.posting_date ? fmt.date(item.posting_date) : '-'}</td>
                            <td style={{ color: 'var(--text-2)' }}>MAIN</td>
                            <td><Badge status={item.status} /></td>
                            <td>
                              <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                                <button className="btn-icon-sm" onClick={() => setViewingItem(item)} title="View Receipt">
                                  <Eye size={16} />
                                </button>
                                {item.status === 'draft' && (
                                  <button className="btn-icon-sm" onClick={() => {}} title="Edit Receipt">
                                    <Pencil size={16} />
                                  </button>
                                )}
                              </div>
                            </td>
                          </>
                        )}
                        {activeTab === 'returns' && (
                          <>
                            <td style={{ fontWeight: 600, color: 'var(--accent)' }}>{item.return_no}</td>
                            <td style={{ fontWeight: 500 }}>{item.vendor_name}</td>
                            <td style={{ color: 'var(--text-2)' }}>{item.base_receipt_no || '-'}</td>
                            <td style={{ color: 'var(--text-2)' }}>{item.remarks || '-'}</td>
                            <td style={{ color: 'var(--text-2)' }}>{item.return_date ? fmt.date(item.return_date) : '-'}</td>
                            <td><Badge status={item.status} /></td>
                            <td>
                              <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                                <button className="btn-icon-sm" onClick={() => setViewingReturnItem(item)} title="Edit Return">
                                  <Pencil size={16} />
                                </button>
                                <button 
                                  className="btn-icon-sm" 
                                  onClick={() => setDeleteConfirmId(item.id)} 
                                  title="Delete Return"
                                >
                                  <Trash2 size={16} color="var(--c-red)" />
                                </button>
                              </div>
                            </td>
                          </>
                        )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <GoodsReceiptModal 
          isOpen={grpoModalOpen || viewingItem !== null} 
          onClose={() => { setGrpoModalOpen(false); setViewingItem(null); }} 
          onSave={() => setGrpoModalOpen(false)} 
          initialData={viewingItem}
          readOnly={!!viewingItem}
        />

        <GoodsReturnModal 
          isOpen={returnModalOpen || !!viewingReturnItem} 
          onClose={() => { setReturnModalOpen(false); setViewingReturnItem(null) }} 
          onSave={() => { setReturnModalOpen(false); setViewingReturnItem(null) }} 
          initialData={viewingReturnItem}
        />

        <Modal
          isOpen={!!deleteConfirmId}
          onClose={() => setDeleteConfirmId(null)}
          title="Delete Goods Return"
          size="sm"
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => setDeleteConfirmId(null)}>Cancel</button>
              <button 
                className="btn btn-danger" 
                onClick={() => {
                  deleteMut.mutate(deleteConfirmId)
                  setDeleteConfirmId(null)
                }}
              >
                Delete
              </button>
            </>
          }
        >
          <p style={{ marginTop: 0, color: 'var(--text-2)' }}>Are you sure you want to permanently delete this goods return? This action cannot be undone.</p>
        </Modal>
      </main>
    </div>
  )
}
