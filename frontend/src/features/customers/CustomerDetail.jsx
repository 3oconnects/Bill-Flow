import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft, Edit2, FileText, CreditCard, Shield,
  Phone, Mail, MapPin, Building2, Hash, Banknote, TrendingUp, Clock, AlertCircle,
} from 'lucide-react'
import { customersApi } from '@/api'
import { fmt } from '@/lib/utils'
import { PageLoading, Badge } from '@/components/ui'
import { toast } from '@/store/toastStore'
import Modal from '@/components/Modal'
import CustomerForm from './CustomerForm'

function StatCard({ label, value, icon: Icon, color }) {
  return (
    <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      <div style={{ width: 44, height: 44, borderRadius: 10, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={20} style={{ color }} />
      </div>
      <div>
        <div style={{ fontSize: 11, color: 'var(--text-2)', marginBottom: 4 }}>{label}</div>
        <div style={{ fontSize: 20, fontWeight: 700 }}>{value}</div>
      </div>
    </div>
  )
}

function InfoRow({ label, value }) {
  if (!value) return null
  return (
    <div style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
      <span style={{ fontSize: 12, color: 'var(--text-3)', width: 140, flexShrink: 0, fontWeight: 500 }}>{label}</span>
      <span style={{ fontSize: 13 }}>{value}</span>
    </div>
  )
}

export default function CustomerDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [editOpen, setEditOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('invoices')

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

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <button className="topbar-icon-btn" onClick={() => navigate('/customers')} title="Back">
          <ArrowLeft size={18} />
        </button>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>{c.name}</h1>
          <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 2 }}>
            {c.city && `${c.city}, `}{c.state} · Customer since {fmt.date(c.created_at)}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost" onClick={() => setEditOpen(true)}><Edit2 size={14} /> Edit</button>
          <button className="btn btn-primary" onClick={() => navigate(`/invoices/new?customer_id=${c.id}&customer_name=${encodeURIComponent(c.name)}`)}>
            <FileText size={14} /> New Invoice
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 24 }}>
        <StatCard label="Total Revenue" value={fmt.currency(totalRevenue)} icon={TrendingUp} color="var(--green)" />
        <StatCard label="Outstanding" value={fmt.currency(outstanding)} icon={Clock} color="var(--yellow)" />
        <StatCard label="Overdue" value={overdueCount} icon={AlertCircle} color="var(--red)" />
        <StatCard label="Total Invoices" value={invoices.length} icon={FileText} color="var(--accent)" />
      </div>

      {/* Content Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 16 }}>
        {/* Left: Profile Card */}
        <div>
          <div className="card">
            {/* Avatar */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingBottom: 20, borderBottom: '1px solid var(--border)', marginBottom: 16 }}>
              <div style={{ width: 72, height: 72, borderRadius: 18, background: 'linear-gradient(135deg, var(--accent), #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 700, color: 'white', marginBottom: 12 }}>
                {fmt.initials(c.name)}
              </div>
              <div style={{ fontSize: 16, fontWeight: 700 }}>{c.name}</div>
              {c.gstin && <div style={{ fontSize: 11, color: 'var(--text-2)', marginTop: 4, fontFamily: 'monospace' }}>{c.gstin}</div>}
            </div>

            {/* Contact */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Contact</div>
              {c.email && (
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 8, fontSize: 13, color: 'var(--text-2)' }}>
                  <Mail size={13} style={{ flexShrink: 0 }} />
                  <a href={`mailto:${c.email}`} style={{ color: 'var(--accent)' }}>{c.email}</a>
                </div>
              )}
              {c.phone && (
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 8, fontSize: 13, color: 'var(--text-2)' }}>
                  <Phone size={13} style={{ flexShrink: 0 }} />
                  <span>{c.phone}</span>
                </div>
              )}
              {(c.address || c.city) && (
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 13, color: 'var(--text-2)' }}>
                  <MapPin size={13} style={{ flexShrink: 0, marginTop: 2 }} />
                  <span>{[c.address, c.city, c.state, c.pincode].filter(Boolean).join(', ')}</span>
                </div>
              )}
            </div>

            {/* Tax Details */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Tax & Business</div>
              <InfoRow label="GSTIN" value={c.gstin} />
              <InfoRow label="PAN" value={c.pan} />
              <InfoRow label="Currency" value={c.currency} />
              <InfoRow label="Credit Limit" value={c.credit_limit > 0 ? fmt.currency(c.credit_limit) : null} />
            </div>

            {/* Financial */}
            <div>
              <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Financials</div>
              <div style={{ background: 'var(--bg-2)', borderRadius: 8, padding: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-2)' }}>Outstanding</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: outstanding > 0 ? 'var(--red)' : 'var(--green)' }}>{fmt.currency(outstanding)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 12, color: 'var(--text-2)' }}>Lifetime Revenue</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--green)' }}>{fmt.currency(totalRevenue)}</span>
                </div>
              </div>
            </div>

            {c.notes && (
              <div style={{ marginTop: 16, padding: 12, background: 'var(--bg-2)', borderRadius: 8, fontSize: 12, color: 'var(--text-2)', lineHeight: 1.6 }}>
                {c.notes}
              </div>
            )}
          </div>
        </div>

        {/* Right: Tabs */}
        <div>
          <div className="tabs">
            {[
              { id: 'invoices', label: `Invoices (${invoices.length})` },
              { id: 'payments', label: `Payments (${payments.length})` },
              { id: 'warranty', label: `Warranty (${warranty_claims.length})` },
            ].map((t) => (
              <button key={t.id} className={`tab-btn${activeTab === t.id ? ' active' : ''}`} onClick={() => setActiveTab(t.id)}>
                {t.label}
              </button>
            ))}
          </div>

          <div className="card">
            {/* Invoices Tab */}
            {activeTab === 'invoices' && (
              invoices.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-3)' }}>No invoices yet</div>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr><th>Invoice #</th><th>Date</th><th>Due Date</th><th>Total</th><th>Status</th><th></th></tr>
                    </thead>
                    <tbody>
                      {invoices.map((inv) => (
                        <tr key={inv.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/invoices/${inv.id}`)}>
                          <td style={{ fontWeight: 600, color: 'var(--accent)' }}>{inv.number}</td>
                          <td style={{ color: 'var(--text-2)' }}>{fmt.date(inv.date)}</td>
                          <td style={{ color: 'var(--text-2)' }}>{fmt.date(inv.due_date)}</td>
                          <td style={{ fontWeight: 700 }}>{fmt.currency(inv.total)}</td>
                          <td><Badge status={inv.status} /></td>
                          <td style={{ color: 'var(--text-2)', fontSize: 11 }}>
                            <Badge status={inv.shipment_status} label={inv.shipment_status?.replace('_', ' ')} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            )}

            {/* Payments Tab */}
            {activeTab === 'payments' && (
              payments.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-3)' }}>No payments yet</div>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr><th>Date</th><th>Amount</th><th>Method</th><th>Reference</th><th>Invoice</th></tr>
                    </thead>
                    <tbody>
                      {payments.map((p) => (
                        <tr key={p.id}>
                          <td style={{ color: 'var(--text-2)' }}>{fmt.date(p.date)}</td>
                          <td style={{ fontWeight: 700, color: 'var(--green)' }}>{fmt.currency(p.amount)}</td>
                          <td><span style={{ fontSize: 11, textTransform: 'uppercase' }}>{p.method?.replace('_', ' ')}</span></td>
                          <td style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--text-2)' }}>{p.reference || '—'}</td>
                          <td style={{ color: 'var(--accent)', cursor: 'pointer' }} onClick={() => p.invoice_id && navigate(`/invoices/${p.invoice_id}`)}>
                            {invoices.find((i) => i.id === p.invoice_id)?.number || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            )}

            {/* Warranty Tab */}
            {activeTab === 'warranty' && (
              warranty_claims.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-3)' }}>No warranty claims</div>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr><th>Product</th><th>Model</th><th>Issue</th><th>Invoice</th><th>Status</th><th>Date</th></tr>
                    </thead>
                    <tbody>
                      {warranty_claims.map((w) => (
                        <tr key={w.id}>
                          <td style={{ fontWeight: 500 }}>{w.product_name}</td>
                          <td style={{ color: 'var(--text-2)', fontSize: 12 }}>{w.model_number || '—'}</td>
                          <td style={{ color: 'var(--text-2)', maxWidth: 220 }}>{w.issue_description}</td>
                          <td style={{ color: 'var(--accent)' }}>{w.invoice_number || '—'}</td>
                          <td><Badge status={w.status} /></td>
                          <td style={{ color: 'var(--text-2)' }}>{fmt.date(w.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            )}
          </div>
        </div>
      </div>

      {/* Edit Modal */}
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
