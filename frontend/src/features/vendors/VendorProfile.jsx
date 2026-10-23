import { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft, Edit2, FileText, Package, Upload, Trash2, Plus,
  ExternalLink, Receipt, Banknote, MoreVertical, X, Download,
  Printer, RefreshCw, CreditCard, ShoppingBag, Activity,
  MapPin, Phone, Mail, Globe, Building2, Hash, Calendar,
  TrendingDown, AlertTriangle, CheckCircle, Clock, Eye,
} from 'lucide-react'
import { vendorsApi, apApi } from '@/api'
import { fmt } from '@/lib/utils'
import { PageLoading, Badge, Spinner } from '@/components/ui'
import { toast } from '@/store/toastStore'
import Modal from '@/components/Modal'
import VendorForm from './VendorForm'
import { confirmAction } from '@/store/confirmStore'
import RecordVendorPaymentModal from '@/features/purchasing/RecordVendorPaymentModal'

// ─────────────────────────────────────────────────────────────────────────────
// Small helpers
// ─────────────────────────────────────────────────────────────────────────────

function InfoRow({ label, value, mono, color }) {
  if (!value && value !== 0) return null
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '8px 0', borderBottom: '1px solid var(--c-border)' }}>
      <span style={{ fontSize: 12, color: 'var(--c-text3)', fontWeight: 500, flexShrink: 0, marginRight: 12 }}>{label}</span>
      <span style={{ fontSize: 12, fontWeight: 600, color: color || 'var(--c-text)', textAlign: 'right', fontFamily: mono ? 'monospace' : 'inherit', wordBreak: 'break-all' }}>{value}</span>
    </div>
  )
}

function SectionTitle({ children, action }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, marginTop: 16 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--c-text3)', textTransform: 'uppercase', letterSpacing: '.07em' }}>{children}</div>
      {action}
    </div>
  )
}

function FinCard({ label, value, color, loading }) {
  return (
    <div style={{ background: 'var(--c-surface2)', border: '1px solid var(--c-border)', borderRadius: 10, padding: '14px 16px' }}>
      <div style={{ fontSize: 10, color: 'var(--c-text3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 6 }}>{label}</div>
      {loading
        ? <div style={{ height: 20, width: 80, background: 'var(--c-border)', borderRadius: 4, animation: 'pulse 1.5s infinite' }} />
        : <div style={{ fontSize: 20, fontWeight: 700, color: color || 'var(--c-text)' }}>{value}</div>
      }
    </div>
  )
}

function EmptyTab({ icon: Icon, title, description, action }) {
  return (
    <div style={{ textAlign: 'center', padding: '48px 24px' }}>
      <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--c-surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', color: 'var(--c-text3)' }}>
        <Icon size={24} />
      </div>
      <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--c-text)', marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 13, color: 'var(--c-text2)', marginBottom: 18, maxWidth: 320, margin: '0 auto 18px' }}>{description}</div>
      {action}
    </div>
  )
}

function LoadingRows({ cols = 6, rows = 4 }) {
  return (
    <div>
      {[...Array(rows)].map((_, i) => (
        <div key={i} style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 12, padding: '12px 16px', borderBottom: '1px solid var(--c-border)' }}>
          {[...Array(cols)].map((__, j) => (
            <div key={j} style={{ height: 12, borderRadius: 4, background: 'var(--c-border)', opacity: 0.7, animation: 'pulse 1.5s infinite' }} />
          ))}
        </div>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Document Upload Modal
// ─────────────────────────────────────────────────────────────────────────────
function DocUploadModal({ vendorId, onSuccess, onCancel }) {
  const [name, setName]       = useState('')
  const [docType, setDocType] = useState('other')
  const [fileUrl, setFileUrl] = useState('')
  const [notes, setNotes]     = useState('')

  const mutation = useMutation({
    mutationFn: () => vendorsApi.uploadDoc(vendorId, { name, doc_type: docType, file_url: fileUrl, notes }),
    onSuccess: () => { toast.success('Document added'); onSuccess() },
    onError: (e) => toast.error(e.message),
  })

  return (
    <div>
      <div className="form-group">
        <label className="form-label">Document Name *</label>
        <input className="form-input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. GST Registration Certificate" />
      </div>
      <div className="form-group">
        <label className="form-label">Document Type</label>
        <select className="form-select" value={docType} onChange={e => setDocType(e.target.value)}>
          {['gst', 'pan', 'aadhaar', 'agreement', 'invoice', 'certificate', 'other'].map(t =>
            <option key={t} value={t}>{t.toUpperCase()}</option>
          )}
        </select>
      </div>
      <div className="form-group">
        <label className="form-label">File URL / Link</label>
        <input className="form-input" value={fileUrl} onChange={e => setFileUrl(e.target.value)} placeholder="https://drive.google.com/…" />
      </div>
      <div className="form-group">
        <label className="form-label">Notes</label>
        <textarea className="form-input" rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional notes" />
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>
        <button className="btn btn-primary" disabled={!name || !fileUrl || mutation.isPending} onClick={() => mutation.mutate()}>
          {mutation.isPending ? <Spinner size={14} /> : 'Add Document'}
        </button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// TABS
// ─────────────────────────────────────────────────────────────────────────────

// ── Overview Tab ──────────────────────────────────────────────────────
function OverviewTab({ vendorId, vendor }) {
  const { data: summary, isLoading } = useQuery({
    queryKey: ['vendor-summary', vendorId],
    queryFn:  () => vendorsApi.summary(vendorId),
  })
  const { data: expenses = [] } = useQuery({
    queryKey: ['vendor-expenses', vendorId],
    queryFn:  () => vendorsApi.expenses(vendorId),
  })

  const recentExpenses = expenses.slice(0, 6)

  return (
    <div style={{ padding: 20 }}>
      {/* Financial Summary Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
        <FinCard label="Total Bills"       value={fmt.currency(summary?.total_bills || 0)}       loading={isLoading} />
        <FinCard label="Total Paid"        value={fmt.currency(summary?.total_paid || 0)}        color="var(--c-green)" loading={isLoading} />
        <FinCard label="Outstanding"       value={fmt.currency(summary?.outstanding || 0)}       color={summary?.outstanding > 0 ? 'var(--c-orange)' : 'var(--c-green)'} loading={isLoading} />
        <FinCard label="Overdue Amount"    value={fmt.currency(summary?.overdue || 0)}           color={summary?.overdue > 0 ? 'var(--c-red)' : 'var(--c-green)'} loading={isLoading} />
        <FinCard label="Total Payments"    value={fmt.currency(summary?.total_payments || 0)}    loading={isLoading} />
        <FinCard label="Credit Balance"    value={fmt.currency(summary?.credit_balance || 0)}    loading={isLoading} />
      </div>

      {/* PO Summary */}
      {(summary?.total_pos > 0) && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
          <FinCard label="Purchase Orders"    value={summary.total_pos}                        loading={isLoading} />
          <FinCard label="Total PO Value"     value={fmt.currency(summary.total_po_value || 0)} loading={isLoading} />
        </div>
      )}

      {/* Recent Purchases */}
      {recentExpenses.length > 0 && (
        <>
          <SectionTitle>Recent Purchases (Expenses)</SectionTitle>
          <div style={{ border: '1px solid var(--c-border)', borderRadius: 10, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--c-surface2)' }}>
                  {['Description', 'Date', 'Category', 'Amount'].map(h => (
                    <th key={h} style={{ padding: '8px 14px', textAlign: 'left', fontSize: 11, color: 'var(--c-text3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentExpenses.map((e, i) => (
                  <tr key={e.id} style={{ borderTop: i ? '1px solid var(--c-border)' : 'none' }}>
                    <td style={{ padding: '10px 14px', fontWeight: 500, fontSize: 13 }}>{e.description}</td>
                    <td style={{ padding: '10px 14px', color: 'var(--c-text2)', fontSize: 12 }}>{fmt.date(e.date)}</td>
                    <td style={{ padding: '10px 14px', color: 'var(--c-text2)', textTransform: 'capitalize', fontSize: 12 }}>{e.category?.replace(/_/g, ' ')}</td>
                    <td style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--c-red)' }}>{fmt.currency(e.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {recentExpenses.length === 0 && !isLoading && (
        <EmptyTab icon={Activity} title="No activity yet" description="Financial activity will appear here once bills and payments are recorded." />
      )}
    </div>
  )
}

// ── Bills Tab ─────────────────────────────────────────────────────────
function BillsTab({ vendorId, navigate }) {
  const { data: bills = [], isLoading } = useQuery({
    queryKey: ['vendor-bills', vendorId],
    queryFn:  () => vendorsApi.bills(vendorId),
  })

  const statusColor = {
    paid: 'var(--c-green)', unpaid: 'var(--c-orange)', overdue: 'var(--c-red)',
    partially_paid: 'var(--c-orange)', draft: 'var(--c-text3)', cancelled: 'var(--c-text3)',
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '14px 16px', borderBottom: '1px solid var(--c-border)' }}>
        <button className="btn btn-primary btn-sm"
          onClick={() => navigate(`/ap?type=invoices&vendor_id=${vendorId}&new=1`)}>
          <Plus size={13} /> New Bill
        </button>
      </div>

      {isLoading ? <LoadingRows cols={6} /> : bills.length === 0 ? (
        <EmptyTab icon={FileText} title="No bills yet"
          description="Bills/purchase invoices from this vendor will appear here."
          action={<button className="btn btn-primary btn-sm" onClick={() => navigate(`/ap?type=invoices&vendor_id=${vendorId}&new=1`)}><Plus size={13} /> New Bill</button>} />
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Bill No.</th>
                <th>Bill Date</th>
                <th>Due Date</th>
                <th className="right">Total</th>
                <th className="right">Paid</th>
                <th className="right">Balance</th>
                <th>Status</th>
                <th className="right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {bills.map(bill => {
                const balance = Math.max(0, Number(bill.total_amount || 0) - Number(bill.paid_amount || 0))
                const isOverdue = bill.due_date && new Date(bill.due_date) < new Date() && balance > 0
                return (
                  <tr key={bill.id}>
                    <td style={{ fontWeight: 600, fontFamily: 'monospace', fontSize: 12, color: 'var(--c-primary)' }}>{bill.doc_no}</td>
                    <td style={{ fontSize: 12 }}>{fmt.date(bill.created_at)}</td>
                    <td style={{ fontSize: 12, color: isOverdue ? 'var(--c-red)' : 'var(--c-text2)' }}>
                      {bill.due_date ? fmt.date(bill.due_date) : '—'}
                      {isOverdue && <span style={{ fontSize: 10, marginLeft: 4 }}>⚠ Overdue</span>}
                    </td>
                    <td className="right" style={{ fontWeight: 600 }}>{fmt.currency(bill.total_amount)}</td>
                    <td className="right" style={{ color: 'var(--c-green)' }}>{fmt.currency(bill.paid_amount)}</td>
                    <td className="right" style={{ fontWeight: 700, color: balance > 0 ? 'var(--c-red)' : 'var(--c-green)' }}>{fmt.currency(balance)}</td>
                    <td><Badge status={isOverdue ? 'overdue' : (bill.status || 'unpaid')} /></td>
                    <td className="right">
                      <button className="topbar-icon-btn" title="View Bill"
                        onClick={() => navigate(`/ap?type=invoices&id=${bill.id}`)}>
                        <Eye size={13} />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── Payments Tab ─────────────────────────────────────────────────────
function PaymentsTab({ vendorId, vendor, onRecordPayment }) {
  const { data: payments = [], isLoading } = useQuery({
    queryKey: ['vendor-payments-list', vendorId],
    queryFn:  () => vendorsApi.payments(vendorId),
  })

  const total = payments.reduce((s, p) => s + Number(p.amount || 0), 0)

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '14px 16px', borderBottom: '1px solid var(--c-border)' }}>
        <button className="btn btn-primary btn-sm" onClick={onRecordPayment}>
          <Banknote size={13} /> Record Payment
        </button>
      </div>

      {isLoading ? <LoadingRows cols={6} /> : payments.length === 0 ? (
        <EmptyTab icon={Banknote} title="No payments recorded"
          description="Vendor payments will appear here once recorded."
          action={<button className="btn btn-primary btn-sm" onClick={onRecordPayment}><Banknote size={13} /> Record Payment</button>} />
      ) : (
        <>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Bill Ref</th>
                  <th>Method</th>
                  <th>Reference / UTR</th>
                  <th>Notes</th>
                  <th className="right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {payments.map(p => (
                  <tr key={p.id}>
                    <td style={{ fontSize: 12 }}>{fmt.date(p.date)}</td>
                    <td style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--c-primary)' }}>{p.ap_invoice_no || '—'}</td>
                    <td><span style={{ fontSize: 11, background: 'var(--c-surface2)', border: '1px solid var(--c-border)', borderRadius: 4, padding: '2px 6px', textTransform: 'capitalize' }}>{(p.method || '').replace(/_/g, ' ')}</span></td>
                    <td style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--c-text2)' }}>{p.reference || '—'}</td>
                    <td style={{ fontSize: 12, color: 'var(--c-text2)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.notes || '—'}</td>
                    <td className="right" style={{ fontWeight: 700, color: 'var(--c-green)' }}>{fmt.currency(p.amount)}</td>
                  </tr>
                ))}
                <tr style={{ background: 'var(--c-surface2)', borderTop: '2px solid var(--c-border)' }}>
                  <td colSpan={5} style={{ padding: '10px 14px', fontWeight: 700, fontSize: 12 }}>Total Payments</td>
                  <td className="right" style={{ fontWeight: 700, color: 'var(--c-green)' }}>{fmt.currency(total)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}

// ── Purchase Orders Tab ──────────────────────────────────────────────
function PurchaseOrdersTab({ vendorId, navigate }) {
  const { data: pos = [], isLoading } = useQuery({
    queryKey: ['vendor-pos', vendorId],
    queryFn:  () => vendorsApi.purchaseOrders(vendorId),
  })

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '14px 16px', borderBottom: '1px solid var(--c-border)' }}>
        <button className="btn btn-primary btn-sm"
          onClick={() => navigate(`/purchases?vendor_id=${vendorId}&new=1`)}>
          <Plus size={13} /> New Purchase Order
        </button>
      </div>

      {isLoading ? <LoadingRows cols={5} /> : pos.length === 0 ? (
        <EmptyTab icon={ShoppingBag} title="No purchase orders"
          description="Purchase orders for this vendor will appear here."
          action={<button className="btn btn-primary btn-sm" onClick={() => navigate(`/purchases?vendor_id=${vendorId}&new=1`)}><Plus size={13} /> New PO</button>} />
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>PO Number</th>
                <th>Date</th>
                <th>Expected Delivery</th>
                <th className="right">Total</th>
                <th>Status</th>
                <th className="right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pos.map(po => {
                let items = []
                try { items = typeof po.items === 'string' ? JSON.parse(po.items) : (po.items || []) } catch {}
                return (
                  <tr key={po.id}>
                    <td style={{ fontWeight: 600, fontFamily: 'monospace', fontSize: 12, color: 'var(--c-primary)' }}>{po.po_number}</td>
                    <td style={{ fontSize: 12 }}>{fmt.date(po.created_at)}</td>
                    <td style={{ fontSize: 12, color: 'var(--c-text2)' }}>{po.expected_delivery_date ? fmt.date(po.expected_delivery_date) : '—'}</td>
                    <td className="right" style={{ fontWeight: 600 }}>{fmt.currency(po.total)}</td>
                    <td><Badge status={po.status || 'draft'} /></td>
                    <td className="right">
                      <button className="topbar-icon-btn" title="View PO"
                        onClick={() => navigate(`/purchases?id=${po.id}`)}>
                        <Eye size={13} />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── Credit Memos Tab ──────────────────────────────────────────────────
function CreditMemosTab({ vendorId, navigate }) {
  const { data: cms = [], isLoading } = useQuery({
    queryKey: ['vendor-credit-memos', vendorId],
    queryFn:  () => vendorsApi.creditMemos(vendorId),
  })

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '14px 16px', borderBottom: '1px solid var(--c-border)' }}>
        <button className="btn btn-primary btn-sm"
          onClick={() => navigate(`/ap?type=credit-memos&vendor_id=${vendorId}&new=1`)}>
          <Plus size={13} /> New Credit Memo
        </button>
      </div>

      {isLoading ? <LoadingRows cols={5} /> : cms.length === 0 ? (
        <EmptyTab icon={CreditCard} title="No credit memos"
          description="Vendor credit memos will appear here."
          action={<button className="btn btn-primary btn-sm" onClick={() => navigate(`/ap?type=credit-memos&vendor_id=${vendorId}&new=1`)}><Plus size={13} /> New Credit Memo</button>} />
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Memo No.</th>
                <th>Date</th>
                <th className="right">Amount</th>
                <th className="right">Applied</th>
                <th className="right">Remaining</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {cms.map(cm => {
                const remaining = Math.max(0, Number(cm.total_amount || 0) - Number(cm.applied_amount || 0))
                return (
                  <tr key={cm.id}>
                    <td style={{ fontWeight: 600, fontFamily: 'monospace', fontSize: 12, color: 'var(--c-primary)' }}>{cm.doc_no}</td>
                    <td style={{ fontSize: 12 }}>{fmt.date(cm.created_at)}</td>
                    <td className="right" style={{ fontWeight: 600 }}>{fmt.currency(cm.total_amount)}</td>
                    <td className="right" style={{ color: 'var(--c-green)' }}>{fmt.currency(cm.applied_amount)}</td>
                    <td className="right" style={{ fontWeight: 700, color: remaining > 0 ? 'var(--c-orange)' : 'var(--c-text3)' }}>{fmt.currency(remaining)}</td>
                    <td><Badge status={cm.status || 'open'} /></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── Statement Tab ────────────────────────────────────────────────────
function StatementTab({ vendorId, vendor }) {
  const [from, setFrom] = useState('')
  const [to, setTo]     = useState('')
  const [applied, setApplied] = useState({ from: '', to: '' })

  const { data: rows = [], isLoading, refetch } = useQuery({
    queryKey: ['vendor-statement', vendorId, applied.from, applied.to],
    queryFn:  () => vendorsApi.statement(vendorId, applied),
  })

  const handleApply = () => setApplied({ from, to })

  const handlePrint = () => window.print()

  const handleExportCSV = () => {
    const header = ['Date', 'Reference', 'Type', 'Debit', 'Credit', 'Running Balance']
    const lines = rows.map(r => [
      r.date, r.reference, r.transaction_type,
      r.debit || 0, r.credit || 0, r.running_balance || 0,
    ])
    const csv = [header, ...lines].map(r => r.map(c => `"${c}"`).join(',')).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = `statement-${vendor?.name?.replace(/\s+/g, '-') || vendorId}-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  return (
    <div style={{ padding: 16 }}>
      {/* Filters */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-text2)' }}>Date Range:</div>
        <input type="date" className="form-input" style={{ width: 150 }} value={from} onChange={e => setFrom(e.target.value)} />
        <span style={{ color: 'var(--c-text3)', fontSize: 12 }}>to</span>
        <input type="date" className="form-input" style={{ width: 150 }} value={to} onChange={e => setTo(e.target.value)} />
        <button className="btn btn-primary btn-sm" onClick={handleApply}>Apply</button>
        {(from || to) && (
          <button className="btn btn-ghost btn-sm" onClick={() => { setFrom(''); setTo(''); setApplied({ from: '', to: '' }) }}>
            Clear
          </button>
        )}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost btn-sm" onClick={handlePrint}><Printer size={13} /> Print</button>
          <button className="btn btn-ghost btn-sm" onClick={handleExportCSV}><Download size={13} /> Export CSV</button>
        </div>
      </div>

      {/* Statement Header */}
      <div style={{
        background: 'var(--c-surface2)', border: '1px solid var(--c-border)',
        borderRadius: 8, padding: '12px 16px', marginBottom: 12,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700 }}>Vendor Statement — {vendor?.name}</div>
          <div style={{ fontSize: 11, color: 'var(--c-text3)' }}>{vendor?.company_name || ''}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 11, color: 'var(--c-text3)' }}>Closing Balance</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: rows[rows.length - 1]?.running_balance > 0 ? 'var(--c-red)' : 'var(--c-green)' }}>
            {fmt.currency(rows[rows.length - 1]?.running_balance || 0)}
          </div>
        </div>
      </div>

      {isLoading ? <LoadingRows cols={6} /> : rows.length === 0 ? (
        <EmptyTab icon={FileText} title="No statement data"
          description="Transactions will appear here once bills or payments are recorded." />
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Reference</th>
                <th>Type</th>
                <th className="right">Debit (₹)</th>
                <th className="right">Credit (₹)</th>
                <th className="right">Balance (₹)</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  <td style={{ fontSize: 12 }}>{fmt.date(r.date)}</td>
                  <td style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--c-primary)' }}>{r.reference || '—'}</td>
                  <td>
                    <span style={{
                      fontSize: 11, padding: '2px 7px', borderRadius: 4,
                      background: r.transaction_type === 'Payment' ? 'var(--c-green-lt)' : 'var(--c-orange-lt)',
                      color: r.transaction_type === 'Payment' ? 'var(--c-green)' : 'var(--c-orange)',
                      fontWeight: 600,
                    }}>
                      {r.transaction_type}
                    </span>
                  </td>
                  <td className="right" style={{ color: Number(r.debit) > 0 ? 'var(--c-red)' : 'var(--c-text3)', fontWeight: Number(r.debit) > 0 ? 600 : 400 }}>
                    {Number(r.debit) > 0 ? fmt.currency(r.debit) : '—'}
                  </td>
                  <td className="right" style={{ color: Number(r.credit) > 0 ? 'var(--c-green)' : 'var(--c-text3)', fontWeight: Number(r.credit) > 0 ? 600 : 400 }}>
                    {Number(r.credit) > 0 ? fmt.currency(r.credit) : '—'}
                  </td>
                  <td className="right" style={{ fontWeight: 700, color: Number(r.running_balance) > 0 ? 'var(--c-red)' : 'var(--c-green)' }}>
                    {fmt.currency(r.running_balance)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── Documents Tab ────────────────────────────────────────────────────
function DocumentsTab({ vendorId, docs, onAdd, onDelete }) {
  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
        <button className="btn btn-primary btn-sm" onClick={onAdd}>
          <Upload size={13} /> Add Document
        </button>
      </div>
      {docs.length === 0 ? (
        <EmptyTab icon={FileText} title="No documents uploaded"
          description="Attach GST certificates, agreements, PAN cards and other vendor documents."
          action={<button className="btn btn-primary btn-sm" onClick={onAdd}><Upload size={13} /> Add Document</button>} />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
          {docs.map(doc => (
            <div key={doc.id} style={{ background: 'var(--c-surface2)', border: '1px solid var(--c-border)', borderRadius: 10, padding: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.name}</div>
                  <div style={{ fontSize: 10, color: 'var(--c-text3)', marginTop: 2, textTransform: 'uppercase', letterSpacing: '.04em' }}>{doc.doc_type}</div>
                </div>
                <button style={{ background: 'none', border: 'none', color: 'var(--c-red)', cursor: 'pointer', padding: 2 }} onClick={() => onDelete(doc.id)}>
                  <Trash2 size={13} />
                </button>
              </div>
              {doc.file_url && (
                <a href={doc.file_url} target="_blank" rel="noreferrer"
                  className="btn btn-ghost btn-sm" style={{ width: '100%', justifyContent: 'center', fontSize: 12 }}>
                  <ExternalLink size={12} /> View Document
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Products Tab ─────────────────────────────────────────────────────
function ProductsTab({ vendorId, navigate }) {
  const { data: products = [], isLoading } = useQuery({
    queryKey: ['vendor-products', vendorId],
    queryFn:  () => vendorsApi.products(vendorId),
  })

  return (
    <div>
      {isLoading ? <LoadingRows cols={5} /> : products.length === 0 ? (
        <EmptyTab icon={Package} title="No products linked"
          description="Products supplied by this vendor will appear here. Link them using the Edit Vendor form." />
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>SKU</th>
                <th className="right">Supply Price</th>
                <th className="right">Stock</th>
                <th>Primary</th>
              </tr>
            </thead>
            <tbody>
              {products.map(p => (
                <tr key={p.product_id || p.id} style={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/products/${p.product_id || p.id}`)}>
                  <td style={{ fontWeight: 600, fontSize: 13 }}>{p.product_name || p.name}</td>
                  <td style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--c-text3)' }}>{p.sku || '—'}</td>
                  <td className="right" style={{ fontWeight: 600 }}>{fmt.currency(p.supply_price || p.purchase_price)}</td>
                  <td className="right" style={{ color: Number(p.stock_qty) <= 0 ? 'var(--c-red)' : 'var(--c-text)' }}>
                    {fmt.number(p.stock_qty || 0)}
                  </td>
                  <td>
                    {p.is_primary
                      ? <span style={{ fontSize: 11, color: 'var(--c-primary)', fontWeight: 700 }}>★ Primary</span>
                      : <span style={{ fontSize: 11, color: 'var(--c-text3)' }}>—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── Notes Tab ────────────────────────────────────────────────────────
function NotesTab({ vendor, onEdit }) {
  return (
    <div style={{ padding: 20 }}>
      {vendor.notes ? (
        <div style={{ background: 'var(--c-surface2)', border: '1px solid var(--c-border)', borderRadius: 10, padding: 16, fontSize: 13, color: 'var(--c-text)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
          {vendor.notes}
        </div>
      ) : (
        <EmptyTab icon={FileText} title="No notes added"
          description="Internal notes about this vendor will appear here."
          action={<button className="btn btn-ghost btn-sm" onClick={onEdit}><Edit2 size={13} /> Add Notes</button>} />
      )}
      {vendor.notes && (
        <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn btn-ghost btn-sm" onClick={onEdit}><Edit2 size={13} /> Edit Notes</button>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main VendorProfile Component
// ─────────────────────────────────────────────────────────────────────────────
export default function VendorProfile() {
  const { id } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const [editOpen, setEditOpen]   = useState(false)
  const [docOpen, setDocOpen]     = useState(false)
  const [payOpen, setPayOpen]     = useState(false)
  const [activeTab, setActiveTab] = useState('overview')

  const { data: vendor, isLoading } = useQuery({
    queryKey: ['vendor', id],
    queryFn:  () => vendorsApi.get(id),
  })

  const { data: summary } = useQuery({
    queryKey: ['vendor-summary', id],
    queryFn:  () => vendorsApi.summary(id),
    enabled:  !!id,
  })

  const deleteDocMut = useMutation({
    mutationFn: (docId) => vendorsApi.deleteDoc(id, docId),
    onSuccess:  () => { qc.invalidateQueries(['vendor', id]); toast.success('Document deleted') },
    onError:    (e) => toast.error(e.message),
  })

  const statusMut = useMutation({
    mutationFn: (status) => vendorsApi.updateStatus(id, status),
    onSuccess:  (_, status) => { qc.invalidateQueries(['vendor', id]); qc.invalidateQueries(['vendors']); toast.success(`Vendor ${status}d`) },
    onError:    (e) => toast.error(e.message),
  })

  if (isLoading) return <PageLoading />
  if (!vendor)   return <div style={{ padding: 32, color: 'var(--c-text2)', textAlign: 'center' }}>Vendor not found.</div>

  const docs = vendor.documents || []

  const TABS = [
    { id: 'overview',  label: 'Overview' },
    { id: 'bills',     label: `Bills${summary?.bill_count > 0 ? ` (${summary.bill_count})` : ''}` },
    { id: 'payments',  label: 'Payments' },
    { id: 'pos',       label: 'Purchase Orders' },
    { id: 'credits',   label: 'Credit Memos' },
    { id: 'statement', label: 'Statement' },
    { id: 'products',  label: 'Products' },
    { id: 'documents', label: `Documents${docs.length > 0 ? ` (${docs.length})` : ''}` },
    { id: 'notes',     label: 'Notes' },
  ]

  return (
    <div className="page-enter">
      {/* ── Header ── */}
      <div className="page-header">
        <div className="page-header-left">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button className="topbar-icon-btn" onClick={() => navigate('/vendors')} title="Back to Vendors">
              <ArrowLeft size={18} />
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 10, background: 'var(--c-primary-lt)',
                color: 'var(--c-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 16, fontWeight: 700, flexShrink: 0, textTransform: 'uppercase',
              }}>
                {fmt.initials(vendor.name)}
              </div>
              <div>
                <h1 style={{ margin: 0, fontSize: 18 }}>{vendor.name}</h1>
                <p style={{ margin: 0 }}>
                  {vendor.company_name && <span>{vendor.company_name} · </span>}
                  {[vendor.city, vendor.state].filter(Boolean).join(', ') || 'No location set'}
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="page-header-right" style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <Badge status={vendor.status || 'active'} />
          <button className="btn btn-ghost"
            onClick={() => navigate(`/ap?type=invoices&vendor_id=${vendor.id}&new=1`)}
            title="Create a new AP invoice for this vendor">
            <Receipt size={14} /> New Bill
          </button>
          <button className="btn btn-ghost" onClick={() => setPayOpen(true)}>
            <Banknote size={14} /> Record Payment
          </button>
          <button className="btn btn-secondary" onClick={() => setEditOpen(true)}>
            <Edit2 size={14} /> Edit Vendor
          </button>
          {/* Status toggle */}
          {vendor.status === 'active' ? (
            <button className="btn btn-ghost" style={{ color: 'var(--c-orange)' }}
              onClick={() => confirmAction('Deactivate this vendor?', () => statusMut.mutate('inactive'))}>
              Deactivate
            </button>
          ) : (
            <button className="btn btn-ghost" style={{ color: 'var(--c-green)' }}
              onClick={() => confirmAction('Activate this vendor?', () => statusMut.mutate('active'))}>
              Activate
            </button>
          )}
        </div>
      </div>

      {/* ── KPIs ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14, marginBottom: 20 }}>
        <div className="kpi-card blue">
          <div className="kpi-label">Outstanding</div>
          <div className="kpi-value">{fmt.currency(summary?.outstanding || 0)}</div>
          <div className="kpi-sub">Payable balance</div>
        </div>
        <div className="kpi-card red">
          <div className="kpi-label">Overdue</div>
          <div className="kpi-value">{fmt.currency(summary?.overdue || 0)}</div>
          <div className="kpi-sub">Past due date</div>
        </div>
        <div className="kpi-card green">
          <div className="kpi-label">Total Paid</div>
          <div className="kpi-value">{fmt.currency(summary?.total_paid || 0)}</div>
          <div className="kpi-sub">Payments made</div>
        </div>
        <div className="kpi-card orange">
          <div className="kpi-label">Total Bills</div>
          <div className="kpi-value">{fmt.currency(summary?.total_bills || 0)}</div>
          <div className="kpi-sub">{summary?.bill_count || 0} bills</div>
        </div>
        <div className="kpi-card purple">
          <div className="kpi-label">Purchase Orders</div>
          <div className="kpi-value">{summary?.total_pos || 0}</div>
          <div className="kpi-sub">{fmt.currency(summary?.total_po_value || 0)} total</div>
        </div>
      </div>

      {/* ── Body: Left Panel + Tabs ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 20, alignItems: 'start' }}>

        {/* ── Left Panel ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Vendor Info */}
          <div className="card">
            <div className="card-body">
              <SectionTitle>Contact Information</SectionTitle>
              <InfoRow label="Contact"  value={vendor.contact_person} />
              <InfoRow label="Email"    value={vendor.email} />
              <InfoRow label="Phone"    value={vendor.phone} />
              <InfoRow label="Alt Phone" value={vendor.alternate_phone} />
              <InfoRow label="Website"  value={vendor.website} />

              <SectionTitle>Company</SectionTitle>
              <InfoRow label="Company"  value={vendor.company_name} />
              <InfoRow label="Type"     value={vendor.vendor_type?.replace(/_/g, ' ')} />

              <SectionTitle>Address</SectionTitle>
              <InfoRow label="Street"   value={vendor.address || vendor.street} />
              <InfoRow label="City"     value={vendor.city} />
              <InfoRow label="State"    value={vendor.state} />
              <InfoRow label="Country"  value={vendor.country} />
              <InfoRow label="PIN/ZIP"  value={vendor.pincode} />

              <SectionTitle>Tax & Identity</SectionTitle>
              <InfoRow label="GSTIN"    value={vendor.gstin}     mono color="var(--c-primary)" />
              <InfoRow label="PAN"      value={vendor.pan}       mono />
              <InfoRow label="Tax Treatment" value={vendor.tax_treatment?.replace(/_/g, ' ')} />
            </div>
          </div>

          {/* Financial Info */}
          <div className="card">
            <div className="card-body">
              <SectionTitle>Financial</SectionTitle>
              <InfoRow label="Currency"      value={vendor.currency || 'INR'} />
              <InfoRow label="Payment Terms" value={vendor.payment_terms?.replace(/_/g, ' ')} />
              <InfoRow label="Credit Limit"  value={vendor.credit_limit ? fmt.currency(vendor.credit_limit) : null} />

              <SectionTitle>Banking</SectionTitle>
              <InfoRow label="Bank"          value={vendor.bank_name} />
              <InfoRow label="Account Holder" value={vendor.account_holder_name} />
              <InfoRow label="Account No."   value={vendor.bank_account} mono />
              <InfoRow label="IFSC"          value={vendor.ifsc}         mono />
              <InfoRow label="Branch"        value={vendor.bank_branch} />
              {!vendor.bank_account && (
                <div style={{ fontSize: 12, color: 'var(--c-text3)', fontStyle: 'italic', padding: '8px 0' }}>No banking info provided</div>
              )}

              <SectionTitle>Meta</SectionTitle>
              <InfoRow label="Added On"      value={fmt.date(vendor.created_at)} />
              <InfoRow label="Last Updated"  value={fmt.date(vendor.updated_at)} />
              <InfoRow label="Vendor ID"     value={vendor.vendor_id} mono />
            </div>
          </div>
        </div>

        {/* ── Right Tabs ── */}
        <div>
          {/* Tab Bar */}
          <div className="tabs" style={{ marginBottom: 0, overflowX: 'auto', flexWrap: 'nowrap' }}>
            {TABS.map(t => (
              <button key={t.id}
                className={`tab-btn${activeTab === t.id ? ' active' : ''}`}
                onClick={() => setActiveTab(t.id)}
                style={{ whiteSpace: 'nowrap' }}>
                {t.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="card" style={{ borderTopLeftRadius: 0 }}>
            {activeTab === 'overview'  && <OverviewTab vendorId={id} vendor={vendor} />}
            {activeTab === 'bills'     && <BillsTab vendorId={id} navigate={navigate} />}
            {activeTab === 'payments'  && <PaymentsTab vendorId={id} vendor={vendor} onRecordPayment={() => setPayOpen(true)} />}
            {activeTab === 'pos'       && <PurchaseOrdersTab vendorId={id} navigate={navigate} />}
            {activeTab === 'credits'   && <CreditMemosTab vendorId={id} navigate={navigate} />}
            {activeTab === 'statement' && <StatementTab vendorId={id} vendor={vendor} />}
            {activeTab === 'products'  && <ProductsTab vendorId={id} navigate={navigate} />}
            {activeTab === 'documents' && (
              <DocumentsTab
                vendorId={id}
                docs={docs}
                onAdd={() => setDocOpen(true)}
                onDelete={(docId) => confirmAction('Delete this document?', () => deleteDocMut.mutate(docId))}
              />
            )}
            {activeTab === 'notes' && <NotesTab vendor={vendor} onEdit={() => setEditOpen(true)} />}
          </div>
        </div>
      </div>

      {/* ── Modals ── */}
      {editOpen && (
        <Modal title="Edit Vendor" onClose={() => setEditOpen(false)} size="lg">
          <VendorForm
            initial={vendor}
            onSuccess={() => { setEditOpen(false); qc.invalidateQueries(['vendor', id]); qc.invalidateQueries(['vendor-summary', id]); toast.success('Vendor updated') }}
            onCancel={() => setEditOpen(false)}
          />
        </Modal>
      )}

      {docOpen && (
        <Modal title="Add Document" onClose={() => setDocOpen(false)}>
          <DocUploadModal
            vendorId={id}
            onSuccess={() => { setDocOpen(false); qc.invalidateQueries(['vendor', id]) }}
            onCancel={() => setDocOpen(false)}
          />
        </Modal>
      )}

      {payOpen && (
        <RecordVendorPaymentModal
          apInvoice={null}
          onClose={() => setPayOpen(false)}
          onSuccess={() => {
            qc.invalidateQueries(['vendor-payments-list', id])
            qc.invalidateQueries(['vendor-summary', id])
            qc.invalidateQueries(['vendor-bills', id])
          }}
        />
      )}
    </div>
  )
}
