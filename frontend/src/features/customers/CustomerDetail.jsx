import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft, Edit2, FileText, Phone, Mail, MapPin,
  TrendingUp, Clock, AlertCircle, CreditCard, Shield,
} from 'lucide-react'
import { customersApi } from '@/api'
import { fmt } from '@/lib/utils'
import { PageLoading, Badge } from '@/components/ui'
import { toast } from '@/store/toastStore'
import Modal from '@/components/Modal'
import CustomerForm from './CustomerForm'
import InvoicePreview from '../invoices/InvoicePreview'

import { S } from '../products/detail/DetailShared'

function InfoRow({ label, value, mono, last }) {
  if (!value) return null
  return (
    <div style={S.row(last)}>
      <span style={S.lbl}>{label}</span>
      <span style={{ ...S.val, fontFamily: mono ? 'monospace' : 'inherit' }}>{value}</span>
    </div>
  )
}

export default function CustomerDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [editOpen, setEditOpen] = useState(false)
  const [tab, setTab] = useState('invoices')
  const [previewId, setPreviewId] = useState(null)

  const { data, isLoading } = useQuery({
    queryKey: ['customer-detail', id],
    queryFn: () => customersApi.detail(id),
  })

  if (isLoading) return <PageLoading />
  if (!data) return <div style={{ padding: 24, color: 'var(--text-2)' }}>Customer not found.</div>

  const { customer: c, invoices = [], payments = [], warranty_claims = [] } = data

  const totalRevenue = invoices.filter((i) => i.status === 'paid').reduce((s, i) => s + Number(i.total || 0), 0)
  const outstanding = invoices.filter((i) => ['sent', 'overdue'].includes(i.status)).reduce((s, i) => s + Number(i.total || 0), 0)
  const overdueCount = invoices.filter((i) => i.status === 'overdue').length

  const stats = [
    { label: 'Total Revenue',  val: fmt.currency(totalRevenue), sub: 'Paid invoices',         color: '#10b981', bg: '#ecfdf5' },
    { label: 'Outstanding',    val: fmt.currency(outstanding),  sub: 'Sent & overdue',        color: outstanding > 0 ? '#f59e0b' : '#64748b', bg: outstanding > 0 ? '#fffbeb' : 'var(--bg-2)' },
    { label: 'Overdue',        val: overdueCount,               sub: overdueCount > 0 ? 'Needs attention' : 'All clear', color: overdueCount > 0 ? '#ef4444' : '#10b981', bg: overdueCount > 0 ? '#fef2f2' : '#ecfdf5' },
    { label: 'Total Invoices', val: invoices.length,            sub: 'All time',              color: '#6366f1', bg: '#eef2ff' },
  ]

  const tabs = [
    { id: 'invoices', label: `Invoices (${invoices.length})`,        icon: FileText },
    { id: 'payments', label: `Payments (${payments.length})`,        icon: CreditCard },
    { id: 'warranty', label: `Warranty (${warranty_claims.length})`, icon: Shield },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button className="topbar-icon-btn" onClick={() => navigate('/customers')} title="Back"><ArrowLeft size={17} /></button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ fontSize: 19, fontWeight: 700, margin: 0 }}>{c.name}</h1>
          <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 3 }}>
            {[c.city, c.state].filter(Boolean).join(', ')}
            {(c.city || c.state) && ' · '}Customer since {fmt.date(c.created_at)}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 7 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => setEditOpen(true)}><Edit2 size={13} /> Edit</button>
          <button className="btn btn-primary btn-sm" onClick={() => navigate(`/invoices/new?customer_id=${c.id}&customer_name=${encodeURIComponent(c.name)}`)}>
            <FileText size={13} /> New Invoice
          </button>
        </div>
      </div>

      {/* Stat tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
        {stats.map((k) => {
          const Icon = { 'Total Revenue': TrendingUp, 'Outstanding': Clock, 'Overdue': AlertCircle, 'Total Invoices': FileText }[k.label]
          return (
            <div key={k.label} style={{ background: k.bg, borderRadius: 12, padding: '14px 16px', border: `1px solid ${k.color}22` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 7 }}>
                {Icon && <Icon size={13} style={{ color: k.color }} />}
                <div style={{ fontSize: 11, fontWeight: 600, color: k.color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{k.label}</div>
              </div>
              <div style={{ fontSize: 21, fontWeight: 800, color: k.color, lineHeight: 1, marginBottom: 5 }}>{k.val}</div>
              <div style={{ fontSize: 11, color: '#64748b' }}>{k.sub}</div>
            </div>
          )
        })}
      </div>

      {/* Content grid: profile sidebar + tabbed content */}
      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 16, alignItems: 'start' }}>
        {/* Profile card */}
        <div style={S.card}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingBottom: 18, borderBottom: '1px solid var(--border)', marginBottom: 16 }}>
            <div style={{ width: 72, height: 72, borderRadius: 18, background: 'linear-gradient(135deg, var(--accent,#6366f1), #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 700, color: 'white', marginBottom: 12 }}>
              {fmt.initials(c.name)}
            </div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>{c.name}</div>
            {c.gstin && <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4, fontFamily: 'monospace' }}>{c.gstin}</div>}
          </div>

          <div style={{ marginBottom: 18 }}>
            <div style={S.title}>Contact</div>
            {c.email && (
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 9, fontSize: 13, color: 'var(--text-2)' }}>
                <Mail size={13} style={{ flexShrink: 0, color: 'var(--text-3)' }} />
                <a href={`mailto:${c.email}`} style={{ color: 'var(--accent,#6366f1)' }}>{c.email}</a>
              </div>
            )}
            {c.phone && (
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 9, fontSize: 13, color: 'var(--text-2)' }}>
                <Phone size={13} style={{ flexShrink: 0, color: 'var(--text-3)' }} />
                <span>{c.phone}</span>
              </div>
            )}
            {(c.address || c.city) && (
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 13, color: 'var(--text-2)' }}>
                <MapPin size={13} style={{ flexShrink: 0, marginTop: 2, color: 'var(--text-3)' }} />
                <span>{[c.address, c.city, c.state, c.pincode].filter(Boolean).join(', ')}</span>
              </div>
            )}
          </div>

          <div style={{ marginBottom: 18 }}>
            <div style={S.title}>Tax & Business</div>
            <InfoRow label="GSTIN" value={c.gstin} mono />
            <InfoRow label="PAN" value={c.pan} mono />
            <InfoRow label="Currency" value={c.currency} />
            <InfoRow label="Credit Limit" value={c.credit_limit > 0 ? fmt.currency(c.credit_limit) : null} last />
          </div>

          <div>
            <div style={S.title}>Financials</div>
            <div style={{ background: 'var(--bg-2)', borderRadius: 10, padding: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontSize: 12, color: 'var(--text-2)' }}>Outstanding</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: outstanding > 0 ? '#ef4444' : '#10b981' }}>{fmt.currency(outstanding)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12, color: 'var(--text-2)' }}>Lifetime Revenue</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#10b981' }}>{fmt.currency(totalRevenue)}</span>
              </div>
            </div>
          </div>

          {c.notes && (
            <div style={{ marginTop: 16 }}>
              <div style={S.title}>Notes</div>
              <div style={{ padding: 12, background: 'var(--bg-2)', borderRadius: 8, fontSize: 12, color: 'var(--text-2)', lineHeight: 1.6 }}>{c.notes}</div>
            </div>
          )}
        </div>

        {/* Tabbed content */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', gap: 2 }}>
              {tabs.map((t) => {
                const active = tab === t.id
                return (
                  <button key={t.id} onClick={() => setTab(t.id)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '9px 13px', fontSize: 12, fontWeight: active ? 700 : 500, color: active ? 'var(--accent,#6366f1)' : 'var(--text-2)', background: 'transparent', border: 'none', cursor: 'pointer', borderBottom: active ? '2px solid var(--accent,#6366f1)' : '2px solid transparent', marginBottom: -1, transition: 'all .15s' }}>
                    <t.icon size={12} />{t.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div style={S.card}>
            {/* Invoices */}
            {tab === 'invoices' && (
              invoices.length === 0 ? (
                <div style={S.empty}><FileText size={26} style={{ marginBottom: 8, opacity: 0.3 }} /><div style={{ fontWeight: 600, fontSize: 13 }}>No invoices yet</div></div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead><tr>{['Invoice #', 'Date', 'Due Date', 'Total', 'Status', 'Shipment'].map((h) => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
                  <tbody>
                    {invoices.map((inv, i) => (
                      <tr key={inv.id} style={{ borderBottom: '1px solid var(--border)', background: i % 2 ? 'var(--bg-2)' : 'transparent', cursor: 'pointer' }} onClick={() => setPreviewId(inv.id)}>
                        <td style={{ ...S.td, fontWeight: 600, color: 'var(--accent,#6366f1)' }}>{inv.number}</td>
                        <td style={{ ...S.td, color: 'var(--text-2)' }}>{fmt.date(inv.date)}</td>
                        <td style={{ ...S.td, color: 'var(--text-2)' }}>{fmt.date(inv.due_date)}</td>
                        <td style={{ ...S.td, fontWeight: 700 }}>{fmt.currency(inv.total)}</td>
                        <td style={S.td}><Badge status={inv.status} /></td>
                        <td style={S.td}>{inv.shipment_status ? <Badge status={inv.shipment_status} label={inv.shipment_status.replace('_', ' ')} /> : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            )}

            {/* Payments */}
            {tab === 'payments' && (
              payments.length === 0 ? (
                <div style={S.empty}><CreditCard size={26} style={{ marginBottom: 8, opacity: 0.3 }} /><div style={{ fontWeight: 600, fontSize: 13 }}>No payments yet</div></div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead><tr>{['Date', 'Amount', 'Method', 'Reference', 'Invoice'].map((h) => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
                  <tbody>
                    {payments.map((p, i) => (
                      <tr key={p.id} style={{ borderBottom: '1px solid var(--border)', background: i % 2 ? 'var(--bg-2)' : 'transparent' }}>
                        <td style={{ ...S.td, color: 'var(--text-2)' }}>{fmt.date(p.date)}</td>
                        <td style={{ ...S.td, fontWeight: 700, color: '#10b981' }}>{fmt.currency(p.amount)}</td>
                        <td style={{ ...S.td, textTransform: 'uppercase', fontSize: 11 }}>{p.method?.replace('_', ' ')}</td>
                        <td style={{ ...S.td, fontFamily: 'monospace', fontSize: 12, color: 'var(--text-2)' }}>{p.reference || '—'}</td>
                        <td style={{ ...S.td, color: 'var(--accent,#6366f1)', cursor: 'pointer' }} onClick={() => p.invoice_id && setPreviewId(p.invoice_id)}>
                          {invoices.find((iv) => iv.id === p.invoice_id)?.number || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            )}

            {/* Warranty */}
            {tab === 'warranty' && (
              warranty_claims.length === 0 ? (
                <div style={S.empty}><Shield size={26} style={{ marginBottom: 8, opacity: 0.3 }} /><div style={{ fontWeight: 600, fontSize: 13 }}>No warranty claims</div></div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead><tr>{['Product', 'Model', 'Issue', 'Invoice', 'Status', 'Date'].map((h) => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
                  <tbody>
                    {warranty_claims.map((w, i) => (
                      <tr key={w.id} style={{ borderBottom: '1px solid var(--border)', background: i % 2 ? 'var(--bg-2)' : 'transparent' }}>
                        <td style={{ ...S.td, fontWeight: 500 }}>{w.product_name}</td>
                        <td style={{ ...S.td, color: 'var(--text-2)', fontSize: 12 }}>{w.model_number || '—'}</td>
                        <td style={{ ...S.td, color: 'var(--text-2)', maxWidth: 220 }}>{w.issue_description}</td>
                        <td style={{ ...S.td, color: 'var(--accent,#6366f1)' }}>{w.invoice_number || '—'}</td>
                        <td style={S.td}><Badge status={w.status} /></td>
                        <td style={{ ...S.td, color: 'var(--text-2)' }}>{fmt.date(w.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            )}
          </div>
        </div>
      </div>

      {previewId && (
        <InvoicePreview invoiceId={previewId} onClose={() => setPreviewId(null)} />
      )}

      {editOpen && (
        <Modal title="Edit Customer" onClose={() => setEditOpen(false)} size="lg">
          <CustomerForm
            initial={c}
            onSuccess={() => { setEditOpen(false); qc.invalidateQueries(['customer-detail', id]); toast.success('Customer updated') }}
            onCancel={() => setEditOpen(false)}
          />
        </Modal>
      )}
    </div>
  )
}
