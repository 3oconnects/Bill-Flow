import { useEffect, useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTopbarStore } from '@/store/topbarStore'
import { EmptyState, PageLoading } from '@/components/ui'
import {
  Banknote, Plus, Search, Trash2, DollarSign, TrendingUp, AlertCircle, Receipt,
} from 'lucide-react'
import { fmt } from '@/lib/utils'
import { vendorPaymentsApi } from '@/api'
import { toast } from '@/store/toastStore'
import RecordVendorPaymentModal from './RecordVendorPaymentModal'
import { confirmAction } from '@/store/confirmStore'

const METHOD_LABELS = {
  bank_transfer: 'Bank Transfer',
  upi:           'UPI',
  cheque:        'Cheque',
  cash:          'Cash',
  card:          'Card',
  other:         'Other',
}

export default function VendorPaymentsPage() {
  const qc = useQueryClient()
  const { setActions, setContext, clear } = useTopbarStore()
  const [search, setSearch]   = useState('')
  const [modalOpen, setModalOpen] = useState(false)

  const { data: payments = [], isLoading } = useQuery({
    queryKey: ['vendor-payments'],
    queryFn:  vendorPaymentsApi.list,
  })

  const removeMut = useMutation({
    mutationFn: vendorPaymentsApi.remove,
    onSuccess: () => {
      qc.invalidateQueries(['vendor-payments'])
      qc.invalidateQueries(['ap-invoices-unpaid'])
      qc.invalidateQueries(['ap'])
      toast.success('Payment deleted')
    },
    onError: (e) => toast.error(e.message || 'Failed to delete'),
  })

  useEffect(() => {
    setContext('Vendor Payments', 'Money paid out to suppliers')
    setActions(
      <button className="btn btn-primary" onClick={() => setModalOpen(true)}>
        <Plus size={15} /> Record Payment
      </button>
    )
    return clear
  }, [setActions, setContext, clear])

  // ── Derived ─────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    if (!q) return payments
    return payments.filter(p =>
      (p.vendor_name   || '').toLowerCase().includes(q) ||
      (p.ap_invoice_no || '').toLowerCase().includes(q) ||
      (p.reference     || '').toLowerCase().includes(q),
    )
  }, [payments, search])

  const kpis = useMemo(() => {
    const now      = Date.now()
    const day      = 86400000
    const last30   = now - 30 * day
    const totalAll   = payments.reduce((s, p) => s + Number(p.amount || 0), 0)
    const last30Sum  = payments
      .filter(p => p.date && new Date(p.date).getTime() >= last30)
      .reduce((s, p) => s + Number(p.amount || 0), 0)
    const vendorCount = new Set(payments.map(p => p.vendor_id).filter(Boolean)).size
    return {
      total: totalAll, last30Sum, vendorCount,
      count: payments.length,
    }
  }, [payments])

  if (isLoading) return <PageLoading />

  return (
    <div>
      {/* KPIs */}
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: 20 }}>
        <div className="kpi-card blue">
          <div className="kpi-icon"><Banknote size={20} /></div>
          <div className="kpi-label">Total Paid Out</div>
          <div className="kpi-value" style={{ fontSize: 16 }}>{fmt.currency(kpis.total)}</div>
          <div className="kpi-sub">{kpis.count} payments</div>
        </div>
        <div className="kpi-card green">
          <div className="kpi-icon"><TrendingUp size={20} /></div>
          <div className="kpi-label">Last 30 Days</div>
          <div className="kpi-value" style={{ fontSize: 16 }}>{fmt.currency(kpis.last30Sum)}</div>
          <div className="kpi-sub">Recent outflow</div>
        </div>
        <div className="kpi-card purple">
          <div className="kpi-icon"><DollarSign size={20} /></div>
          <div className="kpi-label">Vendors Paid</div>
          <div className="kpi-value">{kpis.vendorCount}</div>
          <div className="kpi-sub">Unique suppliers</div>
        </div>
        <div className="kpi-card orange">
          <div className="kpi-icon"><AlertCircle size={20} /></div>
          <div className="kpi-label">Avg per Payment</div>
          <div className="kpi-value" style={{ fontSize: 16 }}>
            {fmt.currency(kpis.count ? kpis.total / kpis.count : 0)}
          </div>
          <div className="kpi-sub">All time</div>
        </div>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div className="filter-bar" style={{ padding: '16px 20px', borderBottom: '1px solid var(--c-border)' }}>
          <div className="search-wrap" style={{ width: 320 }}>
            <Search className="search-icon" />
            <input className="form-input" style={{ paddingLeft: 34 }}
              placeholder="Search vendor / invoice / reference..."
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon={<Banknote size={44} />}
            title={payments.length === 0 ? 'No vendor payments yet' : 'No results'}
            description={payments.length === 0
              ? 'Record a payment to a vendor against one of your AP invoices.'
              : 'Try a different search.'}
            action={payments.length === 0 && (
              <button className="btn btn-primary" onClick={() => setModalOpen(true)}>
                <Plus size={14} /> Record Payment
              </button>
            )}
          />
        ) : (
          <div className="table-wrap">
            <table className="compact">
              <thead>
                <tr>
                  <th>DATE</th>
                  <th>VENDOR</th>
                  <th>AP INVOICE</th>
                  <th>METHOD</th>
                  <th>REFERENCE</th>
                  <th style={{ textAlign: 'right' }}>AMOUNT</th>
                  <th style={{ width: 50 }} />
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => (
                  <tr key={p.id}>
                    <td className="mono" style={{ fontSize: 12 }}>{fmt.date(p.date)}</td>
                    <td style={{ fontWeight: 600 }}>{p.vendor_name || '—'}</td>
                    <td>
                      {p.ap_invoice_no
                        ? <span style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--c-primary)' }}>
                            <Receipt size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                            {p.ap_invoice_no}
                          </span>
                        : <span style={{ color: 'var(--c-text3)' }}>General</span>}
                    </td>
                    <td>
                      <span style={{
                        padding: '3px 10px', borderRadius: 99,
                        background: 'var(--c-primary-lt)', color: 'var(--c-primary)',
                        fontSize: 11, fontWeight: 700,
                      }}>
                        {METHOD_LABELS[p.method] || p.method}
                      </span>
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{p.reference || '—'}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, fontFamily: 'monospace' }}>
                      {fmt.currency(p.amount)}
                    </td>
                    <td>
                      <button className="topbar-icon-btn red" title="Delete"
                        onClick={() => confirmAction('Delete this payment? Will revert the AP invoice paid amount.', () => removeMut.mutate(p.id))}>
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalOpen && (
        <RecordVendorPaymentModal
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  )
}
